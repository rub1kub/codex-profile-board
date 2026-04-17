import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  cancelLogin,
  codexLoginStatus,
  codexLogout,
  getLoginSession,
  inspectAuthCache,
  startBrowserLogin,
  startDeviceLogin
} from './auth.js';
import { inspectCodexStateDir } from './codex-state.js';
import { getPlanPreset, listPlanPresets } from './plans.js';
import {
  createPendingProfile,
  getProfile,
  getProfilesDir,
  getStorePath,
  loadStore,
  renameProfile,
  reorderProfiles,
  removeProfile,
  upsertProfile
} from './store.js';
import {
  getUsageConnector,
  primeUsageConnector,
  refreshUsageConnector,
  startUsageConnector,
  stopUsageConnector
} from './usage-connector.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.resolve(__dirname, '../public');
const DEFAULT_PORT = Number(process.env.PORT || 43123);
const runtimeCache = new Map();

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, { 'content-type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(payload));
}

function sendText(res, statusCode, text, contentType = 'text/plain; charset=utf-8') {
  res.writeHead(statusCode, { 'content-type': contentType });
  res.end(text);
}

function readRequestBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => {
      if (!chunks.length) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));
      } catch (error) {
        reject(error);
      }
    });
    req.on('error', reject);
  });
}

function getRuntime(profileId) {
  if (!runtimeCache.has(profileId)) {
    runtimeCache.set(profileId, {
      loginStatus: null,
      codexState: null,
      refreshedAt: null,
      error: null,
      pending: null
    });
  }

  return runtimeCache.get(profileId);
}

function defaultLoginStatus() {
  return {
    ok: false,
    exitCode: null,
    stdout: '',
    stderr: '',
    signal: null,
    timedOut: false,
    error: null,
    summary: 'Status has not been checked yet.'
  };
}

function defaultCodexState(profile) {
  return {
    ok: false,
    dirPath: profile.codexDir,
    reason: 'Local state snapshot has not been loaded yet.'
  };
}

async function refreshProfileRuntime(profileId) {
  const profile = getProfile(profileId);
  if (!profile) {
    return null;
  }

  const runtime = getRuntime(profileId);
  if (runtime.pending) {
    return runtime.pending;
  }

  runtime.pending = (async () => {
    const [loginStatus, codexState] = await Promise.all([
      codexLoginStatus(profile).catch((error) => ({
        ...defaultLoginStatus(),
        summary: error.message,
        error: error.message
      })),
      Promise.resolve(inspectCodexStateDir(profile.codexDir))
    ]);

    runtime.loginStatus = loginStatus;
    runtime.codexState = codexState;
    runtime.refreshedAt = new Date().toISOString();
    runtime.error = null;
    return runtime;
  })().catch((error) => {
    runtime.error = error.message;
    runtime.refreshedAt = new Date().toISOString();
    return runtime;
  }).finally(() => {
    runtime.pending = null;
  });

  return runtime.pending;
}

function scheduleRefresh(profile, maxAgeMs = 30000) {
  const runtime = getRuntime(profile.id);
  if (runtime.pending) {
    return;
  }

  if (!runtime.refreshedAt || (Date.now() - Date.parse(runtime.refreshedAt)) > maxAgeMs) {
    refreshProfileRuntime(profile.id).catch(() => {});
  }
}

function deriveLimits(profile, plan) {
  const total = Number(profile?.manualLimits?.workspaceCreditsTotal || 0);
  const remaining = Number(profile?.manualLimits?.workspaceCreditsRemaining || 0);
  const monthlyBudgetUsd = Number(profile?.manualLimits?.monthlyBudgetUsd || 0);
  const usedThisMonthUsd = Number(profile?.manualLimits?.usedThisMonthUsd || 0);

  return {
    workspaceCreditsRemaining: profile?.manualLimits?.workspaceCreditsRemaining ?? '',
    workspaceCreditsTotal: profile?.manualLimits?.workspaceCreditsTotal ?? '',
    monthlyBudgetUsd: profile?.manualLimits?.monthlyBudgetUsd ?? '',
    usedThisMonthUsd: profile?.manualLimits?.usedThisMonthUsd ?? '',
    derivedWorkspaceUsed: total > 0 ? Math.max(total - remaining, 0) : null,
    derivedMonthlyRemainingUsd: monthlyBudgetUsd > 0 ? Math.max(monthlyBudgetUsd - usedThisMonthUsd, 0) : null,
    usageWindow: plan.limits.usageWindow,
    docsReferenceUrl: plan.referenceUrl,
    usageDashboardUrl: plan.usageDashboardUrl
  };
}

