/* ============================================
   PR Dashboard - Media Monitoring
   Settings Page JavaScript (settings.js)
   Includes: localStorage persistence, n8n webhook integration,
             dynamic Google Sheets URL, test connection flow
   ============================================ */

/* ============================================
   STORAGE KEY CONSTANTS
   ============================================ */
const SETTINGS_STORAGE_KEY = 'pusri_pr_settings_v1';
const DEFAULT_SHEETS_URL = (typeof APP_CONFIG !== 'undefined' && APP_CONFIG.GOOGLE_SHEETS_CSV_URL)
  ? APP_CONFIG.GOOGLE_SHEETS_CSV_URL
  : '';

/* ============================================
   MAIN ENTRY POINT
   ============================================ */
document.addEventListener('DOMContentLoaded', () => {
  // 1. Initialize Layout Injection
  initLayout('Settings', 'Pengaturan Konfigurasi Sistem PR PT Pupuk Sriwidjaja Palembang');

  // 2. Initialize Tabs Switching
  initTabs();

  // 3. Load Saved Settings from localStorage
  loadSettings();

  // 4. Initialize RSS Feed List Management
  initRSSFeeds();

  // (AI sliders removed)

  // 6. Initialize Telegram Toggle Switch Show/Hide
  initTelegramToggle();

  // 7. Initialize Google Sheets Edit Toggle
  initGoogleSheetsEdit();

  // 8. Initialize n8n Integration Controls
  initN8nSection();

  // 9. Save Button Action Handler
  initSaveButton();

  // 10. Initialize Notifications Toggles
  initNotifications();
});

/* ============================================
   1. TAB SWITCHING SYSTEM
   ============================================ */
function initTabs() {
  const tabButtons = document.querySelectorAll('.settings-tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');

  // Helper function to switch tabs
  const switchTab = (targetTab) => {
    tabButtons.forEach(btn => {
      if (btn.getAttribute('data-tab') === targetTab) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    tabContents.forEach(content => {
      if (content.id === `tab-${targetTab}`) {
        content.style.display = 'flex';
        content.style.flexDirection = 'column';
        content.style.gap = 'var(--space-8)';
      } else {
        content.style.display = 'none';
      }
    });
  };

  // Add click listeners to buttons
  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      const targetTab = button.getAttribute('data-tab');
      switchTab(targetTab);
      // Update URL without reloading page
      window.history.replaceState({}, '', `settings.html?tab=${targetTab}`);
    });
  });

  // Check URL parameters on load
  const urlParams = new URLSearchParams(window.location.search);
  const requestedTab = urlParams.get('tab');
  if (requestedTab) {
    switchTab(requestedTab);
  }
}

/* ============================================
   2. LOAD SETTINGS FROM localStorage
   ============================================ */
function loadSettings() {
  let saved = {};
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (raw) saved = JSON.parse(raw);
  } catch (e) {
    console.warn('[Settings] Failed to load settings from localStorage:', e);
    saved = {};
  }

  // --- Profile (From Google Session) ---
  const avatarContainer = document.getElementById('profile-avatar-container');
  if (avatarContainer && typeof getSessionAvatarHTML === 'function') {
    avatarContainer.innerHTML = getSessionAvatarHTML();
  }
  const nameInput = document.getElementById('profile-fullname');
  if (nameInput && typeof getSessionName === 'function') {
    nameInput.value = getSessionName();
  }
  const emailInput = document.getElementById('profile-email');
  if (emailInput && typeof getSessionEmail === 'function') {
    emailInput.value = getSessionEmail();
  }

  // --- Google Sheets URL ---
  const sheetsUrl = saved.googleSheetsUrl || DEFAULT_SHEETS_URL;
  const sheetsInput = document.getElementById('google-sheets-url');
  if (sheetsInput) sheetsInput.value = sheetsUrl;
  updateSheetsBadge(sheetsUrl);

  // --- Telegram ---
  if (saved.telegramBotToken) {
    const el = document.getElementById('telegram-bot-token');
    if (el) el.value = saved.telegramBotToken;
  }
  if (saved.telegramChatId) {
    const el = document.getElementById('telegram-chat-id');
    if (el) el.value = saved.telegramChatId;
  }
  if (typeof saved.telegramEnabled !== 'undefined') {
    const toggle = document.getElementById('telegram-toggle');
    if (toggle) {
      toggle.checked = saved.telegramEnabled;
      const inputsContainer = document.getElementById('telegram-config-inputs');
      if (inputsContainer) {
        inputsContainer.style.display = saved.telegramEnabled ? 'grid' : 'none';
      }
    }
  }



  // --- n8n ---
  if (saved.n8nWebhookUrl) {
    const el = document.getElementById('n8n-webhook-url');
    if (el) el.value = saved.n8nWebhookUrl;
    updateN8nBadge(saved.n8nWebhookUrl);
  }
  if (typeof saved.n8nAutoSync !== 'undefined') {
    const toggle = document.getElementById('n8n-autosync-toggle');
    if (toggle) {
      toggle.checked = saved.n8nAutoSync;
      const secretField = document.getElementById('n8n-secret-field');
      if (secretField) secretField.style.display = saved.n8nAutoSync ? 'flex' : 'none';
    }
  }
  if (saved.n8nAuthHeader) {
    const el = document.getElementById('n8n-auth-header');
    if (el) el.value = saved.n8nAuthHeader;
  }

  // --- Alert Threshold ---
  if (saved.alertThreshold) {
    const el = document.getElementById('alert-threshold-select');
    if (el) el.value = saved.alertThreshold;
  }

  // --- Notifications ---
  if (typeof saved.notifDailyEmail !== 'undefined') {
    const el = document.getElementById('notif-daily-email-toggle');
    if (el) el.checked = saved.notifDailyEmail;
  }
  if (typeof saved.notifWeeklyEmail !== 'undefined') {
    const el = document.getElementById('notif-weekly-email-toggle');
    if (el) el.checked = saved.notifWeeklyEmail;
  }
  if (typeof saved.notifBrowserPush !== 'undefined') {
    const el = document.getElementById('notif-browser-push-toggle');
    if (el) el.checked = saved.notifBrowserPush;
  }

  // --- RSS Feeds (will be handled by initRSSFeeds after load) ---
  // stored in saved.rssFeeds array of strings
  window._loadedRssFeeds = saved.rssFeeds || null;
}

