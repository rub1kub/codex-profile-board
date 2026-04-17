const STORAGE_KEYS = {
  theme: 'codex-board.theme',
  language: 'codex-board.language'
};

const state = {
  profiles: [],
  ui: {
    theme: 'system',
    language: 'ru',
    editingProfileId: null,
    editingName: '',
    draggingId: null,
    dropTargetId: null,
    dropPosition: 'before'
  },
  loginModal: {
    profileId: null,
    openUrl: '',
    code: '',
    phase: 'idle',
    remaining: 3,
    countdownId: null,
    hintMode: 'default',
    hintTimeoutId: null,
    errorMessage: ''
  }
};

const THEME_MEDIA = window.matchMedia('(prefers-color-scheme: dark)');

const MESSAGES = {
  ru: {
    addAccount: 'Добавить аккаунт',
    refresh: 'Обновить',
    themeLabel: 'Тема',
    languageLabel: 'Язык',
    themeSystem: 'Системная',
    themeLight: 'Светлая',
    themeDark: 'Темная',
    languageRussian: 'Русский',
    languageEnglish: 'English',
    statusAuthorizing: 'Авторизация',
    statusConnected: 'Подключён',
    statusLoginError: 'Ошибка входа',
    statusNoLogin: 'Нет входа',
    usageLoading: 'Лимиты обновляются',
    usageReady: 'Лимиты загружены',
    usageNeedsLogin: 'Нужен вход',
    usageError: 'Ошибка лимитов',
    usageNone: 'Нет лимитов',
    planUnknown: 'План не определён',
    noData: 'Нет данных',
    windowFiveHours: '5 часов',
    windowWeek: 'Неделя',
    localChats: 'Локальные чаты',
    localTokens: 'Локальные токены',
    localChatsTitle: 'Количество локальных чатов Codex из state_5.sqlite',
    localTokensTitle: 'Суммарные локально использованные токены Codex из state_5.sqlite',
    availableAgain: ({ date }) => `Обновится ${date}`,
    loginCode: 'Код входа',
    relogin: 'Перелогинить',
    openLoginTab: 'Открыть вкладку входа',
    refreshAction: 'Обновить',
    removeAction: 'Удалить',
    renameProfile: 'Переименовать',
    saveName: 'Сохранить',
    cancelName: 'Отмена',
    subtitleNoEmail: 'После нажатия откроется новая вкладка с авторизацией Codex.',
    emptyTitle: 'Пока нет аккаунтов',
    emptyText: 'Нажмите «Добавить аккаунт», чтобы сразу получить код входа.',
    modalEyebrow: 'Вход в Codex',
    modalClose: 'Закрыть',
    modalLink: 'Открыть вкладку вручную',
    modalHintDefault: 'Нажмите на код, чтобы скопировать его.',
    modalHintCopied: 'Код скопирован.',
    modalHintCopyFailed: 'Не удалось скопировать код.',
    modalPreparingTitle: 'Подготавливаем авторизацию',
    modalPreparingMessage: 'Получаем одноразовый код входа для Codex.',
    modalWaitingTimer: 'Новая вкладка откроется автоматически.',
    modalCodeReadyTitle: 'Код готов',
    modalCodeReadyMessage: 'Введите этот код на странице авторизации Codex.',
    modalCountdown: ({ seconds }) => `Новая вкладка откроется через ${seconds} сек.`,
    modalOpeningTitle: 'Открываем вкладку',
    modalOpeningMessage: 'Пробуем открыть вкладку авторизации…',
    modalOpeningTimer: 'Если вкладка не открылась, используйте ссылку ниже.',
    modalOpenedTitle: 'Вкладка открыта',
    modalOpenedMessage: 'После входа модальное окно закроется автоматически.',
    modalOpenedTimer: 'Если вкладка не загрузилась, используйте ссылку ниже.',
    modalBlockedTitle: 'Откройте вкладку вручную',
    modalBlockedMessage: 'Браузер заблокировал автооткрытие.',
    modalBlockedTimer: 'Используйте ссылку ниже, чтобы продолжить вход.',
    modalErrorTitle: 'Не удалось начать вход',
    modalErrorTimer: 'Закройте окно и попробуйте снова позже.',
    themeAppliedLight: 'light',
    themeAppliedDark: 'dark'
  },
  en: {
    addAccount: 'Add account',
    refresh: 'Refresh',
    themeLabel: 'Theme',
    languageLabel: 'Language',
    themeSystem: 'System',
    themeLight: 'Light',
    themeDark: 'Dark',
    languageRussian: 'Russian',
    languageEnglish: 'English',
    statusAuthorizing: 'Authorizing',
    statusConnected: 'Connected',
    statusLoginError: 'Login error',
    statusNoLogin: 'Not signed in',
    usageLoading: 'Refreshing limits',
    usageReady: 'Limits ready',
    usageNeedsLogin: 'Login required',
    usageError: 'Limits error',
    usageNone: 'No limits',
    planUnknown: 'Plan not detected',
    noData: 'No data',
    windowFiveHours: '5 hours',
    windowWeek: 'Week',
    localChats: 'Local chats',
    localTokens: 'Local tokens',
    localChatsTitle: 'Number of local Codex chats from state_5.sqlite',
    localTokensTitle: 'Total locally used Codex tokens from state_5.sqlite',
    availableAgain: ({ date }) => `Resets ${date}`,
    loginCode: 'Login code',
    relogin: 'Relogin',
    openLoginTab: 'Open login tab',
    refreshAction: 'Refresh',
    removeAction: 'Remove',
    renameProfile: 'Rename',
    saveName: 'Save',
    cancelName: 'Cancel',
    subtitleNoEmail: 'A new browser tab will open with Codex authorization.',
    emptyTitle: 'No accounts yet',
    emptyText: 'Click “Add account” to get a login code right away.',
    modalEyebrow: 'Codex Login',
    modalClose: 'Close',
    modalLink: 'Open tab manually',
    modalHintDefault: 'Click the code to copy it.',
    modalHintCopied: 'Code copied.',
    modalHintCopyFailed: 'Could not copy the code.',
    modalPreparingTitle: 'Preparing authorization',
    modalPreparingMessage: 'Requesting a one-time Codex login code.',
    modalWaitingTimer: 'A new tab will open automatically.',
    modalCodeReadyTitle: 'Code ready',
    modalCodeReadyMessage: 'Enter this code on the Codex authorization page.',
    modalCountdown: ({ seconds }) => `A new tab will open in ${seconds}s.`,
    modalOpeningTitle: 'Opening tab',
    modalOpeningMessage: 'Trying to open the authorization tab…',
    modalOpeningTimer: 'If the tab did not open, use the link below.',
    modalOpenedTitle: 'Tab opened',
    modalOpenedMessage: 'The modal will close automatically after sign-in completes.',
    modalOpenedTimer: 'If the tab did not load, use the link below.',
    modalBlockedTitle: 'Open the tab manually',
    modalBlockedMessage: 'Your browser blocked automatic tab opening.',
    modalBlockedTimer: 'Use the link below to continue signing in.',
    modalErrorTitle: 'Could not start login',
    modalErrorTimer: 'Close this modal and try again later.',
    themeAppliedLight: 'light',
    themeAppliedDark: 'dark'
  }
};

