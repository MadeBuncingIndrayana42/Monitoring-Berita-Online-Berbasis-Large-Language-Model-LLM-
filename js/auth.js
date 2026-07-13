/* ============================================
   PR Dashboard - Media Monitoring
   Authentication Logic (auth.js)
   Google OAuth 2.0 with GIS Library
   ============================================ */

const AUTH_CONFIG = {
  // Client ID dibaca dari js/config.js (file ini di-gitignore, tidak diunggah ke GitHub)
  // Salin js/config.example.js → js/config.js dan isi nilai CLIENT_ID Anda
  clientId: (typeof APP_CONFIG !== 'undefined' && APP_CONFIG.GOOGLE_CLIENT_ID)
    ? APP_CONFIG.GOOGLE_CLIENT_ID
    : '',
  sessionKey: 'pusri_auth_session',
  allowedDomainsKey: 'pusri_allowed_domains',
  // Session expires after 8 hours
  sessionDurationMs: 8 * 60 * 60 * 1000
};

/* ============================================
   1. SESSION MANAGEMENT
   ============================================ */

/**
 * Check if user is currently authenticated with a valid session
 * @returns {boolean}
 */
function isAuthenticated() {
  const session = getSession();
  if (!session) return false;

  // Check expiry
  if (Date.now() > session.expiresAt) {
    clearSession();
    return false;
  }

  return true;
}

/**
 * Get the current user session object
 * @returns {object|null} { name, email, picture, domain, loginAt, expiresAt }
 */
function getSession() {
  try {
    const raw = localStorage.getItem(AUTH_CONFIG.sessionKey);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}

/**
 * Save a user session to localStorage
 * @param {object} userData - { name, email, picture }
 */
function saveSession(userData) {
  const session = {
    name: userData.name,
    email: userData.email,
    picture: userData.picture || '',
    domain: userData.email.split('@')[1] || '',
    loginAt: Date.now(),
    expiresAt: Date.now() + AUTH_CONFIG.sessionDurationMs
  };
  localStorage.setItem(AUTH_CONFIG.sessionKey, JSON.stringify(session));
}

/**
 * Clear the current session (logout)
 */
function clearSession() {
  localStorage.removeItem(AUTH_CONFIG.sessionKey);
}

/* ============================================
   2. DOMAIN ALLOWLIST MANAGEMENT
   ============================================ */

/**
 * Get the list of allowed email domains
 * Returns empty array if no restriction (all domains allowed)
 * @returns {string[]}
 */
function getAllowedDomains() {
  try {
    const raw = localStorage.getItem(AUTH_CONFIG.allowedDomainsKey);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (e) {
    return [];
  }
}

/**
 * Set the list of allowed email domains
 * Pass empty array to allow all domains
 * @param {string[]} domains - e.g. ['pusri.co.id', 'gmail.com']
 */
function setAllowedDomains(domains) {
  localStorage.setItem(AUTH_CONFIG.allowedDomainsKey, JSON.stringify(domains));
}

/**
 * Add a domain to the allowlist
 * @param {string} domain
 */
function addAllowedDomain(domain) {
  const domains = getAllowedDomains();
  const clean = domain.trim().toLowerCase();
  if (clean && !domains.includes(clean)) {
    domains.push(clean);
    setAllowedDomains(domains);
  }
}

/**
 * Remove a domain from the allowlist
 * @param {string} domain
 */
function removeAllowedDomain(domain) {
  const domains = getAllowedDomains();
  const clean = domain.trim().toLowerCase();
  setAllowedDomains(domains.filter(d => d !== clean));
}

/**
 * Check if an email is allowed based on domain allowlist
 * @param {string} email
 * @returns {boolean}
 */
function isEmailAllowed(email) {
  const domains = getAllowedDomains();
  // If no domains configured, allow all
  if (domains.length === 0) return true;

  const emailDomain = email.split('@')[1]?.toLowerCase();
  return domains.includes(emailDomain);
}

/* ============================================
   3. AUTH GUARD (for protected pages)
   ============================================ */

/**
 * Call this at the top of every protected page.
 * Redirects to login.html if user is not authenticated.
 */
function checkAuthGuard() {
  // Don't guard the login page itself
  const currentPage = window.location.pathname.split('/').pop() || '';
  if (currentPage === 'login.html') return;

  if (!isAuthenticated()) {
    window.location.replace('login.html');
  }
}

/* ============================================
   4. GOOGLE SIGN-IN HANDLING
   ============================================ */

/**
 * Decode a JWT token payload (base64url)
 * @param {string} token
 * @returns {object}
 */
function decodeJwtPayload(token) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64).split('').map(c =>
        '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
      ).join('')
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    console.error('Failed to decode JWT:', e);
    return null;
  }
}

/**
 * Handle the Google Sign-In credential response
 * @param {object} response - Google credential response
 */
function handleGoogleCredentialResponse(response) {
  const loadingEl = document.getElementById('login-loading');
  const errorEl = document.getElementById('login-error');
  const errorTextEl = document.getElementById('login-error-text');
  const btnEl = document.getElementById('btn-google-signin');

  // Show loading
  if (loadingEl) loadingEl.style.display = 'flex';
  if (errorEl) errorEl.style.display = 'none';
  if (btnEl) btnEl.style.display = 'none';

  const payload = decodeJwtPayload(response.credential);

  if (!payload) {
    showLoginError('Gagal memverifikasi kredensial Google. Silakan coba lagi.');
    return;
  }

  const userData = {
    name: payload.name,
    email: payload.email,
    picture: payload.picture
  };

  // Check domain allowlist
  if (!isEmailAllowed(userData.email)) {
    showLoginError(
      `Akses ditolak. Email "${userData.email}" tidak termasuk dalam daftar domain yang diizinkan. Hubungi administrator.`
    );
    return;
  }

  // Save session and redirect
  saveSession(userData);

  // Brief delay for UX
  setTimeout(() => {
    window.location.href = 'index.html';
  }, 600);
}