/* ============================================
   3. RSS FEED MANAGEMENT (Interactive UI)
   ============================================ */
function initRSSFeeds() {
  const rssInput = document.getElementById('rss-feed-input');
  const addBtn = document.getElementById('btn-add-rss');
  const feedsList = document.getElementById('rss-feeds-list');

  if (!addBtn || !rssInput || !feedsList) return;

  // Load saved feeds if available
  if (window._loadedRssFeeds && window._loadedRssFeeds.length > 0) {
    // Clear existing static feeds, repopulate from localStorage
    feedsList.innerHTML = '';
    window._loadedRssFeeds.forEach(url => addRssFeedItem(url, feedsList));
  } else {
    // Attach delete handlers to existing static elements
    const deleteButtons = feedsList.querySelectorAll('.settings-list-item-delete');
    deleteButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.currentTarget.closest('.settings-list-item').remove();
      });
    });
  }

  // Add click listener for new feeds
  addBtn.addEventListener('click', () => {
    const url = rssInput.value.trim();
    if (!url) return;

    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      showToast('Masukkan URL RSS feed yang valid (dimulai dengan http:// atau https://)', 'error');
      return;
    }

    addRssFeedItem(url, feedsList);
    rssInput.value = '';
  });
}

function addRssFeedItem(url, feedsList) {
  let domainName = 'Sumber Baru';
  try {
    const hostname = new URL(url).hostname;
    domainName = hostname.replace('www.', '');
    domainName = domainName.charAt(0).toUpperCase() + domainName.slice(1);
  } catch (e) {
    // Ignore
  }

  const newItem = document.createElement('div');
  newItem.className = 'settings-list-item animate-fade-in-up';
  newItem.setAttribute('data-rss-url', url);
  newItem.innerHTML = `
    <div class="settings-list-item-left">
      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"></path></svg>
      <span>${domainName}</span>
    </div>
    <button class="settings-list-item-delete" title="Hapus sumber">
      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
    </button>
  `;

  newItem.querySelector('.settings-list-item-delete').addEventListener('click', () => {
    newItem.remove();
  });

  feedsList.appendChild(newItem);
}



/* ============================================
   5. TELEGRAM ALERT SUB-INPUTS TOGGLE
   ============================================ */
function initTelegramToggle() {
  const toggle = document.getElementById('telegram-toggle');
  const inputsContainer = document.getElementById('telegram-config-inputs');

  if (!toggle || !inputsContainer) return;

  toggle.addEventListener('change', () => {
    if (toggle.checked) {
      inputsContainer.style.display = 'grid';
      inputsContainer.style.opacity = '1';
      inputsContainer.style.pointerEvents = 'auto';
    } else {
      inputsContainer.style.display = 'none';
    }
  });
}