const $ = (selector) => document.querySelector(selector);

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function currentLocale() {
  return state.ui.language === 'ru' ? 'ru-RU' : 'en-US';
}

function t(key, params = {}) {
  const value = MESSAGES[state.ui.language]?.[key] ?? MESSAGES.ru[key] ?? key;
  return typeof value === 'function' ? value(params) : value;
}

function formatMaybe(value) {
  return value === '' || value === null || value === undefined ? t('noData') : escapeHtml(value);
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString(currentLocale());
}

function formatPercentNumber(value) {
  return new Intl.NumberFormat(currentLocale(), {
    maximumFractionDigits: 1
  }).format(value);
}

function formatRemainingText(percent) {
  if (percent === null || percent === undefined || Number.isNaN(percent)) {
    return t('noData');
  }

  return state.ui.language === 'ru'
    ? `${formatPercentNumber(percent)} % осталось`
    : `${formatPercentNumber(percent)}% left`;
}

function formatResetDate(timestampMs) {
  if (!timestampMs) {
    return t('noData');
  }

  return new Intl.DateTimeFormat(currentLocale(), {
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(timestampMs));
}

function progressTone(percent) {
  if (percent === null || percent === undefined) return 'is-neutral';
  if (percent < 25) return 'is-danger';
  if (percent < 60) return 'is-warning';
  return 'is-success';
}

function loadPreferences() {
  const storedTheme = localStorage.getItem(STORAGE_KEYS.theme);
  const storedLanguage = localStorage.getItem(STORAGE_KEYS.language);
  state.ui.theme = ['system', 'light', 'dark'].includes(storedTheme) ? storedTheme : 'system';
  state.ui.language = ['ru', 'en'].includes(storedLanguage)
    ? storedLanguage
    : (navigator.language || '').toLowerCase().startsWith('ru') ? 'ru' : 'en';
}

function resolveTheme() {
  if (state.ui.theme === 'system') {
    return THEME_MEDIA.matches ? 'dark' : 'light';
  }
  return state.ui.theme;
}

function applyTheme() {
  document.documentElement.dataset.theme = resolveTheme();
}

async function request(url, options = {}) {
  const response = await fetch(url, {
    headers: {
      'content-type': 'application/json',
      ...(options.headers || {})
    },
    ...options
  });

  if (!response.ok) {
    const text = await response.text();
    let message = text;
    try {
      const payload = JSON.parse(text);
      message = payload.error || text;
    } catch {
      // Keep the raw text.
    }
    throw new Error(message || `Request failed: ${response.status}`);
  }

  return response.json();
}

function loginBadge(profile) {
  if (profile.loginSession?.status === 'running') {
    return `<span class="status-pill status-warning">${t('statusAuthorizing')}</span>`;
  }
  if (profile.loginStatus?.ok) {
    return `<span class="status-pill status-success">${t('statusConnected')}</span>`;
  }
  if (profile.loginStatus?.error) {
    return `<span class="status-pill status-danger">${t('statusLoginError')}</span>`;
  }
  return `<span class="status-pill status-neutral">${t('statusNoLogin')}</span>`;
}

function usageBadge(profile) {
  if (profile.usageConnector?.status === 'loading') {
    return `<span class="status-pill status-warning">${t('usageLoading')}</span>`;
  }
  if (profile.usageConnector?.status === 'ready') {
    return `<span class="status-pill status-success">${t('usageReady')}</span>`;
  }
  if (profile.usageConnector?.status === 'needs_login') {
    return `<span class="status-pill status-neutral">${t('usageNeedsLogin')}</span>`;
  }
  if (profile.usageConnector?.status === 'error') {
    return `<span class="status-pill status-danger">${t('usageError')}</span>`;
  }
  return `<span class="status-pill status-neutral">${t('usageNone')}</span>`;
}

function planLabel(profile) {
  return profile.planLabelOverride || profile.plan?.label || t('planUnknown');
}

function renderProgressCard(params) {
  const {
    label,
    percent,
    resetAt
  } = params;

  const tone = progressTone(percent);
  const width = percent === null || percent === undefined ? 0 : percent;
  const resetText = resetAt ? formatResetDate(resetAt) : t('noData');

  return `
    <div class="progress-card">
      <div class="progress-head">
        <span>${escapeHtml(label)}</span>
        <strong>${escapeHtml(formatRemainingText(percent))}</strong>
      </div>
      <div class="progress-track">
        <div class="progress-fill ${tone}" style="width:${width}%;"></div>
      </div>
      <div class="progress-foot">
        ${resetAt ? `
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 7a1 1 0 0 1 1 1v3.6l2.4 1.4a1 1 0 1 1-1 1.8l-2.9-1.7A1 1 0 0 1 11 12V8a1 1 0 0 1 1-1zm0-5a10 10 0 1 1 0 20 10 10 0 0 1 0-20zm0 2a8 8 0 1 0 0 16 8 8 0 0 0 0-16z"/>
          </svg>
        ` : ''}
        <span>${escapeHtml(resetText)}</span>
      </div>
    </div>
  `;
}

function renderMetaPill(label, value, title = '') {
  return `
    <span class="meta-pill" ${title ? `title="${escapeHtml(title)}"` : ''}>
      <span class="meta-label">${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
    </span>
  `;
}

function renderEditNameButton(profileId) {
  return `
    <button
      type="button"
      class="icon-button secondary"
      data-action="edit-name"
      data-id="${profileId}"
      aria-label="${escapeHtml(t('renameProfile'))}"
      title="${escapeHtml(t('renameProfile'))}"
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 20l4.2-1 9.1-9.1-3.2-3.1L5 15.8 4 20zm12.2-14.8l1.6-1.6a1.6 1.6 0 0 1 2.3 0l.3.3a1.6 1.6 0 0 1 0 2.3l-1.6 1.6-2.6-2.6z"/>
      </svg>
    </button>
  `;
}

function renderProfileRow(profile) {
  const usage = profile.usageConnector?.usage || null;
  const primary = usage?.primaryWindow || null;
  const secondary = usage?.secondaryWindow || null;
  const loginRunning = profile.loginSession?.status === 'running';
  const isRelogin = Boolean(profile.loginStatus?.ok);
  const loginLabel = isRelogin ? t('relogin') : t('openLoginTab');
  const loginButtonClass = isRelogin ? 'secondary' : '';
  const loginCode = profile.loginSession?.userCode || '';
  const isEditingName = state.ui.editingProfileId === profile.id;
  const isDragging = state.ui.draggingId === profile.id;
  const dropClass = state.ui.dropTargetId === profile.id
    ? (state.ui.dropPosition === 'after' ? 'is-drop-after' : 'is-drop-before')
    : '';
  const subtitle = profile.emailHint
    ? `${escapeHtml(profile.emailHint)}<span>•</span>${escapeHtml(planLabel(profile))}`
    : escapeHtml(t('subtitleNoEmail'));
  const titleMarkup = isEditingName
    ? `
      <form class="name-edit-form" data-form="rename" data-id="${profile.id}">
        <input
          class="name-edit-input"
          type="text"
          name="name"
          value="${escapeHtml(state.ui.editingName || profile.name)}"
          maxlength="80"
          autocomplete="off"
        />
        <button type="submit" class="secondary">${escapeHtml(t('saveName'))}</button>
        <button type="button" class="secondary" data-action="cancel-rename" data-id="${profile.id}">${escapeHtml(t('cancelName'))}</button>
      </form>
    `
    : `
      <div class="account-title-row">
        <h3>${escapeHtml(profile.name)}</h3>
        ${renderEditNameButton(profile.id)}
      </div>
    `;

  return `
    <article
      class="account-row ${isDragging ? 'is-dragging' : ''} ${dropClass}"
      data-profile-id="${profile.id}"
      draggable="${isEditingName ? 'false' : 'true'}"
    >
      <div class="account-main">
        <div class="account-header">
          <div>
            ${titleMarkup}
            <p class="account-subtitle">${subtitle}</p>
          </div>
          <div class="status-row">
            ${loginBadge(profile)}
            ${usageBadge(profile)}
          </div>
        </div>

        <div class="account-progress">
          ${renderProgressCard({
            label: t('windowFiveHours'),
            percent: primary?.remainingPercent ?? null,
            resetAt: primary?.resetAt ?? null
          })}
          ${renderProgressCard({
            label: t('windowWeek'),
            percent: secondary?.remainingPercent ?? null,
            resetAt: secondary?.resetAt ?? null
          })}
        </div>

        ${loginRunning && loginCode ? `
          <div class="account-meta">
            ${renderMetaPill(t('loginCode'), loginCode)}
          </div>
        ` : ''}

        <div class="account-actions">
          <button data-action="login-browser" data-id="${profile.id}" class="${loginButtonClass}" ${loginRunning ? 'disabled' : ''}>${loginLabel}</button>
          <button data-action="refresh-profile" data-id="${profile.id}" class="secondary">${t('refreshAction')}</button>
          <button data-action="remove" data-id="${profile.id}" class="danger">${t('removeAction')}</button>
        </div>
      </div>
    </article>
  `;
}

function renderToolbar() {
  $('#connect-account').textContent = t('addAccount');
  $('#refresh-state').textContent = t('refresh');
  $('#theme-label').textContent = t('themeLabel');
  $('#language-label').textContent = t('languageLabel');
  $('#theme-select').innerHTML = `
    <option value="system">${escapeHtml(t('themeSystem'))}</option>
    <option value="light">${escapeHtml(t('themeLight'))}</option>
    <option value="dark">${escapeHtml(t('themeDark'))}</option>
  `;
  $('#theme-select').value = state.ui.theme;
  $('#language-select').innerHTML = `
    <option value="ru">${escapeHtml(t('languageRussian'))}</option>
    <option value="en">${escapeHtml(t('languageEnglish'))}</option>
  `;
  $('#language-select').value = state.ui.language;
}

function renderProfiles() {
  $('#profiles').innerHTML = state.profiles.length
    ? state.profiles.map(renderProfileRow).join('')
    : `
      <div class="empty-state">
        <h3>${escapeHtml(t('emptyTitle'))}</h3>
        <p>${escapeHtml(t('emptyText'))}</p>
      </div>
    `;

  if (state.ui.editingProfileId) {
    const input = document.querySelector(`.name-edit-form[data-id="${state.ui.editingProfileId}"] .name-edit-input`);
    if (input) {
      input.focus();
      input.select();
    }
  }
}

function updateDragIndicators() {
  document.querySelectorAll('.account-row').forEach((row) => {
    const id = row.dataset.profileId;
    row.classList.toggle('is-dragging', state.ui.draggingId === id);
    row.classList.toggle(
      'is-drop-before',
      state.ui.dropTargetId === id && state.ui.dropPosition === 'before'
    );
    row.classList.toggle(
      'is-drop-after',
      state.ui.dropTargetId === id && state.ui.dropPosition === 'after'
    );
  });
}

function beginEditingName(profileId) {
  const profile = state.profiles.find((item) => item.id === profileId);
  if (!profile) {
    return;
  }

  state.ui.editingProfileId = profileId;
  state.ui.editingName = profile.name;
  renderProfiles();
}

function cancelEditingName() {
  state.ui.editingProfileId = null;
  state.ui.editingName = '';
  renderProfiles();
}

async function saveProfileName(profileId, name) {
  const trimmedName = String(name || '').trim();
  if (!trimmedName) {
    return;
  }

  await request(`/api/profiles/${encodeURIComponent(profileId)}`, {
    method: 'PATCH',
    body: JSON.stringify({ name: trimmedName })
  });

  state.ui.editingProfileId = null;
  state.ui.editingName = '';
  await loadState();
}

function buildReorderedIds(sourceId, targetId, position) {
  const ids = state.profiles.map((profile) => profile.id);
  const sourceIndex = ids.indexOf(sourceId);
  const targetIndex = ids.indexOf(targetId);
  if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) {
    return ids;
  }

  ids.splice(sourceIndex, 1);
  const insertIndex = position === 'after'
    ? (targetIndex > sourceIndex ? targetIndex : targetIndex + 1)
    : (targetIndex > sourceIndex ? targetIndex - 1 : targetIndex);
  ids.splice(insertIndex, 0, sourceId);
  return ids;
}

