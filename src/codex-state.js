import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

function exists(filePath) {
  try {
    fs.accessSync(filePath, fs.constants.R_OK);
    return true;
  } catch {
    return false;
  }
}

export function scanCodexStateDirs(homeDir = os.homedir()) {
  const entries = fs.readdirSync(homeDir, { withFileTypes: true });
  const dirs = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (!entry.name.startsWith('.codex')) continue;
    const fullPath = path.join(homeDir, entry.name);
    const stateDbPath = path.join(fullPath, 'state_5.sqlite');
    const logsDbPath = path.join(fullPath, 'logs_2.sqlite');
    if (exists(stateDbPath) || exists(logsDbPath)) {
      dirs.push({
        id: fullPath,
        name: entry.name,
        path: fullPath,
        stateDbPath,
        logsDbPath,
        hasStateDb: exists(stateDbPath),
        hasLogsDb: exists(logsDbPath)
      });
    }
  }
  return dirs.sort((a, b) => a.name.localeCompare(b.name));
}

function openReadOnly(dbPath) {
  return new DatabaseSync(dbPath, { open: true, readOnly: true });
}

function normalizeTimestamp(value) {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  if (typeof value === 'number') {
    const ms = value < 1_000_000_000_000 ? value * 1000 : value;
    return new Date(ms).toISOString();
  }

  if (/^\d+$/.test(String(value))) {
    const numeric = Number(value);
    const ms = numeric < 1_000_000_000_000 ? numeric * 1000 : numeric;
    return new Date(ms).toISOString();
  }

  return String(value);
}

export function inspectCodexStateDir(dirPath) {
  if (!dirPath) {
    return {
      ok: false,
      reason: 'No state directory linked'
    };
  }

  const stateDbPath = path.join(dirPath, 'state_5.sqlite');
  const logsDbPath = path.join(dirPath, 'logs_2.sqlite');

  if (!exists(stateDbPath)) {
    return {
      ok: false,
      reason: 'state_5.sqlite not found',
      dirPath,
      stateDbPath,
      logsDbPath,
      hasLogsDb: exists(logsDbPath)
    };
  }

  const summary = {
    ok: true,
    dirPath,
    stateDbPath,
    logsDbPath,
    hasLogsDb: exists(logsDbPath),
    threadCount: 0,
    activeThreadCount: 0,
    archivedThreadCount: 0,
    totalTokensUsed: 0,
    lastUpdatedAt: null,
    latestModels: [],
    latestProviders: [],
    latestCwds: []
  };

  try {
    const db = openReadOnly(stateDbPath);
    const threadColumns = new Set(
      db.prepare('PRAGMA table_info(threads)').all().map((column) => column.name)
    );

    const totals = db.prepare(`
      SELECT
        COUNT(*) AS threadCount,
        COALESCE(SUM(CASE WHEN archived = 0 THEN 1 ELSE 0 END), 0) AS activeThreadCount,
        COALESCE(SUM(CASE WHEN archived = 1 THEN 1 ELSE 0 END), 0) AS archivedThreadCount,
        COALESCE(SUM(tokens_used), 0) AS totalTokensUsed,
        MAX(updated_at) AS lastUpdatedAt
      FROM threads
    `).get();

    Object.assign(summary, totals);
    summary.lastUpdatedAt = normalizeTimestamp(summary.lastUpdatedAt);

    if (threadColumns.has('model')) {
      summary.latestModels = db.prepare(`
        SELECT COALESCE(model, '(unknown)') AS value, COUNT(*) AS count
        FROM threads
        GROUP BY COALESCE(model, '(unknown)')
        ORDER BY count DESC, value ASC
        LIMIT 5
      `).all();
    }

    if (threadColumns.has('model_provider')) {
      summary.latestProviders = db.prepare(`
        SELECT COALESCE(model_provider, '(unknown)') AS value, COUNT(*) AS count
        FROM threads
        GROUP BY COALESCE(model_provider, '(unknown)')
        ORDER BY count DESC, value ASC
        LIMIT 5
      `).all();
    }

    if (threadColumns.has('cwd')) {
      summary.latestCwds = db.prepare(`
        SELECT COALESCE(cwd, '(unknown)') AS value, COUNT(*) AS count
        FROM threads
        GROUP BY COALESCE(cwd, '(unknown)')
        ORDER BY count DESC, value ASC
        LIMIT 5
      `).all();
    }

    db.close();
  } catch (error) {
    return {
      ok: false,
      dirPath,
      stateDbPath,
      logsDbPath,
      hasLogsDb: exists(logsDbPath),
      reason: error.message
    };
  }

  return summary;
}