/* ============================================
   6. GOOGLE SHEETS EDIT TOGGLE
   ============================================ */
function initGoogleSheetsEdit() {
  const changeBtn = document.getElementById('btn-change-sheet');
  const sheetsInput = document.getElementById('google-sheets-url');
  const hint = document.getElementById('sheets-edit-hint');

  if (!changeBtn || !sheetsInput) return;

  let isEditing = false;

  changeBtn.addEventListener('click', () => {
    isEditing = !isEditing;
    if (isEditing) {
      sheetsInput.removeAttribute('readonly');
      sheetsInput.style.background = 'var(--color-card)';
      sheetsInput.style.borderColor = 'var(--color-primary-light)';
      sheetsInput.focus();
      changeBtn.textContent = 'Selesai Edit';
      changeBtn.style.color = 'var(--color-positive)';
      if (hint) hint.style.display = 'block';
    } else {
      sheetsInput.setAttribute('readonly', true);
      sheetsInput.style.background = '';
      sheetsInput.style.borderColor = '';
      changeBtn.textContent = 'Ubah Koneksi';
      changeBtn.style.color = '';
      if (hint) hint.style.display = 'none';
      updateSheetsBadge(sheetsInput.value);
    }
  });
}

function updateSheetsBadge(url) {
  const badge = document.querySelector('.settings-section .connection-badge');
  if (!badge) return;
  if (url && url.startsWith('https://docs.google.com')) {
    badge.textContent = '• Connected';
    badge.style.background = '#dcfce7';
    badge.style.color = '#16a34a';
  } else if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
    badge.textContent = '• Custom URL';
    badge.style.background = '#dbeafe';
    badge.style.color = '#2563eb';
  } else {
    badge.textContent = '• Tidak Dikonfigurasi';
    badge.style.background = '#fee2e2';
    badge.style.color = '#dc2626';
  }
}

/* ============================================
   7. N8N INTEGRATION SECTION
   ============================================ */
function initN8nSection() {
  // Toggle auth header field visibility
  const autoSyncToggle = document.getElementById('n8n-autosync-toggle');
  const secretField = document.getElementById('n8n-secret-field');

  if (autoSyncToggle && secretField) {
    autoSyncToggle.addEventListener('change', () => {
      secretField.style.display = autoSyncToggle.checked ? 'flex' : 'none';
    });
  }

  // Update badge when URL changes
  const webhookUrlInput = document.getElementById('n8n-webhook-url');
  if (webhookUrlInput) {
    webhookUrlInput.addEventListener('input', () => {
      updateN8nBadge(webhookUrlInput.value.trim());
    });
  }

  // Test Connection button
  const testBtn = document.getElementById('btn-test-n8n');
  if (testBtn) {
    testBtn.addEventListener('click', () => testN8nConnection());
  }
}

function updateN8nBadge(url) {
  const badge = document.getElementById('n8n-status-badge');
  if (!badge) return;
  if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
    badge.textContent = '• URL Dikonfigurasi';
    badge.style.background = '#dbeafe';
    badge.style.color = '#2563eb';
  } else {
    badge.textContent = '• Belum Dikonfigurasi';
    badge.style.background = '#fef3c7';
    badge.style.color = '#d97706';
  }
}