async function serializeProfile(profile) {
  scheduleRefresh(profile);
  const runtime = getRuntime(profile.id);
  const plan = getPlanPreset(profile.planId);
  const authCache = inspectAuthCache(profile);
  if (authCache.exists) {
    const usageState = getUsageConnector(profile.id);
    const needsInitialUsage = !usageState || (
      !usageState.lastFetchedAt &&
      usageState.status !== 'loading'
    );

    if (needsInitialUsage) {
      await startUsageConnector(profile).catch(() => {});
    } else {
      primeUsageConnector(profile);
    }
  }

  return {
    ...profile,
    plan,
    loginStatus: runtime.loginStatus ?? defaultLoginStatus(),
    loginSession: getLoginSession(profile.id),
    usageConnector: getUsageConnector(profile.id),
    codexState: runtime.codexState ?? defaultCodexState(profile),
    authCache,
    limits: deriveLimits(profile, plan),
    diagnostics: {
      refreshedAt: runtime.refreshedAt,
      refreshInFlight: Boolean(runtime.pending),
      error: runtime.error
    }
  };
}

async function buildState() {
  const store = loadStore();
  return {
    generatedAt: new Date().toISOString(),
    storePath: getStorePath(),
    profilesDir: getProfilesDir(),
    plans: listPlanPresets(),
    profiles: await Promise.all(store.profiles.map(serializeProfile))
  };
}

function serveStatic(req, res) {
  const pathname = new URL(req.url, 'http://localhost').pathname;
  const relativePath = pathname === '/' ? 'index.html' : pathname.slice(1);
  const filePath = path.resolve(publicDir, relativePath);
  if (!filePath.startsWith(publicDir)) {
    sendText(res, 403, 'Forbidden');
    return true;
  }

  if (!fs.existsSync(filePath)) {
    return false;
  }

  const ext = path.extname(filePath);
  const types = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8'
  };

  sendText(res, 200, fs.readFileSync(filePath), types[ext] || 'application/octet-stream');
  return true;
}

function notFound(res) {
  sendJson(res, 404, { error: 'Not found' });
}

