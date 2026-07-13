/* ============================================
   PR Dashboard - Media Monitoring
   Global JavaScript (app.js)
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {
  // Auth guard: redirect to login if not authenticated
  checkAuthGuard();

  initClock();
  initSidebar();
  initMobileMenu();
});

/* ============================================
   1. REAL-TIME CLOCK
   ============================================ */
let clockIntervalId = null;
function initClock() {
  const clockEl = document.getElementById('topbar-clock-time');
  if (!clockEl) return;

  function updateClock() {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    clockEl.textContent = `${hours}:${minutes}:${seconds}`;
  }

  updateClock();
  if (clockIntervalId) clearInterval(clockIntervalId);
  clockIntervalId = setInterval(updateClock, 1000);
}

/* ============================================
   2. SIDEBAR NAVIGATION - ACTIVE STATE
   ============================================ */
function initSidebar() {
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  const navItems = document.querySelectorAll('.sidebar-nav-item[data-page]');

  navItems.forEach(item => {
    const page = item.getAttribute('data-page');

    // Match current page
    if (page === currentPage ||
        (currentPage === '' && page === 'index.html') ||
        (currentPage === 'Media Monitoring' && page === 'index.html') ||
        (currentPage === 'Media Monitoring/' && page === 'index.html')) {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }
  });
}

/* ============================================
   3. MOBILE SIDEBAR TOGGLE
   ============================================ */
function initMobileMenu() {
  const hamburger = document.getElementById('hamburger-btn');
  const sidebar = document.querySelector('.sidebar');
  const overlay = document.querySelector('.sidebar-overlay');

  if (!hamburger || !sidebar) return;

  hamburger.addEventListener('click', () => {
    sidebar.classList.toggle('open');
    if (overlay) overlay.classList.toggle('active');
  });

  // Close sidebar when clicking overlay
  if (overlay) {
    overlay.addEventListener('click', () => {
      sidebar.classList.remove('open');
      overlay.classList.remove('active');
    });
  }

  // Close sidebar on ESC key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      sidebar.classList.remove('open');
      if (overlay) overlay.classList.remove('active');
    }
  });
}

/* ============================================
   4. UTILITY FUNCTIONS (Shared)
   ============================================ */

/**
 * Generate an avatar with initials
 * @param {string} name - Full name
 * @param {string} colorClass - CSS class for color (avatar-blue, avatar-green, etc.)
 * @param {string} size - 'sm' | 'md' | 'lg'
 * @returns {string} HTML string
 */
function createAvatar(name, colorClass = 'avatar-blue', size = '') {
  const initials = name
    .split(' ')
    .map(word => word.charAt(0).toUpperCase())
    .slice(0, 2)
    .join('');

  const sizeClass = size ? `avatar-${size}` : '';
  return `<div class="avatar ${colorClass} ${sizeClass}">${initials}</div>`;
}

/**
 * Format number with thousand separator
 * @param {number} num
 * @returns {string}
 */
function formatNumber(num) {
  return new Intl.NumberFormat('id-ID').format(num);
}

/**
 * Get sentiment badge HTML
 * @param {string} sentiment - 'Positif' | 'Negatif' | 'Netral'
 * @returns {string} HTML string
 */
function getSentimentBadge(sentiment) {
  const normalized = sentiment?.trim() || 'Netral';
  let badgeClass = 'badge-neutral';

  if (normalized === 'Positif') badgeClass = 'badge-positive';
  else if (normalized === 'Negatif') badgeClass = 'badge-negative';

  return `<span class="badge ${badgeClass}">${normalized}</span>`;
}

/**
 * Get recommendation section HTML based on sentiment
 * @param {string} sentiment
 * @param {string} text - Recommendation text
 * @returns {string} HTML string
 */