async function testN8nConnection() {
  const webhookUrl = (document.getElementById('n8n-webhook-url')?.value || '').trim();
  const testBtn = document.getElementById('btn-test-n8n');
  const testIcon = document.getElementById('n8n-test-icon');
  const testLabel = document.getElementById('n8n-test-label');
  const badge = document.getElementById('n8n-status-badge');

  if (!webhookUrl) {
    showToast('Masukkan URL Webhook n8n terlebih dahulu.', 'error');
    return;
  }

  if (!webhookUrl.startsWith('http://') && !webhookUrl.startsWith('https://')) {
    showToast('URL Webhook tidak valid. Harus dimulai dengan http:// atau https://', 'error');
    return;
  }

  // Set loading state
  testBtn.disabled = true;
  testLabel.textContent = 'Menguji...';
  testIcon.innerHTML = `<circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" fill="none" stroke-dasharray="30" stroke-dashoffset="0" style="animation:spin 1s linear infinite;transform-origin:center;"></circle>`;
  testIcon.setAttribute('viewBox', '0 0 24 24');

  const authHeader = (document.getElementById('n8n-auth-header')?.value || '').trim();
  const headers = { 'Content-Type': 'application/json' };
  if (authHeader) headers['Authorization'] = authHeader;

  const payload = {
    event: 'test_connection',
    client: 'PR Media Monitoring - Pusri Palembang',
    timestamp: new Date().toISOString(),
    version: '2.4.0'
  };

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10000)
    });

    testBtn.disabled = false;

    if (response.ok) {
      // Success state
      testLabel.textContent = 'Berhasil!';
      testIcon.innerHTML = `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"></path>`;
      testBtn.style.borderColor = 'var(--color-positive)';
      testBtn.style.color = 'var(--color-positive)';

      if (badge) {
        badge.textContent = '• Terhubung';
        badge.style.background = '#dcfce7';
        badge.style.color = '#16a34a';
      }

      showToast(`Koneksi ke n8n berhasil! Status: ${response.status} ${response.statusText}`);

      // Reset button after 3s
      setTimeout(() => {
        testLabel.textContent = 'Uji Koneksi';
        testIcon.innerHTML = `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>`;
        testBtn.style.borderColor = '';
        testBtn.style.color = '';
      }, 3000);
    } else {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
  } catch (err) {
    testBtn.disabled = false;
    testLabel.textContent = 'Gagal!';
    testIcon.innerHTML = `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>`;
    testBtn.style.borderColor = 'var(--color-negative)';
    testBtn.style.color = 'var(--color-negative)';

    if (badge) {
      badge.textContent = '• Gagal Terhubung';
      badge.style.background = '#fee2e2';
      badge.style.color = '#dc2626';
    }

    const isTimeout = err.name === 'TimeoutError' || err.message.includes('timeout');
    const errorMsg = isTimeout
      ? 'Koneksi timeout (10 detik). Pastikan URL webhook n8n aktif dan dapat diakses.'
      : `Koneksi gagal: ${err.message}. Periksa URL dan pastikan n8n sedang berjalan.`;
    showToast(errorMsg, 'error');

    // Reset button after 4s
    setTimeout(() => {
      testLabel.textContent = 'Uji Koneksi';
      testIcon.innerHTML = `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>`;
      testBtn.style.borderColor = '';
      testBtn.style.color = '';
    }, 4000);
  }
}

/* ============================================
   8. COLLECT SETTINGS FROM FORM
   ============================================ */
function collectSettings() {
  // Collect RSS feeds
  const feedItems = document.querySelectorAll('#rss-feeds-list .settings-list-item');
  const rssFeeds = [];
  feedItems.forEach(item => {
    const url = item.getAttribute('data-rss-url');
    if (url) rssFeeds.push(url);
    else {
      // For static items without data-rss-url, get text from span
      const span = item.querySelector('.settings-list-item-left span');
      if (span) rssFeeds.push(span.textContent.trim());
    }
  });

  return {
    // Profile fields (Name, Email, Role, Dept) are now read-only and managed by Google/System
    // so we don't need to collect or save them to localStorage.

    // RSS
    rssFeeds,

    // Google Sheets
    googleSheetsUrl: document.getElementById('google-sheets-url')?.value || DEFAULT_SHEETS_URL,

    // Telegram
    telegramEnabled: document.getElementById('telegram-toggle')?.checked ?? true,
    telegramBotToken: document.getElementById('telegram-bot-token')?.value || '',
    telegramChatId: document.getElementById('telegram-chat-id')?.value || '',



    // Notifications
    alertThreshold: document.getElementById('alert-threshold-select')?.value || '20',

    // n8n
    n8nWebhookUrl: document.getElementById('n8n-webhook-url')?.value || '',
    n8nAutoSync: document.getElementById('n8n-autosync-toggle')?.checked ?? false,
    n8nAuthHeader: document.getElementById('n8n-auth-header')?.value || '',

    // Notifications Settings
    notifDailyEmail: document.getElementById('notif-daily-email-toggle')?.checked ?? true,
    notifWeeklyEmail: document.getElementById('notif-weekly-email-toggle')?.checked ?? true,
    notifBrowserPush: document.getElementById('notif-browser-push-toggle')?.checked ?? false,

    // Meta
    savedAt: new Date().toISOString()
  };
}

/* ============================================
   9. SEND SETTINGS TO N8N WEBHOOK
   ============================================ */