async function persistProfileOrder(ids) {
  const previousProfiles = [...state.profiles];
  const byId = new Map(state.profiles.map((profile) => [profile.id, profile]));
  state.profiles = ids.map((id) => byId.get(id)).filter(Boolean);
  renderProfiles();

  try {
    await request('/api/profiles/reorder', {
      method: 'POST',
      body: JSON.stringify({ ids })
    });
  } catch (error) {
    state.profiles = previousProfiles;
    renderProfiles();
    throw error;
  }
}

function resetHintTimeout() {
  if (state.loginModal.hintTimeoutId) {
    clearTimeout(state.loginModal.hintTimeoutId);
    state.loginModal.hintTimeoutId = null;
  }
}

function resetLoginModalTimer() {
  if (state.loginModal.countdownId) {
    clearInterval(state.loginModal.countdownId);
    state.loginModal.countdownId = null;
  }
}

function closeLoginModal() {
  resetLoginModalTimer();
  resetHintTimeout();
  state.loginModal.profileId = null;
  state.loginModal.openUrl = '';
  state.loginModal.code = '';
  state.loginModal.phase = 'idle';
  state.loginModal.remaining = 3;
  state.loginModal.hintMode = 'default';
  state.loginModal.errorMessage = '';
  $('#login-modal').classList.add('is-hidden');
  $('#login-modal').setAttribute('aria-hidden', 'true');
}