function getRecommendationHTML(sentiment, text) {
  const normalized = sentiment?.trim() || 'Netral';
  let recClass, iconSVG, title;

  if (normalized === 'Positif') {
    recClass = 'rec-positive';
    title = 'Rekomendasi Tindakan PR';
    iconSVG = `<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>`;
  } else if (normalized === 'Negatif') {
    recClass = 'rec-negative';
    title = 'Penanganan Krisis Segera';
    iconSVG = `<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z"></path></svg>`;
  } else {
    recClass = 'rec-neutral';
    title = 'Monitor & Observasi';
    iconSVG = `<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>`;
  }

  return `
    <div class="news-card-recommendation ${recClass}">
      <div class="news-card-recommendation-header">
        ${iconSVG}
        <p>${title}</p>
      </div>
      <p class="news-card-recommendation-text">${text || '-'}</p>
    </div>
  `;
}

/* ============================================
   5. SIDEBAR HTML TEMPLATE
   ============================================ */

/**
 * Returns the full sidebar HTML
 * This is used across all pages for consistency
 */
function getSidebarHTML() {
  return `
    <div class="sidebar-logo">
      <div class="sidebar-logo-icon">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z">
          </path>
        </svg>
      </div>
      <div class="sidebar-logo-text">
        <h2>PR Dashboard</h2>
        <p>Media Monitoring</p>
      </div>
    </div>

    <nav class="sidebar-nav">
      <a href="index.html" class="sidebar-nav-item" data-page="index.html">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"></path></svg>
        Dashboard
      </a>
      <a href="media-analysis.html" class="sidebar-nav-item" data-page="media-analysis.html">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg>
        Media Analysis
      </a>
      <a href="sentiment.html" class="sidebar-nav-item" data-page="sentiment.html">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
        Sentiment
      </a>
      <a href="stakeholders.html" class="sidebar-nav-item" data-page="stakeholders.html">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
        Stakeholders
      </a>
      <a href="reports.html" class="sidebar-nav-item" data-page="reports.html">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
        Reports
      </a>
    </nav>

    <div class="sidebar-footer">
      <a href="settings.html" class="sidebar-nav-item" data-page="settings.html">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
        Settings
      </a>
      <a href="help.html" class="sidebar-nav-item" data-page="help.html">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
        Help
      </a>
    </div>
  `;
}

/**
 * Returns the topbar HTML
 * @param {string} pageTitle - Main title
 * @param {string} pageSubtitle - Subtitle text
 */
function getTopbarHTML(pageTitle = 'Dashboard Monitoring Media', pageSubtitle = 'Sistem Analisis Sentimen PR PT Pupuk Sriwidjaja Palembang') {
  return `
    <div class="topbar-left">
      <button class="topbar-hamburger" id="hamburger-btn">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
      </button>
      <div class="topbar-divider"></div>
      <div class="topbar-title">
        <h1>${pageTitle}</h1>
        <p>${pageSubtitle}</p>
      </div>
    </div>

    <div class="topbar-right">
      <div class="topbar-clock">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
        <span id="topbar-clock-time">00:00:00</span>
      </div>
      
      <!-- Notification Dropdown -->
      <div class="topbar-dropdown-wrapper" id="notification-wrapper">
        <button class="topbar-icon-btn" id="notification-btn" title="Notifikasi">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path></svg>
          <span class="notification-badge" style="display: none;"></span>
        </button>
        <div class="topbar-dropdown" id="notification-dropdown">
          <div class="dropdown-header">
            <h3>Notifikasi Terbaru</h3>
            <button class="btn-clear-notif" id="clear-notifications">Tandai dibaca</button>
          </div>
          <div class="dropdown-list">
            <div class="dropdown-item unread">
              <div class="item-icon bg-red">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z"></path></svg>
              </div>
              <div class="item-content">
                <p class="item-title">Alert Krisis: Sentimen Negatif Melonjak</p>
                <p class="item-desc">Dugaan Penimbunan Stok Gudang terdeteksi di Sumeks.</p>
                <span class="item-time">10 menit yang lalu</span>
              </div>
            </div>
            <div class="dropdown-item unread">
              <div class="item-icon bg-red">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z"></path></svg>
              </div>
              <div class="item-content">
                <p class="item-title">Isu Lapangan Terdeteksi</p>
                <p class="item-desc">Isu Kelangkaan Pupuk Urea di Tribun Sumsel.</p>
                <span class="item-time">1 jam yang lalu</span>
              </div>
            </div>
            <div class="dropdown-item">
              <div class="item-icon bg-blue">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
              </div>
              <div class="item-content">
                <p class="item-title">Laporan Bulanan Siap</p>
                <p class="item-desc">Laporan analisis PR periode Mei 2026 telah dibuat.</p>
                <span class="item-time">3 jam yang lalu</span>
              </div>
            </div>
          </div>
          <div class="dropdown-footer">
            <a href="reports.html">Lihat semua aktivitas</a>
          </div>
        </div>
      </div>
      
      <!-- Avatar Dropdown -->
      <div class="topbar-dropdown-wrapper" id="avatar-wrapper">
        <div class="topbar-avatar" id="avatar-btn" title="Profile">
          ${getSessionAvatarHTML()}
        </div>
        <div class="topbar-dropdown dropdown-right" id="avatar-dropdown">
          <div class="dropdown-profile-header">
            ${getSessionAvatarHTML('avatar bg-blue')}
            <div class="profile-info">
              <h4>${getSessionName()}</h4>
              <p>${getSessionEmail()}</p>
            </div>
          </div>
          <div class="dropdown-divider"></div>
          <a href="settings.html?tab=profile" class="dropdown-link-item">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
            Profil Saya
          </a>
          <a href="settings.html" class="dropdown-link-item">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
            Pengaturan Sistem
          </a>
          <a href="help.html" class="dropdown-link-item">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            Bantuan & Panduan
          </a>
          <div class="dropdown-divider"></div>
          <a href="#" class="dropdown-link-item logout-link" id="btn-real-logout">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
            Keluar (Logout)
          </a>
        </div>
      </div>
    </div>
  `;
}

