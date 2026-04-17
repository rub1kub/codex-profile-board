import fs from 'node:fs';
import path from 'node:path';
import { getProfile } from './store.js';

const sessions = new Map();
const USAGE_URL = 'https://chatgpt.com/backend-api/wham/usage';
const TOKEN_EXPIRED_STATUSES = new Set([401, 403]);
const RESET_DATE_FORMAT = new Intl.DateTimeFormat('ru-RU', {
  day: 'numeric',
  month: 'long',
  hour: '2-digit',
  minute: '2-digit'
});
const WEEKLY_RESET_GAP_SECONDS = 3 * 24 * 60 * 60;

function clampPercent(value) {
  const number = Number(value ?? 0);
  if (!Number.isFinite(number)) {
    return 0;
  }
  return Math.max(0, Math.min(100, Number(number.toFixed(1))));
}

function formatResetAt(timestampMs) {
  if (!timestampMs) {
    return 'Нет данных';
  }
  return RESET_DATE_FORMAT.format(new Date(timestampMs));
}

function formatRemaining(usedPercent) {
  const remainingPercent = clampPercent(100 - usedPercent);
  return {
    remainingPercent,
    remainingText: `${remainingPercent} % осталось`
  };
}

function windowLabelFromHours(hours) {
  if (hours >= 168) {
    return 'Неделя';
  }
  if (hours >= 24) {
    return hours === 24 ? 'День' : `${hours} часов`;
  }
  if (hours === 5) {
    return '5 часов';
  }
  if (hours === 1) {
    return '1 час';
  }
  return `${hours} часа`;
}