function renderLoginModal() {
  const modal = $('#login-modal');
  const link = $('#login-modal-link');
  $('#login-modal-close').textContent = t('modalClose');
  $('.modal-eyebrow').textContent = t('modalEyebrow');
  link.textContent = t('modalLink');

  if (!state.loginModal.profileId || state.loginModal.phase === 'idle') {
    modal.classList.add('is-hidden');
    modal.setAttribute('aria-hidden', 'true');
    return;
  }

  modal.classList.remove('is-hidden');
  modal.setAttribute('aria-hidden', 'false');

  let title = t('modalPreparingTitle');
  let message = t('modalPreparingMessage');
  let timerText = t('modalWaitingTimer');

  if (state.loginModal.phase === 'codeReady') {
    title = t('modalCodeReadyTitle');
    message = t('modalCodeReadyMessage');
    timerText = t('modalCountdown', { seconds: state.loginModal.remaining });
  } else if (state.loginModal.phase === 'opening') {
    title = t('modalOpeningTitle');
    message = t('modalOpeningMessage');
    timerText = t('modalOpeningTimer');
  } else if (state.loginModal.phase === 'opened') {
    title = t('modalOpenedTitle');
    message = t('modalOpenedMessage');
    timerText = t('modalOpenedTimer');
  } else if (state.loginModal.phase === 'blocked') {
    title = t('modalBlockedTitle');
    message = t('modalBlockedMessage');
    timerText = t('modalBlockedTimer');
  } else if (state.loginModal.phase === 'error') {
    title = t('modalErrorTitle');
    message = state.loginModal.errorMessage || t('modalErrorTitle');
    timerText = t('modalErrorTimer');
  }

  $('#login-modal-title').textContent = title;
  $('#login-modal-message').textContent = message;
  $('#login-modal-code').textContent = state.loginModal.code || '••••-••••';
  $('#login-modal-timer').textContent = timerText;
  $('#login-modal-hint').textContent = state.loginModal.hintMode === 'copied'
    ? t('modalHintCopied')
    : state.loginModal.hintMode === 'copy_failed'
      ? t('modalHintCopyFailed')
      : t('modalHintDefault');

  if (state.loginModal.openUrl) {
    link.href = state.loginModal.openUrl;
    link.classList.remove('is-hidden');
  } else {
    link.href = '#';
    link.classList.add('is-hidden');
  }
}