/* ============================================
   6. DYNAMIC LAYOUT INJECTION
   ============================================ */

/**
 * Initialize the page layout by injecting sidebar and topbar
 * Call this at the top of each page-specific JS
 */
function initLayout(pageTitle, pageSubtitle) {
  const sidebar = document.querySelector('.sidebar');
  const topbar = document.querySelector('.topbar');

  if (sidebar) {
    sidebar.innerHTML = getSidebarHTML();
    // Initialize sidebar interactions and active highlights
    initSidebar();
    initMobileMenu();
  }
  if (topbar) {
    topbar.innerHTML = getTopbarHTML(pageTitle, pageSubtitle);
    // Dynamic topbar actions
    initClock();
    initTopbarInteractions();
    
    // Start background sync for notifications (if not started already)
    startAutoSync();
  }

  // Inject Sync status CSS styles
  injectSyncStyles();
}

function getReadArticles() {
  try {
    return JSON.parse(localStorage.getItem('readArticleUrls') || '[]');
  } catch (e) {
    return [];
  }
}

function markArticlesAsRead(urls) {
  const read = getReadArticles();
  urls.forEach(url => {
    if (!read.includes(url)) read.push(url);
  });
  localStorage.setItem('readArticleUrls', JSON.stringify(read));
}

function initTopbarInteractions() {
  const notifBtn = document.getElementById('notification-btn');
  const notifDropdown = document.getElementById('notification-dropdown');
  const avatarBtn = document.getElementById('avatar-btn');
  const avatarDropdown = document.getElementById('avatar-dropdown');
  const clearNotifBtn = document.getElementById('clear-notifications');
  const badge = document.querySelector('.notification-badge');
  const logoutBtn = document.getElementById('btn-real-logout');

  if (notifBtn && notifDropdown) {
    notifBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      notifDropdown.classList.toggle('show');
      if (avatarDropdown) avatarDropdown.classList.remove('show');
    });
  }

  if (avatarBtn && avatarDropdown) {
    avatarBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      avatarDropdown.classList.toggle('show');
      if (notifDropdown) notifDropdown.classList.remove('show');
    });
  }

  // Click outside to close dropdowns
  document.addEventListener('click', () => {
    if (notifDropdown) notifDropdown.classList.remove('show');
    if (avatarDropdown) avatarDropdown.classList.remove('show');
  });

  // Clear notification badge
  if (clearNotifBtn) {
    clearNotifBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (badge) badge.style.display = 'none';
      document.querySelectorAll('.dropdown-item.unread').forEach(item => {
        item.classList.remove('unread');
      });

      // Persist all negative news URLs as read
      try {
        const data = currentCachedDataJSON ? JSON.parse(currentCachedDataJSON) : [];
        const negativeUrls = data
          .filter(row => row['Sentimen']?.trim() === 'Negatif' && row['URL asli'])
          .map(row => row['URL asli']);
        markArticlesAsRead(negativeUrls);
      } catch (err) {
        console.error(err);
      }
    });
  }

  // Real logout via auth.js
  if (logoutBtn) {
    logoutBtn.addEventListener('click', (e) => {
      e.preventDefault();
      if (typeof handleLogout === 'function') {
        handleLogout();
      } else {
        // Fallback if auth.js is not loaded
        localStorage.removeItem('pusri_auth_session');
        window.location.replace('login.html');
      }
    });
  }
}

