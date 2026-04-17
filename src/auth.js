import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { getProfile, upsertProfile } from './store.js';
import { startUsageConnector } from './usage-connector.js';

const sessions = new Map();
const FILE_CREDENTIALS_OVERRIDE = 'cli_auth_credentials_store="file"';

function stripAnsi(text) {
  return String(text || '').replace(/\u001B\[[0-9;]*m/g, '');
}

function getCodexPaths(profile) {
  const codexDir = profile.codexDir || path.join(profile.homeDir, '.codex');
  return {
    codexDir,
    authPath: path.join(codexDir, 'auth.json'),
    loginLogPath: path.join(codexDir, 'log', 'codex-login.log')
  };
}

function buildEnv(profile, extraEnv = {}) {
  const { codexDir } = getCodexPaths(profile);
  return {
    ...process.env,
    ...extraEnv,
    HOME: profile.homeDir,
    USERPROFILE: profile.homeDir,
    XDG_CONFIG_HOME: path.join(profile.homeDir, '.config'),
    XDG_DATA_HOME: path.join(profile.homeDir, '.local', 'share'),
    XDG_STATE_HOME: path.join(profile.homeDir, '.local', 'state'),
    CODEX_HOME: codexDir
  };
}

function ensureProfileDirs(profile) {
  const { codexDir, loginLogPath } = getCodexPaths(profile);
  fs.mkdirSync(profile.homeDir, { recursive: true });
  fs.mkdirSync(codexDir, { recursive: true });
  fs.mkdirSync(path.dirname(loginLogPath), { recursive: true });
}

function spawnCodex(profile, args, options = {}) {
  ensureProfileDirs(profile);
  const { env: extraEnv, ...restOptions } = options;
  return spawn('codex', ['-c', FILE_CREDENTIALS_OVERRIDE, ...args], {
    ...restOptions,
    env: buildEnv(profile, extraEnv),
    stdio: ['pipe', 'pipe', 'pipe'],
  });
}

function runCodex(profile, args, { input = '', timeoutMs = 15000 } = {}) {
  return new Promise((resolve) => {
    const proc = spawnCodex(profile, args);
    let stdout = '';
    let stderr = '';
    let finished = false;

    const finish = (result) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      resolve({
        stdout: stripAnsi(stdout).trim(),
        stderr: stripAnsi(stderr).trim(),
        ...result
      });
    };

    const timer = setTimeout(() => {
      proc.kill('SIGTERM');
      finish({
        ok: false,
        exitCode: null,
        signal: 'SIGTERM',
        timedOut: true,
        error: 'Command timed out'
      });
    }, timeoutMs);

    proc.stdout.on('data', (chunk) => {
      stdout += chunk.toString('utf8');
    });

    proc.stderr.on('data', (chunk) => {
      stderr += chunk.toString('utf8');
    });

    proc.on('error', (error) => {
      finish({
        ok: false,
        exitCode: null,
        signal: null,
        timedOut: false,
        error: error.message
      });
    });

    proc.on('exit', (code, signal) => {
      finish({
        ok: code === 0,
        exitCode: code,
        signal: signal || null,
        timedOut: false,
        error: signal ? `signal ${signal}` : null
      });
    });

    if (input) {
      proc.stdin.write(input);
    }
    proc.stdin.end();
  });
}

function parseLoginHints(text) {
  const clean = stripAnsi(text);
  return {
    browserUrl: clean.match(/https:\/\/auth\.openai\.com\/oauth\/authorize[^\s]+/)?.[0] ?? null,
    verificationUrl: clean.match(/https:\/\/auth\.openai\.com\/codex\/device/)?.[0] ?? null,
    userCode: clean.match(/\b[A-Z0-9]{4,6}-[A-Z0-9]{4,8}\b/)?.[0] ?? null
  };
}

function decodeJwtClaims(token) {
  if (!token) {
    return null;
  }

  try {
    return JSON.parse(Buffer.from(String(token).split('.')[1], 'base64url').toString('utf8'));
  } catch {
    return null;
  }
}

function mapPlanTypeToPlanId(planType) {
  switch (String(planType || '').toLowerCase()) {
    case 'plus':
      return 'plus';
    case 'team':
    case 'business':
      return 'business';
    case 'enterprise':
    case 'edu':
    case 'enterprise_edu':
      return 'enterprise_edu';
    case 'api':
      return 'api';
    default:
      return 'custom';
  }
}

function derivePlanLabel(planType) {
  switch (String(planType || '').toLowerCase()) {
    case 'plus':
      return 'ChatGPT Plus';
    case 'team':
    case 'business':
      return 'ChatGPT Business';
    case 'pro':
      return 'ChatGPT Pro';
    case 'enterprise':
      return 'Enterprise';
    case 'edu':
      return 'Edu';
    case 'api':
      return 'API key';
    default:
      return planType ? String(planType) : '';
  }
}