function resolveLoginUrl(session) {
  return session?.verificationUrl || session?.browserUrl || '';
}

async function waitForLoginUrl(profileId, timeoutMs = 5000) {
  const startedAt = Date.now();

  while ((Date.now() - startedAt) < timeoutMs) {
    const encoded = encodeURIComponent(profileId);
    const payload = await request(`/api/profiles/${encoded}/login-session`);
    const url = resolveLoginUrl(payload.session);

    if (url && payload.session?.userCode) {
      return payload.session;
    }

    if (payload.session?.status && payload.session.status !== 'running') {
      return payload.session;
    }

    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  return null;
}

function startModalCountdown(openUrl, seconds = 3) {
  state.loginModal.openUrl = openUrl;
  state.loginModal.phase = 'codeReady';
  state.loginModal.remaining = seconds;
  renderLoginModal();
  resetLoginModalTimer();

  state.loginModal.countdownId = setInterval(() => {
    state.loginModal.remaining -= 1;

    if (state.loginModal.remaining <= 0) {
      resetLoginModalTimer();
      state.loginModal.phase = 'opening';
      renderLoginModal();

      const opened = window.open(openUrl, '_blank');
      state.loginModal.phase = opened ? 'opened' : 'blocked';
      renderLoginModal();
      return;
    }

    renderLoginModal();
  }, 1000);
}

async function beginLoginFlow(profileId) {
  state.loginModal.profileId = profileId;
  state.loginModal.openUrl = '';
  state.loginModal.code = '';
  state.loginModal.phase = 'preparing';
  state.loginModal.remaining = 3;
  state.loginModal.hintMode = 'default';
  state.loginModal.errorMessage = '';
  renderLoginModal();

  const encoded = encodeURIComponent(profileId);
  await request(`/api/profiles/${encoded}/login/browser`, { method: 'POST', body: '{}' });
  const session = await waitForLoginUrl(profileId, 8000);
  const loginUrl = resolveLoginUrl(session);

  if (!session?.userCode || !loginUrl) {
    state.loginModal.phase = 'error';
    state.loginModal.errorMessage = session?.stderr || session?.error || t('modalErrorTitle');
    renderLoginModal();
    return false;
  }

  state.loginModal.code = session.userCode;
  state.loginModal.openUrl = loginUrl;
  state.loginModal.phase = 'codeReady';
  state.loginModal.remaining = 3;
  renderLoginModal();
  startModalCountdown(loginUrl, 3);
  return true;
}

async function copyLoginCode() {
  if (!state.loginModal.code) {
    return;
  }

  try {
    await navigator.clipboard.writeText(state.loginModal.code);
    state.loginModal.hintMode = 'copied';
  } catch {
    state.loginModal.hintMode = 'copy_failed';
  }

  renderLoginModal();
  resetHintTimeout();
  state.loginModal.hintTimeoutId = setTimeout(() => {
    state.loginModal.hintMode = 'default';
    renderLoginModal();
    state.loginModal.hintTimeoutId = null;
  }, 1800);
}

function syncLoginModal() {
  if (!state.loginModal.profileId) {
    renderLoginModal();
    return;
  }

  const profile = state.profiles.find((item) => item.id === state.loginModal.profileId);
  if (!profile) {
    closeLoginModal();
    return;
  }

  if (profile.loginStatus?.ok || profile.loginSession?.status === 'completed') {
    closeLoginModal();
    return;
  }

  if (profile.loginSession?.status === 'failed' || profile.loginSession?.status === 'killed') {
    resetLoginModalTimer();
    state.loginModal.phase = 'error';
    state.loginModal.errorMessage = profile.loginSession.stderr || profile.loginSession.error || t('modalErrorTitle');
  }

  renderLoginModal();
}

async function loadState() {
  const payload = await request('/api/state');
  state.profiles = payload.profiles;
  renderToolbar();
  renderProfiles();
  syncLoginModal();
}

async function handleProfileAction(action, profileId) {
  const encoded = encodeURIComponent(profileId);

  if (action === 'login-browser') {
    await beginLoginFlow(profileId);
    await loadState();
    return;
  }

  if (action === 'refresh-profile') {
    await request(`/api/profiles/${encoded}/refresh`, { method: 'POST', body: '{}' });
    await request(`/api/profiles/${encoded}/usage/refresh`, { method: 'POST', body: '{}' }).catch(() => {});
    await loadState();
    return;
  }

  if (action === 'remove') {
    await request(`/api/profiles/${encoded}`, { method: 'DELETE' });
    if (state.loginModal.profileId === profileId) {
      closeLoginModal();
    }
    await loadState();
  }
}

function persistTheme(value) {
  state.ui.theme = value;
  localStorage.setItem(STORAGE_KEYS.theme, value);
  applyTheme();
  renderToolbar();
  renderProfiles();
  renderLoginModal();
}

function persistLanguage(value) {
  state.ui.language = value;
  localStorage.setItem(STORAGE_KEYS.language, value);
  renderToolbar();
  renderProfiles();
  renderLoginModal();
}

$('#profiles').addEventListener('click', async (event) => {
  const button = event.target.closest('[data-action]');
  if (!button) return;

  const action = button.dataset.action;
  const profileId = button.dataset.id;

  if (action === 'edit-name') {
    beginEditingName(profileId);
    return;
  }

  if (action === 'cancel-rename') {
    cancelEditingName();
    return;
  }

  button.disabled = true;
  try {
    await handleProfileAction(action, profileId);
  } catch (error) {
    alert(error.message);
  } finally {
    button.disabled = false;
  }
});

$('#profiles').addEventListener('submit', async (event) => {
  const form = event.target.closest('[data-form="rename"]');
  if (!form) return;
  event.preventDefault();

  const profileId = form.dataset.id;
  const formData = new FormData(form);
  try {
    await saveProfileName(profileId, formData.get('name'));
  } catch (error) {
    alert(error.message);
  }
});

$('#profiles').addEventListener('dragstart', (event) => {
  const row = event.target.closest('.account-row');
  if (!row) return;

  state.ui.draggingId = row.dataset.profileId;
  state.ui.dropTargetId = null;
  state.ui.dropPosition = 'before';
  event.dataTransfer.effectAllowed = 'move';
  event.dataTransfer.setData('text/plain', state.ui.draggingId);
  updateDragIndicators();
});

$('#profiles').addEventListener('dragover', (event) => {
  const row = event.target.closest('.account-row');
  if (!row || !state.ui.draggingId || row.dataset.profileId === state.ui.draggingId) return;

  event.preventDefault();
  const bounds = row.getBoundingClientRect();
  state.ui.dropTargetId = row.dataset.profileId;
  state.ui.dropPosition = (event.clientY - bounds.top) > (bounds.height / 2) ? 'after' : 'before';
  updateDragIndicators();
});

$('#profiles').addEventListener('dragleave', (event) => {
  const row = event.target.closest('.account-row');
  if (!row || row.contains(event.relatedTarget)) return;

  if (state.ui.dropTargetId === row.dataset.profileId) {
    state.ui.dropTargetId = null;
    updateDragIndicators();
  }
});

$('#profiles').addEventListener('drop', async (event) => {
  const row = event.target.closest('.account-row');
  if (!row || !state.ui.draggingId) return;

  event.preventDefault();
  const targetId = row.dataset.profileId;
  if (!targetId || targetId === state.ui.draggingId) {
    state.ui.draggingId = null;
    state.ui.dropTargetId = null;
    updateDragIndicators();
    return;
  }

  const ids = buildReorderedIds(state.ui.draggingId, targetId, state.ui.dropPosition);
  state.ui.draggingId = null;
  state.ui.dropTargetId = null;
  try {
    await persistProfileOrder(ids);
  } catch (error) {
    alert(error.message);
  }
});

$('#profiles').addEventListener('dragend', () => {
  state.ui.draggingId = null;
  state.ui.dropTargetId = null;
  updateDragIndicators();
});

$('#connect-account').addEventListener('click', async () => {
  const button = $('#connect-account');
  button.disabled = true;
  try {
    const payload = await request('/api/connect/browser', { method: 'POST', body: '{}' });
    await loadState();
    await beginLoginFlow(payload.profile.id);
    await loadState();
  } catch (error) {
    alert(error.message);
  } finally {
    button.disabled = false;
  }
});

$('#refresh-state').addEventListener('click', async () => {
  try {
    await loadState();
  } catch (error) {
    alert(error.message);
  }
});

$('#theme-select').addEventListener('change', (event) => {
  persistTheme(event.target.value);
});

$('#language-select').addEventListener('change', (event) => {
  persistLanguage(event.target.value);
});

$('#login-modal-close').addEventListener('click', () => {
  closeLoginModal();
});

$('#login-modal').addEventListener('click', (event) => {
  if (event.target.matches('[data-close-modal]')) {
    closeLoginModal();
  }
});

$('#login-modal-code').addEventListener('click', () => {
  void copyLoginCode();
});

THEME_MEDIA.addEventListener('change', () => {
  if (state.ui.theme === 'system') {
    applyTheme();
  }
});

setInterval(() => {
  const shouldPoll = state.profiles.some((profile) =>
    profile.loginSession?.status === 'running' ||
    profile.usageConnector?.status === 'loading' ||
    profile.diagnostics?.refreshInFlight
  ) || Boolean(state.loginModal.profileId);

  if (shouldPoll) {
    loadState().catch(() => {});
  }
}, 5000);

loadPreferences();
applyTheme();
renderToolbar();
renderLoginModal();
loadState().catch((error) => {
  document.body.innerHTML = `<main class="shell"><pre class="empty-state">${escapeHtml(error.message)}</pre></main>`;
});