function injectSyncStyles() {
  if (document.getElementById('topbar-sync-styles')) return;
  const style = document.createElement('style');
  style.id = 'topbar-sync-styles';
  style.textContent = `
    .topbar-sync-status {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: var(--font-xs);
      color: var(--color-text-light);
      background: var(--color-bg-light);
      padding: var(--space-1) var(--space-3);
      border-radius: var(--radius-full);
      cursor: pointer;
      transition: all var(--transition-fast);
      border: 1px solid var(--color-border);
      user-select: none;
    }
    .topbar-sync-status:hover {
      background: var(--color-border-light);
      color: var(--color-text-medium);
    }
    .topbar-sync-status.syncing .sync-icon {
      animation: spin-sync 1s linear infinite;
    }
    @keyframes spin-sync {
      100% { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(style);
}

/* ============================================
   7. GOOGLE SHEETS SYNC ENGINE
   ============================================ */
// URL CSV dibaca dari js/config.js (di-gitignore). Salin dari config.example.js.
const SHEET_CSV_URL_DEFAULT = (typeof APP_CONFIG !== 'undefined' && APP_CONFIG.GOOGLE_SHEETS_CSV_URL)
  ? APP_CONFIG.GOOGLE_SHEETS_CSV_URL
  : '';

/**
 * Reads the active Google Sheets CSV URL from localStorage (set by settings.js).
 * Falls back to the hardcoded default URL if nothing is stored or the stored value is invalid.
 * @returns {string}
 */
function getSheetCsvUrl() {
  try {
    const stored = localStorage.getItem('pusri_sheets_csv_url');
    if (stored && (stored.startsWith('http://') || stored.startsWith('https://'))) {
      return stored;
    }
  } catch (e) {
    // localStorage might be unavailable in some contexts
  }
  return SHEET_CSV_URL_DEFAULT;
}

const FALLBACK_NEWS_DATA = [];

let syncIntervalId = null;
let currentCachedDataJSON = null;

function fetchAllNewsData(callback, errorCallback) {
  if (typeof Papa === 'undefined') {
    console.error('PapaParse library is not loaded!');
    if (errorCallback) errorCallback(new Error('PapaParse not loaded'));
    return;
  }

  Papa.parse(getSheetCsvUrl(), {
    download: true,
    header: true,
    skipEmptyLines: true,
    complete: function(results) {
      const errorStrings = ['#N/A', '#REF!', '#NAME?', '#VALUE!', '#DIV/0!', '#NUM!', '#ERROR!', '#NULL!'];
      
      const parseErrorRows = new Set(results.errors.map(err => err.row));

      const data = results.data.filter((row, index) => {
        if (parseErrorRows.has(index)) return false;

        if (!row['Judul Berita'] || row['Judul Berita'].trim() === '') return false;
        
        for (const key in row) {
          const val = String(row[key] || '').trim().toUpperCase();
          if (errorStrings.some(err => val.includes(err))) {
            return false;
          }
        }
        return true;
      });
      // Sort by date (Tanggal) to show newest first
      data.sort((a, b) => {
        const dateA = new Date(a['Tanggal']);
        const dateB = new Date(b['Tanggal']);
        const timeA = isNaN(dateA.getTime()) ? 0 : dateA.getTime();
        const timeB = isNaN(dateB.getTime()) ? 0 : dateB.getTime();
        return timeB - timeA;
      });
      callback(data);
    },
    error: function(err) {
      console.warn('Failed to fetch news data from Google Sheets, using fallback.', err);
      if (errorCallback) {
        errorCallback(err);
      } else {
        callback(FALLBACK_NEWS_DATA);
      }
    }
  });
}

let syncStarted = false;
const globalSyncCallbacks = [];
let knownArticleUrls = [];

function startAutoSync(onDataUpdated) {
  if (onDataUpdated) {
    globalSyncCallbacks.push(onDataUpdated);
  }

  // If sync has already run, execute this callback immediately with cached data (if available)
  if (syncStarted) {
    if (currentCachedDataJSON) {
      try {
        const data = JSON.parse(currentCachedDataJSON);
        if (onDataUpdated) onDataUpdated(data);
      } catch (e) {
        console.error(e);
      }
    }
    return;
  }

  syncStarted = true;

  const syncStatusText = document.getElementById('sync-status-text');
  const syncStatusEl = document.getElementById('topbar-sync-status');

  function updateStatusText(text) {
    if (syncStatusText) syncStatusText.textContent = text;
  }

  function triggerSync() {
    if (syncStatusEl) syncStatusEl.classList.add('syncing');
    updateStatusText('Menyinkronkan...');

    fetchAllNewsData(
      (data) => {
        if (syncStatusEl) syncStatusEl.classList.remove('syncing');
        
        const now = new Date();
        const timeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        updateStatusText(`Tersinkronisasi ${timeStr}`);

        // Update real-time notifications dropdown
        updateNotificationsList(data);

        const dataJSON = JSON.stringify(data);
        if (dataJSON !== currentCachedDataJSON) {
          currentCachedDataJSON = dataJSON;
          // Execute all page callbacks
          globalSyncCallbacks.forEach(cb => {
            try { cb(data); } catch(e) { console.error(e); }
          });
        }
      },
      (err) => {
        if (syncStatusEl) syncStatusEl.classList.remove('syncing');
        updateStatusText('Gagal sinkron');
        
        // If offline and no cache yet, draw fallback data
        if (currentCachedDataJSON === null) {
          currentCachedDataJSON = JSON.stringify(FALLBACK_NEWS_DATA);
          updateNotificationsList(FALLBACK_NEWS_DATA);
          globalSyncCallbacks.forEach(cb => {
            try { cb(FALLBACK_NEWS_DATA); } catch(e) { console.error(e); }
          });
        }
      }
    );
  }

  if (syncStatusEl) {
    // Prevent duplicate listeners by removing old one
    syncStatusEl.replaceWith(syncStatusEl.cloneNode(true));
    const newSyncEl = document.getElementById('topbar-sync-status');
    newSyncEl.addEventListener('click', triggerSync);
  }

  // First execution
  triggerSync();

  // Reset sync interval
  if (syncIntervalId) clearInterval(syncIntervalId);
  syncIntervalId = setInterval(triggerSync, 60000);
}

/* ============================================
   7A. REAL-TIME NOTIFICATION ENGINE
   ============================================ */
function updateNotificationsList(data) {
  const dropdownList = document.querySelector('#notification-dropdown .dropdown-list');
  const badge = document.querySelector('.notification-badge');
  if (!dropdownList) return;

  // Filter negative news
  const negativeNews = data.filter(row => row['Sentimen']?.trim() === 'Negatif');
  const readUrls = getReadArticles();
  
  // First load populate known articles list to prevent retro-alerts
  const isFirstLoad = (knownArticleUrls.length === 0);
  
  if (isFirstLoad) {
    data.forEach(row => {
      if (row['URL asli']) knownArticleUrls.push(row['URL asli']);
    });
  }

  // Check for any NEW negative news (not known, and not read yet)
  let newNegativeCount = 0;
  negativeNews.forEach(row => {
    const url = row['URL asli'];
    if (url) {
      if (!knownArticleUrls.includes(url)) {
        knownArticleUrls.push(url);
        // Only trigger audio/toast popup if it's not the initial page load AND is not already read
        if (!isFirstLoad && !readUrls.includes(url)) {
          showRealtimeNotificationAlert(row);
          newNegativeCount++;
        }
      }
    }
  });

  // Calculate unread items
  const unreadNegativeNews = negativeNews.filter(row => row['URL asli'] && !readUrls.includes(row['URL asli']));

  // Populate list with the latest 5 negative news
  const latestAlerts = negativeNews.slice(0, 5);
  
  if (latestAlerts.length === 0) {
    dropdownList.innerHTML = `
      <div style="text-align: center; padding: var(--space-6); color: var(--color-text-light);">
        <p>Tidak ada alert krisis saat ini.</p>
      </div>
    `;
    if (badge) badge.style.display = 'none';
    return;
  }

  dropdownList.innerHTML = latestAlerts.map(row => {
    const dateStr = row['Tanggal'] || 'Baru saja';
    const isUnread = row['URL asli'] && !readUrls.includes(row['URL asli']);
    const itemClass = isUnread ? 'dropdown-item unread' : 'dropdown-item';
    return `
      <div class="${itemClass}">
        <div class="item-icon bg-red">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z"></path></svg>
        </div>
        <div class="item-content">
          <p class="item-title">Alert Krisis: Sentimen Negatif</p>
          <p class="item-desc">${row['Judul Berita']}</p>
          <span class="item-time">${dateStr}</span>
        </div>
      </div>
    `;
  }).join('');

  // Show notification badge if there are unread items
  if (badge) {
    if (unreadNegativeNews.length > 0) {
      badge.style.display = 'block';
    } else {
      badge.style.display = 'none';
    }
  }
}

function showRealtimeNotificationAlert(row) {
  // Show a floating toast notification specifically for realtime alerts
  const alertToast = document.createElement('div');
  alertToast.className = 'realtime-alert-toast animate-fade-in-up';
  alertToast.innerHTML = `
    <div class="realtime-alert-header">
      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z"></path></svg>
      <h4>CRISIS DETECTED</h4>
    </div>
    <div class="realtime-alert-body">
      <p class="title">${row['Judul Berita']}</p>
      <p class="summary">${row['Ringkasan'] || 'Sentimen negatif terdeteksi.'}</p>
    </div>
  `;
  document.body.appendChild(alertToast);
  
  // Play subtle beep sound if browser allows
  try {
    const context = new (window.AudioContext || window.webkitAudioContext)();
    const osc = context.createOscillator();
    const gain = context.createGain();
    osc.connect(gain);
    gain.connect(context.destination);
    osc.frequency.value = 520;
    gain.gain.setValueAtTime(0.08, context.currentTime);
    osc.start();
    osc.stop(context.currentTime + 0.15);
  } catch (e) {
    // Ignore audio failures due to user gesture requirements
  }
  
  setTimeout(() => {
    alertToast.style.opacity = '0';
    alertToast.style.transform = 'translateY(20px) translateX(-50%)';
    alertToast.style.transition = 'all 0.4s ease';
    setTimeout(() => alertToast.remove(), 400);
  }, 6000);
}

/* ============================================
   8. DYNAMIC DATA EXTRACTORS & HELPERS
   ============================================ */

window.filterDataByTime = function(data, timeFilter) {
  if (!timeFilter || timeFilter === 'Semua') return data;
  const now = new Date();
  return data.filter(row => {
    if (!row['Tanggal'] || row['Tanggal'] === '-') return false;
    const d = new Date(row['Tanggal']);
    if (isNaN(d.getTime())) return false;
    const diffTime = now.getTime() - d.getTime();
    const diffDays = diffTime / (1000 * 60 * 60 * 24);
    if (timeFilter === 'Minggu') return diffDays >= 0 && diffDays <= 7;
    if (timeFilter === 'Bulan') return diffDays >= 0 && diffDays <= 30;
    if (timeFilter === 'Tahun') return d.getFullYear() === now.getFullYear();
    return true;
  });
};

function extractSource(row) {
  if (row['Sumber berita'] && row['Sumber berita'].trim() !== '') {
    return row['Sumber berita'].trim();
  }
  const title = row['Judul Berita'];
  if (!title) return 'Lainnya';
  const parts = title.split(' - ');
  if (parts.length > 1) {
    return parts[parts.length - 1].trim();
  }
  return 'Lainnya';
}

function classifyTopic(row) {
  const title = (row['Judul Berita'] || '').toLowerCase();
  const summary = (row['Ringkasan'] || '').toLowerCase();
  const sentiment = row['Sentimen'] || 'Netral';

  if (sentiment === 'Positif') {
    if (title.includes('kebakaran') || title.includes('bantuan') || title.includes('korban') || title.includes('1 ilir') || title.includes('material')) {
      return 'Penyaluran Bantuan Kebakaran 1 Ilir';
    }
    if (title.includes('csr') || title.includes('sosial') || title.includes('pendidikan') || title.includes('bantu')) {
      return 'Penyaluran Bantuan CSR & Sosial';
    }
    if (title.includes('panen') || title.includes('pertanian') || title.includes('tani')) {
      return 'Panen Raya & Sektor Pertanian';
    }
    if (title.includes('distribusi') || title.includes('lancar') || title.includes('pasok')) {
      return 'Distribusi Pupuk Lancar Terkendali';
    }
    if (title.includes('riset') || title.includes('npk') || title.includes('universitas') || title.includes('kerjasama')) {
      return 'Kerjasama Strategis & Riset NPK';
    }
    if (title.includes('digitalisasi') || title.includes('aplikasi') || title.includes('sistem')) {
      return 'Digitalisasi Rantai Pasok';
    }
    return 'Inisiatif Positif Perusahaan';
  } else if (sentiment === 'Negatif') {
    if (title.includes('langka') || title.includes('keterlambatan') || title.includes('lambat') || title.includes('sulit')) {
      return 'Isu Kelangkaan Pupuk Urea';
    }
    if (title.includes('mahal') || title.includes('pengecer') || title.includes('harga')) {
      return 'Keluhan Harga di Pengecer';
    }
    if (title.includes('palsu') || title.includes('npk palsu')) {
      return 'Temuan Peredaran Pupuk Palsu';
    }
    if (title.includes('timbun') || title.includes('stok') || title.includes('gudang')) {
      return 'Dugaan Penimbunan Stok';
    }
    if (title.includes('demo') || title.includes('protes')) {
      return 'Rencana Demo Kelompok Petani';
    }
    return 'Isu Lapangan & Operasional';
  } else {
    return 'Umum / Lain-lain';
  }
}

const STAKEHOLDERS_ROLES = {
  'Tri Wahyudi Saleh': 'Direktur Utama PT Pusri',
  'Herman Deru': 'Gubernur Sumatera Selatan',
  'Syahrul Yasin Limpo': 'Menteri Pertanian RI',
  'Warga Lokal': 'Perwakilan Masyarakat'
};

const STAKEHOLDERS_AVATARS = {
  'Tri Wahyudi Saleh': 'avatar-green',
  'Herman Deru': 'avatar-purple',
  'Syahrul Yasin Limpo': 'avatar-blue',
  'Warga Lokal': 'avatar-orange'
};

function getStakeholderInitials(name) {
  if (!name) return '??';
  return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
}

function detectStakeholder(row) {
  let tok = row['Tokoh terkait']?.trim() || '';
  if (tok && tok !== '-' && tok !== '') {
    return tok;
  }
  const title = (row['Judul Berita'] || '').toLowerCase();
  const summary = (row['Ringkasan'] || '').toLowerCase();
  if (title.includes('tri wahyudi') || title.includes('dirut pusri')) {
    return 'Tri Wahyudi Saleh';
  }
  if (title.includes('herman deru') || title.includes('gubernur sumsel') || title.includes('gubernur sumatera selatan')) {
    return 'Herman Deru';
  }
  if (title.includes('syahrul yasin') || title.includes('menteri pertanian') || title.includes('mentan')) {
    return 'Syahrul Yasin Limpo';
  }
  if (title.includes('warga') || title.includes('petani') || summary.includes('petani lokal')) {
    return 'Warga Lokal';
  }
  return null;
}