function enrichProfileFromAuth(profile) {
  const { authPath } = getCodexPaths(profile);
  if (!fs.existsSync(authPath)) {
    return profile;
  }

  const authState = JSON.parse(fs.readFileSync(authPath, 'utf8'));
  const idClaims = decodeJwtClaims(authState?.tokens?.id_token);
  const accessClaims = decodeJwtClaims(authState?.tokens?.access_token);
  const authClaims = idClaims?.['https://api.openai.com/auth'] || accessClaims?.['https://api.openai.com/auth'] || {};
  const profileClaims = accessClaims?.['https://api.openai.com/profile'] || {};

  const email = idClaims?.email || profileClaims.email || profile.emailHint || '';
  const name = idClaims?.name || (email ? email.split('@')[0] : profile.name);
  const planType = authClaims.chatgpt_plan_type || '';
  const externalAccountId = authState?.tokens?.account_id || authClaims.chatgpt_account_id || profile.externalAccountId;
  const externalUserId = authClaims.chatgpt_user_id || authClaims.user_id || profile.externalUserId;

  return upsertProfile({
    id: profile.id,
    name,
    emailHint: email,
    planId: mapPlanTypeToPlanId(planType),
    planLabelOverride: derivePlanLabel(planType),
    authKind: 'chatgpt-browser',
    externalAccountId,
    externalUserId
  });
}

async function finalizeSuccessfulLogin(accountId) {
  const profile = getProfile(accountId);
  if (!profile) {
    return;
  }

  const enriched = enrichProfileFromAuth(profile);
  await startUsageConnector(enriched);
}

function publicSession(session) {
  return {
    accountId: session.accountId,
    mode: session.mode,
    pid: session.pid,
    status: session.status,
    startedAt: session.startedAt,
    endedAt: session.endedAt,
    browserUrl: session.browserUrl,
    verificationUrl: session.verificationUrl,
    userCode: session.userCode,
    exitCode: session.exitCode,
    error: session.error,
    stdout: stripAnsi(session.stdout),
    stderr: stripAnsi(session.stderr)
  };
}

function startLogin(profile, mode) {
  const existing = sessions.get(profile.id);
  if (existing && existing.status === 'running') {
    return publicSession(existing);
  }

  const args = ['login'];
  if (mode === 'device' || mode === 'browser') {
    args.push('--device-auth');
  }

  const proc = spawnCodex(profile, args, {
    env: mode === 'browser' ? { BROWSER: 'echo' } : undefined
  });
  const session = {
    accountId: profile.id,
    mode,
    pid: proc.pid,
    status: 'running',
    startedAt: new Date().toISOString(),
    endedAt: null,
    browserUrl: null,
    verificationUrl: null,
    userCode: null,
    exitCode: null,
    error: null,
    stdout: '',
    stderr: '',
    proc
  };

  const ingest = (chunk, field) => {
    session[field] += chunk.toString('utf8');
    const parsed = parseLoginHints(`${session.stdout}\n${session.stderr}`);
    session.browserUrl = parsed.browserUrl;
    session.verificationUrl = parsed.verificationUrl;
    session.userCode = parsed.userCode;
  };

  proc.stdout.on('data', (chunk) => ingest(chunk, 'stdout'));
  proc.stderr.on('data', (chunk) => ingest(chunk, 'stderr'));

  proc.on('error', (error) => {
    session.status = 'failed';
    session.error = error.message;
    session.endedAt = new Date().toISOString();
  });

  proc.on('exit', (code, signal) => {
    session.status = code === 0 ? 'completed' : (signal ? 'killed' : 'failed');
    session.exitCode = code;
    session.error = signal ? `signal ${signal}` : session.error;
    session.endedAt = new Date().toISOString();

    if (code === 0) {
      void finalizeSuccessfulLogin(profile.id).catch((error) => {
        session.error = error.message;
      });
    }
  });

  sessions.set(profile.id, session);
  return publicSession(session);
}

export function startBrowserLogin(profile) {
  return startLogin(profile, 'browser');
}

export function startDeviceLogin(profile) {
  return startLogin(profile, 'device');
}

export function getLoginSession(accountId) {
  return sessions.get(accountId) ? publicSession(sessions.get(accountId)) : null;
}

export function cancelLogin(accountId) {
  const session = sessions.get(accountId);
  if (!session?.proc || session.status !== 'running') {
    return false;
  }
  session.proc.kill('SIGTERM');
  return true;
}

export async function codexLoginStatus(profile) {
  const result = await runCodex(profile, ['login', 'status']);
  return {
    ok: result.ok,
    exitCode: result.exitCode,
    stdout: result.stdout,
    stderr: result.stderr,
    signal: result.signal,
    timedOut: result.timedOut,
    error: result.error,
    summary: result.stdout || result.stderr || (result.ok ? 'Logged in' : 'Not logged in')
  };
}

export async function codexLogout(profile) {
  return runCodex(profile, ['logout'], { input: '\n' });
}

export function inspectAuthCache(profile) {
  const { codexDir, authPath, loginLogPath } = getCodexPaths(profile);
  const authExists = fs.existsSync(authPath);
  const logExists = fs.existsSync(loginLogPath);

  return {
    storage: 'file',
    codexDir,
    authPath,
    exists: authExists,
    updatedAt: authExists ? fs.statSync(authPath).mtime.toISOString() : null,
    loginLogPath,
    loginLogExists: logExists,
    loginLogUpdatedAt: logExists ? fs.statSync(loginLogPath).mtime.toISOString() : null
  };
}