/**
 * Show an error message on the login page
 * @param {string} message
 */
function showLoginError(message) {
  const loadingEl = document.getElementById('login-loading');
  const errorEl = document.getElementById('login-error');
  const errorTextEl = document.getElementById('login-error-text');
  const btnEl = document.getElementById('btn-google-signin');

  if (loadingEl) loadingEl.style.display = 'none';
  if (btnEl) btnEl.style.display = 'flex';
  if (errorEl) {
    errorEl.style.display = 'flex';
    if (errorTextEl) errorTextEl.textContent = message;
  }
}

/**
 * Initialize the login page — sets up Google Sign-In button click handler
 */
function initLoginPage() {
  const btn = document.getElementById('btn-google-signin');
  if (!btn) return;

  // Wait for the Google Identity Services library to load
  function waitForGoogle(attempts) {
    if (typeof google !== 'undefined' && google.accounts) {
      // Initialize the GIS client
      google.accounts.id.initialize({
        client_id: AUTH_CONFIG.clientId,
        callback: handleGoogleCredentialResponse,
        auto_select: false,
        cancel_on_tap_outside: true
      });

      // Attach click handler to our custom button
      btn.addEventListener('click', () => {
        // Use Google's prompt (One Tap) flow
        google.accounts.id.prompt((notification) => {
          if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
            // Fallback: render the standard Google button in a hidden container and click it
            // Or use the popup flow via google.accounts.oauth2
            renderFallbackSignIn();
          }
        });
      });

    } else if (attempts > 0) {
      setTimeout(() => waitForGoogle(attempts - 1), 200);
    } else {
      console.error('Google Identity Services failed to load.');
      showLoginError('Layanan Google Sign-In gagal dimuat. Periksa koneksi internet Anda.');
    }
  }

  waitForGoogle(25); // Try for 5 seconds
}

/**
 * Fallback: Render Google's official sign-in button in a hidden div and trigger it
 */
function renderFallbackSignIn() {
  let container = document.getElementById('g-signin-fallback');
  if (!container) {
    container = document.createElement('div');
    container.id = 'g-signin-fallback';
    container.style.position = 'fixed';
    container.style.top = '50%';
    container.style.left = '50%';
    container.style.transform = 'translate(-50%, -50%)';
    container.style.zIndex = '10000';
    container.style.background = 'white';
    container.style.padding = '32px';
    container.style.borderRadius = '16px';
    container.style.boxShadow = '0 20px 60px rgba(0,0,0,0.3)';
    document.body.appendChild(container);

    // Add overlay
    const overlay = document.createElement('div');
    overlay.id = 'g-signin-overlay';
    overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);z-index:9999;';
    overlay.addEventListener('click', () => {
      overlay.remove();
      container.remove();
    });
    document.body.insertBefore(overlay, container);
  }

  google.accounts.id.renderButton(container, {
    type: 'standard',
    theme: 'outline',
    size: 'large',
    text: 'signin_with',
    shape: 'rectangular',
    width: 300
  });
}

/* ============================================
   5. LOGOUT
   ============================================ */

/**
 * Perform logout: clear session, revoke Google token, redirect to login
 */
function handleLogout() {
  // Revoke Google session if available
  try {
    if (typeof google !== 'undefined' && google.accounts) {
      const session = getSession();
      if (session && session.email) {
        google.accounts.id.revoke(session.email, () => {
          console.log('Google session revoked.');
        });
      }
    }
  } catch (e) {
    // Ignore revoke errors
  }

  clearSession();
  window.location.replace('login.html');
}

/* ============================================
   6. SESSION DISPLAY HELPERS (used by app.js topbar)
   ============================================ */

/**
 * Get the logged-in user's display name, or a fallback
 * @returns {string}
 */
function getSessionName() {
  const session = getSession();
  return session ? session.name : 'Pengguna';
}

/**
 * Get the logged-in user's email, or a fallback
 * @returns {string}
 */
function getSessionEmail() {
  const session = getSession();
  return session ? session.email : '';
}

/**
 * Get initials from a name (e.g. "John Doe" -> "JD")
 * @param {string} name
 * @returns {string}
 */
function getInitials(name) {
  if (!name) return '??';
  return name
    .split(' ')
    .map(w => w.charAt(0).toUpperCase())
    .slice(0, 2)
    .join('');
}

/**
 * Generate avatar HTML — uses Google profile picture if available,
 * otherwise falls back to initials
 * @param {string} className - optional CSS class override (e.g. 'avatar bg-blue')
 * @returns {string} HTML string
 */
function getSessionAvatarHTML(className) {
  const session = getSession();

  if (session && session.picture) {
    // Use Google profile photo
    if (className) {
      return `<img src="${session.picture}" alt="${session.name}" class="${className}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">`;
    }
    return `<img src="${session.picture}" alt="${session.name}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">`;
  }

  // Fallback to initials
  const initials = session ? getInitials(session.name) : 'AP';
  if (className) {
    return `<div class="${className}">${initials}</div>`;
  }
  return `<span>${initials}</span>`;
}