function resolveSecondaryWindowLabel(windowSeconds, secondaryResetAt, primaryResetAt) {
  const windowHours = Math.round((windowSeconds || 86400) / 3600);
  if (windowHours >= 168) {
    return 'Неделя';
  }
  if (
    typeof secondaryResetAt === 'number' &&
    typeof primaryResetAt === 'number' &&
    (secondaryResetAt - primaryResetAt) >= WEEKLY_RESET_GAP_SECONDS
  ) {
    return 'Неделя';
  }
  return windowLabelFromHours(windowHours);
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

function getAuthPath(profile) {
  return path.join(profile.codexDir || path.join(profile.homeDir, '.codex'), 'auth.json');
}

function readAuthState(profile) {
  const authPath = getAuthPath(profile);
  if (!fs.existsSync(authPath)) {
    return null;
  }

  return JSON.parse(fs.readFileSync(authPath, 'utf8'));
}

function buildUsageHeaders(authState) {
  const accessToken = authState?.tokens?.access_token;
  const accountId = authState?.tokens?.account_id;
  if (!accessToken) {
    return null;
  }

  const headers = {
    Authorization: `Bearer ${accessToken}`,
    Accept: 'application/json',
    'User-Agent': 'Codex Profile Board'
  };

  if (accountId) {
    headers['ChatGPT-Account-Id'] = accountId;
  }

  return headers;
}

function createWindowSnapshot(label, windowState) {
  if (!windowState) {
    return null;
  }

  const usedPercent = clampPercent(windowState.used_percent);
  const { remainingPercent, remainingText } = formatRemaining(usedPercent);
  const resetAt = windowState.reset_at ? windowState.reset_at * 1000 : null;

  return {
    label,
    usedPercent,
    remainingPercent,
    remainingText,
    limitWindowSeconds: windowState.limit_window_seconds ?? null,
    resetAt,
    resetLabel: formatResetAt(resetAt)
  };
}

function normalizeUsageResponse(data) {
  const primaryState = data?.rate_limit?.primary_window ?? null;
  const secondaryState = data?.rate_limit?.secondary_window ?? null;
  const primaryHours = Math.round((primaryState?.limit_window_seconds || 18000) / 3600);
  const primaryLabel = windowLabelFromHours(primaryHours);
  const secondaryLabel = secondaryState
    ? resolveSecondaryWindowLabel(
      secondaryState.limit_window_seconds,
      secondaryState.reset_at,
      primaryState?.reset_at
    )
    : null;

  const primaryWindow = createWindowSnapshot(primaryLabel, primaryState);
  const secondaryWindow = createWindowSnapshot(secondaryLabel, secondaryState);
  const resetSummary = secondaryWindow?.resetLabel || primaryWindow?.resetLabel || 'Нет данных';

  return {
    accountId: data?.account_id || '',
    email: data?.email || '',
    planType: data?.plan_type || '',
    primaryWindow,
    secondaryWindow,
    resetSummary,
    creditsBalance: data?.credits?.balance ?? null,
    raw: data
  };
}

function buildLegacyMetrics(usage) {
  return {
    rollingWindowRemaining: usage.primaryWindow?.remainingText || null,
    rollingWindowRemainingPercent: usage.primaryWindow?.remainingPercent ?? null,
    rollingWindowLabel: usage.primaryWindow?.label || '5 часов',
    weeklyRemaining: usage.secondaryWindow?.remainingText || null,
    weeklyRemainingPercent: usage.secondaryWindow?.remainingPercent ?? null,
    weeklyLabel: usage.secondaryWindow?.label || 'Неделя',
    weeklyReset: usage.secondaryWindow?.resetLabel || null,
    remainingSummary: usage.primaryWindow?.remainingText || usage.secondaryWindow?.remainingText || null,
    resetSummary: usage.resetSummary,
    planSummary: usage.planType || null
  };
}

async function fetchUsage(profile) {
  const authState = readAuthState(profile);
  const headers = buildUsageHeaders(authState);
  if (!headers) {
    const error = new Error('Нужен вход в Codex');
    error.code = 'AUTH_REQUIRED';
    throw error;
  }

  const response = await fetch(USAGE_URL, {
    method: 'GET',
    headers
  });

  if (!response.ok) {
    const error = new Error(
      TOKEN_EXPIRED_STATUSES.has(response.status)
        ? 'Нужен повторный вход в Codex'
        : `HTTP ${response.status}`
    );
    error.code = TOKEN_EXPIRED_STATUSES.has(response.status) ? 'AUTH_REQUIRED' : 'HTTP_ERROR';
    error.status = response.status;
    throw error;
  }

  const json = await response.json();
  return normalizeUsageResponse(json);
}

function ensureSession(accountId) {
  if (!sessions.has(accountId)) {
    sessions.set(accountId, {
      accountId,
      status: 'idle',
      mode: 'oauth_api',
      startedAt: new Date().toISOString(),
      lastFetchedAt: null,
      lastScrape: null,
      usage: null,
      error: null,
      pending: null
    });
  }

  return sessions.get(accountId);
}

async function refreshSession(profile, session) {
  session.status = 'loading';

  try {
    const usage = await fetchUsage(profile);
    const metrics = buildLegacyMetrics(usage);

    session.usage = usage;
    session.lastFetchedAt = new Date().toISOString();
    session.lastScrape = {
      scrapedAt: session.lastFetchedAt,
      metrics,
      raw: usage.raw
    };
    session.error = null;
    session.status = 'ready';
  } catch (error) {
    session.error = error.message;
    session.lastFetchedAt = new Date().toISOString();
    session.status = error.code === 'AUTH_REQUIRED' ? 'needs_login' : 'error';
  }

  return session;
}

function publicState(session) {
  return {
    accountId: session.accountId,
    status: session.status,
    mode: session.mode,
    startedAt: session.startedAt,
    usageUrl: USAGE_URL,
    lastFetchedAt: session.lastFetchedAt,
    lastScrapeAt: session.lastScrape?.scrapedAt || null,
    lastScrape: session.lastScrape,
    usage: session.usage,
    error: session.error
  };
}

export function primeUsageConnector(profile, maxAgeMs = 60000) {
  const session = ensureSession(profile.id);
  if (session.pending) {
    return;
  }

  const needsRefresh = (
    !session.lastFetchedAt ||
    session.status === 'idle' ||
    (Date.now() - Date.parse(session.lastFetchedAt)) > maxAgeMs
  );

  if (!needsRefresh) {
    return;
  }

  session.pending = refreshSession(profile, session).finally(() => {
    session.pending = null;
  });
}

export async function startUsageConnector(profile) {
  const session = ensureSession(profile.id);
  if (!session.pending) {
    session.pending = refreshSession(profile, session).finally(() => {
      session.pending = null;
    });
  }
  await session.pending;
  return publicState(session);
}

export async function refreshUsageConnector(accountId) {
  const profile = getProfile(accountId);
  if (!profile) {
    return null;
  }

  return startUsageConnector(profile);
}

export function getUsageConnector(accountId) {
  const session = sessions.get(accountId);
  return session ? publicState(session) : null;
}

export async function stopUsageConnector(accountId) {
  const session = sessions.get(accountId);
  if (!session) {
    return false;
  }

  session.status = 'stopped';
  sessions.delete(accountId);
  return true;
}

export { USAGE_URL };