async function sendSettingsToN8n(settings) {
  const webhookUrl = settings.n8nWebhookUrl;
  if (!webhookUrl || !webhookUrl.startsWith('http')) return;

  const headers = { 'Content-Type': 'application/json' };
  if (settings.n8nAuthHeader) headers['Authorization'] = settings.n8nAuthHeader;

  const payload = {
    event: 'settings_saved',
    client: 'PR Media Monitoring - Pusri Palembang',
    timestamp: settings.savedAt,
    configuration: {
      googleSheetsUrl: settings.googleSheetsUrl,
      rssFeeds: settings.rssFeeds,
      telegramEnabled: settings.telegramEnabled,
      telegramChatId: settings.telegramChatId,
      alertThreshold: parseInt(settings.alertThreshold, 10)
    }
  };

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(8000)
    });

    if (response.ok) {
      showToast('Konfigurasi berhasil disinkronkan ke n8n!');
    } else {
      showToast(`Konfigurasi tersimpan, tapi n8n merespons: ${response.status}`, 'warning');
    }
  } catch (err) {
    console.warn('[Settings] Failed to send config to n8n:', err);
    showToast('Konfigurasi tersimpan lokal, tapi gagal sinkron ke n8n. Periksa koneksi.', 'warning');
  }
}

/* ============================================
   10. SAVE SETTINGS ACTION WITH TOAST FEEDBACK
   ============================================ */
function initSaveButton() {
  const saveBtn = document.getElementById('btn-save-settings');
  if (!saveBtn) return;

  saveBtn.addEventListener('click', async () => {
    saveBtn.disabled = true;
    const originalContent = saveBtn.innerHTML;

    // Animate saving...
    saveBtn.innerHTML = `
      <svg style="width:16px;height:16px;animation:spin 1s linear infinite;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 8H18"></path></svg>
      Menyimpan...
    `;

    // Collect all settings from form
    const settings = collectSettings();

    // Persist to localStorage
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));

      // Also persist Google Sheets URL to a separate key for app.js to read
      localStorage.setItem('pusri_sheets_csv_url', settings.googleSheetsUrl);
    } catch (err) {
      console.error('[Settings] Failed to save to localStorage:', err);
    }

    // If n8n auto-sync is enabled, send payload to webhook
    if (settings.n8nAutoSync && settings.n8nWebhookUrl) {
      await sendSettingsToN8n(settings);
    } else {
      // Non-async path: wait a moment for UX
      await new Promise(resolve => setTimeout(resolve, 800));
    }

    saveBtn.disabled = false;
    saveBtn.innerHTML = originalContent;

    if (!settings.n8nAutoSync) {
      showToast('Konfigurasi sistem berhasil disimpan!');
    }
  });
}

/* ============================================
   11. CUSTOM TOAST NOTIFICATION HELPERS
   ============================================ */
/**
 * @param {string} message
 * @param {'success'|'error'|'warning'} type
 */
function showToast(message, type = 'success') {
  // Remove existing toasts
  const existingToast = document.querySelector('.settings-toast');
  if (existingToast) existingToast.remove();

  const iconMap = {
    success: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"></path>`,
    error:   `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"></path>`,
    warning: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z"></path>`
  };
  const colorMap = {
    success: 'var(--color-positive)',
    error:   'var(--color-negative)',
    warning: '#f59e0b'
  };

  const toast = document.createElement('div');
  toast.className = 'settings-toast animate-fade-in-up';
  if (type === 'error') {
    toast.style.background = '#1f2937';
    toast.style.borderColor = 'rgba(239,68,68,0.3)';
  } else if (type === 'warning') {
    toast.style.background = '#1f2937';
    toast.style.borderColor = 'rgba(245,158,11,0.3)';
  }

  toast.innerHTML = `
    <svg fill="none" stroke="${colorMap[type]}" viewBox="0 0 24 24">${iconMap[type]}</svg>
    <span>${message}</span>
  `;

  document.body.appendChild(toast);

  // Auto-remove toast
  const duration = type === 'error' ? 5000 : 3500;
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px) translateX(-50%)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

/* ============================================
   12. NOTIFICATIONS TOGGLE LOGIC
   ============================================ */
function initNotifications() {
  const browserPushToggle = document.getElementById('notif-browser-push-toggle');
  
  if (browserPushToggle) {
    browserPushToggle.addEventListener('change', (e) => {
      if (e.target.checked) {
        // If user turns on browser notifications, request permission
        if (!('Notification' in window)) {
          showToast('Browser Anda tidak mendukung notifikasi web.', 'error');
          e.target.checked = false;
        } else if (Notification.permission === 'granted') {
          showToast('Notifikasi browser sudah diizinkan.');
        } else if (Notification.permission !== 'denied') {
          Notification.requestPermission().then(permission => {
            if (permission === 'granted') {
              showToast('Izin notifikasi browser berhasil diberikan.');
            } else {
              showToast('Izin notifikasi ditolak oleh Anda.', 'warning');
              e.target.checked = false;
            }
          });
        } else {
          showToast('Izin notifikasi sebelumnya telah diblokir di browser ini.', 'error');
          e.target.checked = false;
        }
      }
    });
  }
}