async function resolveProfile(id, res) {
  const profile = getProfile(id);
  if (!profile) {
    sendJson(res, 404, { error: 'profile not found' });
    return null;
  }
  return profile;
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');

  if (req.method === 'GET' && url.pathname === '/api/state') {
    sendJson(res, 200, await buildState());
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/connect/browser') {
    const profile = createPendingProfile();
    runtimeCache.delete(profile.id);
    sendJson(res, 200, {
      profile: await serializeProfile(profile),
      session: null
    });
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/profiles') {
    const body = await readRequestBody(req).catch((error) => {
      sendJson(res, 400, { error: error.message });
      return null;
    });
    if (body === null) return;

    if (!body.name?.trim()) {
      sendJson(res, 400, { error: 'name is required' });
      return;
    }

    const saved = upsertProfile(body);
    runtimeCache.delete(saved.id);
    await refreshProfileRuntime(saved.id);
    sendJson(res, 200, { profile: await serializeProfile(saved) });
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/profiles/reorder') {
    const body = await readRequestBody(req).catch((error) => {
      sendJson(res, 400, { error: error.message });
      return null;
    });
    if (body === null) return;

    if (!Array.isArray(body.ids)) {
      sendJson(res, 400, { error: 'ids must be an array' });
      return;
    }

    reorderProfiles(body.ids);
    sendJson(res, 200, { ok: true });
    return;
  }

  if (req.method === 'PATCH' && url.pathname.match(/^\/api\/profiles\/[^/]+$/)) {
    const id = decodeURIComponent(url.pathname.split('/')[3]);
    const body = await readRequestBody(req).catch((error) => {
      sendJson(res, 400, { error: error.message });
      return null;
    });
    if (body === null) return;

    try {
      const saved = renameProfile(id, body.name);
      sendJson(res, 200, { profile: await serializeProfile(saved) });
    } catch (error) {
      sendJson(res, 400, { error: error.message });
    }
    return;
  }

  if (req.method === 'DELETE' && url.pathname.startsWith('/api/profiles/')) {
    const id = decodeURIComponent(url.pathname.replace('/api/profiles/', ''));
    const removed = removeProfile(id);
    runtimeCache.delete(id);
    await stopUsageConnector(id);
    sendJson(res, 200, {
      removed: Boolean(removed),
      profile: removed,
      note: removed ? 'Profile removed from the board. Local files were left on disk.' : null
    });
    return;
  }

  if (req.method === 'POST' && url.pathname.match(/^\/api\/profiles\/[^/]+\/refresh$/)) {
    const id = decodeURIComponent(url.pathname.split('/')[3]);
    const profile = await resolveProfile(id, res);
    if (!profile) return;
    await refreshProfileRuntime(id);
    sendJson(res, 200, { profile: await serializeProfile(profile) });
    return;
  }

  if (req.method === 'POST' && url.pathname.match(/^\/api\/profiles\/[^/]+\/login\/browser$/)) {
    const id = decodeURIComponent(url.pathname.split('/')[3]);
    const profile = await resolveProfile(id, res);
    if (!profile) return;
    sendJson(res, 200, { session: startBrowserLogin(profile) });
    return;
  }

  if (req.method === 'POST' && url.pathname.match(/^\/api\/profiles\/[^/]+\/login\/device$/)) {
    const id = decodeURIComponent(url.pathname.split('/')[3]);
    const profile = await resolveProfile(id, res);
    if (!profile) return;
    sendJson(res, 200, { session: startDeviceLogin(profile) });
    return;
  }

  if (req.method === 'POST' && url.pathname.match(/^\/api\/profiles\/[^/]+\/login\/cancel$/)) {
    const id = decodeURIComponent(url.pathname.split('/')[3]);
    sendJson(res, 200, { canceled: cancelLogin(id) });
    return;
  }

  if (req.method === 'GET' && url.pathname.match(/^\/api\/profiles\/[^/]+\/login-session$/)) {
    const id = decodeURIComponent(url.pathname.split('/')[3]);
    sendJson(res, 200, { session: getLoginSession(id) });
    return;
  }

  if (req.method === 'POST' && url.pathname.match(/^\/api\/profiles\/[^/]+\/logout$/)) {
    const id = decodeURIComponent(url.pathname.split('/')[3]);
    const profile = await resolveProfile(id, res);
    if (!profile) return;
    const result = await codexLogout(profile);
    await stopUsageConnector(id);
    await refreshProfileRuntime(id);
    sendJson(res, 200, { result, profile: await serializeProfile(profile) });
    return;
  }

  if (req.method === 'POST' && url.pathname.match(/^\/api\/profiles\/[^/]+\/usage\/open$/)) {
    const id = decodeURIComponent(url.pathname.split('/')[3]);
    const profile = await resolveProfile(id, res);
    if (!profile) return;

    try {
      const session = await startUsageConnector(profile);
      sendJson(res, 200, { session });
    } catch (error) {
      sendJson(res, 500, { error: error.message });
    }
    return;
  }

  if (req.method === 'POST' && url.pathname.match(/^\/api\/profiles\/[^/]+\/usage\/refresh$/)) {
    const id = decodeURIComponent(url.pathname.split('/')[3]);
    const session = await refreshUsageConnector(id);
    sendJson(res, 200, { session });
    return;
  }

  if (req.method === 'POST' && url.pathname.match(/^\/api\/profiles\/[^/]+\/usage\/stop$/)) {
    const id = decodeURIComponent(url.pathname.split('/')[3]);
    const stopped = await stopUsageConnector(id);
    sendJson(res, 200, { stopped });
    return;
  }

  if (serveStatic(req, res)) {
    return;
  }

  notFound(res);
});

server.listen(DEFAULT_PORT, '127.0.0.1', () => {
  console.log(`Codex Profile Board running at http://127.0.0.1:${DEFAULT_PORT}`);
});
