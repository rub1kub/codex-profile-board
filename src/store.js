import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const DATA_DIR = path.resolve(process.cwd(), '.data');
const STORE_PATH = path.join(DATA_DIR, 'profiles.json');
const LEGACY_STORE_PATH = path.join(DATA_DIR, 'accounts.json');
const PROFILES_DIR = path.join(DATA_DIR, 'profiles');

function nowIso() {
  return new Date().toISOString();
}

function ensureDirs() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.mkdirSync(PROFILES_DIR, { recursive: true });
}

function slugify(value) {
  return String(value || 'profile')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48) || 'profile';
}

function normalizeLimits(limits = {}) {
  return {
    workspaceCreditsRemaining: limits.workspaceCreditsRemaining ?? '',
    workspaceCreditsTotal: limits.workspaceCreditsTotal ?? '',
    monthlyBudgetUsd: limits.monthlyBudgetUsd ?? '',
    usedThisMonthUsd: limits.usedThisMonthUsd ?? ''
  };
}

function normalizeProfile(record = {}) {
  const id = record.id ?? crypto.randomUUID();
  const legacyBaseDir = record.baseDir;
  const baseDir = legacyBaseDir || path.join(PROFILES_DIR, `${slugify(record.name)}-${id.slice(0, 8)}`);
  const homeDir = record.homeDir || path.join(baseDir, 'home');
  const codexDir = record.codexDir || path.join(homeDir, '.codex');

  return {
    id,
    createdAt: record.createdAt ?? nowIso(),
    updatedAt: record.updatedAt ?? nowIso(),
    name: record.name ?? 'New account',
    emailHint: record.emailHint ?? '',
    notes: record.notes ?? '',
    planId: record.planId ?? 'custom',
    planLabelOverride: record.planLabelOverride ?? '',
    authKind: record.authKind ?? 'chatgpt-browser',
    baseDir,
    homeDir,
    codexDir,
    model: record.model ?? '',
    externalAccountId: record.externalAccountId ?? '',
    externalUserId: record.externalUserId ?? '',
    manualLimits: normalizeLimits(record.manualLimits)
  };
}

function writeStore(store) {
  ensureDirs();
  fs.writeFileSync(STORE_PATH, JSON.stringify(store, null, 2) + '\n');
}

function migrateLegacyStore() {
  if (!fs.existsSync(LEGACY_STORE_PATH) || fs.existsSync(STORE_PATH)) {
    return;
  }

  const raw = fs.readFileSync(LEGACY_STORE_PATH, 'utf8');
  const parsed = JSON.parse(raw || '{"accounts":[]}');
  const sourceProfiles = parsed.profiles ?? parsed.accounts ?? [];
  writeStore({
    profiles: sourceProfiles.map(normalizeProfile)
  });
}

function ensureStoreFile() {
  ensureDirs();
  migrateLegacyStore();
  if (!fs.existsSync(STORE_PATH)) {
    writeStore({ profiles: [] });
  }
}

export function loadStore() {
  ensureStoreFile();
  const raw = fs.readFileSync(STORE_PATH, 'utf8');
  const parsed = JSON.parse(raw || '{"profiles":[]}');
  parsed.profiles ??= [];
  parsed.profiles = parsed.profiles.map(normalizeProfile);
  return parsed;
}

export function saveStore(store) {
  ensureStoreFile();
  writeStore({
    profiles: (store.profiles ?? []).map(normalizeProfile)
  });
}

export function createProfileShell(name) {
  ensureDirs();
  const id = crypto.randomUUID();
  const dirName = `${slugify(name)}-${id.slice(0, 8)}`;
  const baseDir = path.join(PROFILES_DIR, dirName);
  const homeDir = path.join(baseDir, 'home');
  const codexDir = path.join(homeDir, '.codex');

  fs.mkdirSync(homeDir, { recursive: true });
  fs.mkdirSync(codexDir, { recursive: true });

  return { id, baseDir, homeDir, codexDir };
}

export function upsertProfile(profile) {
  const store = loadStore();
  const existingIndex = store.profiles.findIndex((item) => item.id === profile.id);
  const shell = existingIndex >= 0 ? null : createProfileShell(profile.name ?? 'profile');
  const existing = existingIndex >= 0 ? store.profiles[existingIndex] : null;

  const merged = normalizeProfile({
    id: existing?.id ?? shell.id,
    createdAt: existing?.createdAt ?? nowIso(),
    updatedAt: nowIso(),
    name: profile.name ?? existing?.name ?? 'New account',
    emailHint: profile.emailHint ?? existing?.emailHint ?? '',
    notes: profile.notes ?? existing?.notes ?? '',
    planId: profile.planId ?? existing?.planId ?? 'custom',
    planLabelOverride: profile.planLabelOverride ?? existing?.planLabelOverride ?? '',
    authKind: profile.authKind ?? existing?.authKind ?? 'chatgpt-browser',
    baseDir: existing?.baseDir ?? shell.baseDir,
    homeDir: existing?.homeDir ?? shell.homeDir,
    codexDir: existing?.codexDir ?? shell.codexDir,
    model: profile.model ?? existing?.model ?? '',
    externalAccountId: profile.externalAccountId ?? existing?.externalAccountId ?? '',
    externalUserId: profile.externalUserId ?? existing?.externalUserId ?? '',
    manualLimits: {
      ...existing?.manualLimits,
      ...profile.manualLimits
    }
  });

  if (existingIndex >= 0) {
    store.profiles[existingIndex] = merged;
  } else {
    store.profiles.push(merged);
  }

  saveStore(store);
  return merged;
}

export function createPendingProfile() {
  return upsertProfile({
    name: 'Новый аккаунт',
    planId: 'custom',
    authKind: 'chatgpt-browser'
  });
}

export function removeProfile(id) {
  const store = loadStore();
  const profile = store.profiles.find((item) => item.id === id) ?? null;
  store.profiles = store.profiles.filter((item) => item.id !== id);
  saveStore(store);
  return profile;
}

export function renameProfile(id, name) {
  const trimmedName = String(name || '').trim();
  if (!trimmedName) {
    throw new Error('name is required');
  }

  return upsertProfile({ id, name: trimmedName });
}

export function reorderProfiles(ids = []) {
  const store = loadStore();
  const byId = new Map(store.profiles.map((profile) => [profile.id, profile]));
  const nextProfiles = [];

  for (const id of ids) {
    const profile = byId.get(id);
    if (!profile) {
      continue;
    }
    nextProfiles.push(profile);
    byId.delete(id);
  }

  for (const profile of store.profiles) {
    if (byId.has(profile.id)) {
      nextProfiles.push(profile);
      byId.delete(profile.id);
    }
  }

  store.profiles = nextProfiles;
  saveStore(store);
  return store.profiles;
}

export function getProfile(id) {
  const store = loadStore();
  return store.profiles.find((item) => item.id === id) ?? null;
}

export function getStorePath() {
  return STORE_PATH;
}

export function getProfilesDir() {
  return PROFILES_DIR;
}
