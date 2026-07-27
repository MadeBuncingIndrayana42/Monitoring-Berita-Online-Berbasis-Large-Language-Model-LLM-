/* ============================================
   Stakeholders Page - stakeholders.js
   Dynamic calculations based on Google Sheet CSV ONLY (No Fake Data)
   ============================================ */

let allNewsData = [];
let tableSearchQuery = '';
let tableCurrentPage = 1;
const ITEMS_PER_PAGE = 5;

// Profile cards pagination
let profileCurrentPage = 1;
const PROFILES_PER_PAGE = 9;
let allProfileKeys = [];
let allProfilesData = {};

/* No hardcoded stakeholder template — built purely from CSV data */

document.addEventListener('DOMContentLoaded', () => {
  // Initialize shared layout (sidebar + topbar)
  initLayout('Stakeholder Analysis', 'Monitoring pengaruh dan sentimen tokoh kunci industri');

  setupSearchFilter();
  setupProfilePagination();

  // Apply filter change
  const timeSelect = document.getElementById('filter-time');
  if (timeSelect) {
    timeSelect.addEventListener('change', () => {
      const timeFilter = timeSelect.value;
      const filtered = window.filterDataByTime(allNewsData, timeFilter);
      updateStakeholdersPage(filtered);
    });
  }

  // Start background auto-sync polling
  startAutoSync((data) => {
    allNewsData = data;
    const timeFilter = timeSelect ? timeSelect.value : 'Semua';
    const filtered = window.filterDataByTime(data, timeFilter);
    updateStakeholdersPage(filtered);
  });
});

/* ============================================
   PAGE MAIN REPAINT
   ============================================ */
function updateStakeholdersPage(data) {
  // 1. Process data & calculate stakeholder stats (purely from CSV)
  const stakeholdersData = {};
  let sheetMentionsCount = 0;

  data.forEach(row => {
    const tokohList = detectStakeholdersLocal(row);
    if (!tokohList || tokohList.length === 0) return;

    const sent = row.Sentimen?.trim() || 'Netral';

    tokohList.forEach(tokohObj => {
      const tokoh = tokohObj.name;
      const roleFromSheet = tokohObj.role;

      const mentionScore = calculateTrendingScore(row.Tanggal);

      sheetMentionsCount++;
      if (stakeholdersData[tokoh]) {
        stakeholdersData[tokoh].mentions++;
        stakeholdersData[tokoh][sent]++;
        stakeholdersData[tokoh].trendingScore += mentionScore;
        if (roleFromSheet && roleFromSheet !== '' && stakeholdersData[tokoh].role === 'Tokoh Terkait') {
          stakeholdersData[tokoh].role = roleFromSheet;
        }
      } else {
        let finalRole = roleFromSheet || (typeof STAKEHOLDERS_ROLES !== 'undefined' && STAKEHOLDERS_ROLES[tokoh] ? STAKEHOLDERS_ROLES[tokoh] : 'Tokoh Terkait');
        if (!finalRole || finalRole === '') finalRole = 'Tokoh Terkait';

        // Dynamic entry for new stakeholder
        stakeholdersData[tokoh] = {
          name: tokoh,
          role: finalRole,
          avatarClass: typeof STAKEHOLDERS_AVATARS !== 'undefined' && STAKEHOLDERS_AVATARS[tokoh] ? STAKEHOLDERS_AVATARS[tokoh] : 'avatar-blue',
          initials: typeof getStakeholderInitials !== 'undefined' ? getStakeholderInitials(tokoh) : tokoh.substring(0, 2).toUpperCase(),
          mentions: 1,
          Positif: sent === 'Positif' ? 1 : 0,
          Netral: sent === 'Netral' ? 1 : 0,
          Negatif: sent === 'Negatif' ? 1 : 0,
          trendingScore: mentionScore
        };
      }
    });
  });

  // 2. Update Stats Cards
  updateStatsCards(stakeholdersData, sheetMentionsCount);

  // 3. Store profiles globally and render
  allProfilesData = stakeholdersData;
  allProfileKeys = Object.keys(stakeholdersData).filter(k => stakeholdersData[k].mentions > 0);
  profileCurrentPage = 1;
  renderProfileCards();

  // 4. Render Statements Table
  renderStatementsTable(data);
}

/* ============================================
   STATS CARDS DYNAMICS
   ============================================ */
function updateStatsCards(stakeholders, newMentions) {
  animateNumber('stat-kutipan', newMentions);

  // Determine top popular stakeholder based on Trending Score (Social Media Algorithm)
  let popularName = '';
  let maxScore = -1;
  
  Object.keys(stakeholders).forEach(key => {
    if (stakeholders[key].trendingScore > maxScore) {
      maxScore = stakeholders[key].trendingScore;
      popularName = key;
    }
  });

  const popEl = document.querySelector('.stats-grid .stat-card:nth-child(2) .stat-card-number');
  const popBadge = document.querySelector('.stats-grid .stat-card:nth-child(2) .badge-trending');
  
  if (popEl) {
    if (popularName !== '') {
      popEl.innerHTML = `
        ${stakeholders[popularName].name}
        <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" style="display: inline; vertical-align: middle;"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6"></path></svg>
      `;
      if (popBadge) popBadge.style.display = 'inline-flex';
    } else {
      popEl.textContent = '-';
      if (popBadge) popBadge.style.display = 'none';
    }
  }

  // Calculate sentiment for popular stakeholder
  let sentimentPct = 0;
  if (popularName && stakeholders[popularName].mentions > 0) {
    const popObj = stakeholders[popularName];
    sentimentPct = Math.round((popObj.Positif / popObj.mentions) * 100);
  }
  animateNumber('stat-sentimen', sentimentPct);

  // Animate progress bars
  setTimeout(() => {
    const kutipanBar = document.getElementById('stat-kutipan-bar');
    const sentimenBar = document.getElementById('stat-sentimen-bar');
    if (kutipanBar) {
      kutipanBar.style.width = newMentions > 0 ? '100%' : '0%';
    }
    if (sentimenBar) {
      sentimenBar.style.width = `${sentimentPct}%`;
    }
  }, 200);
}

function animateNumber(elementId, target) {
  const el = document.getElementById(elementId);
  if (!el) return;

  const duration = 600;
  const start = parseInt(el.textContent, 10) || 0;
  const startTime = performance.now();
  const suffix = elementId === 'stat-sentimen' ? '%' : '';

  function update(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);

    const eased = 1 - Math.pow(1 - progress, 3);
    const current = Math.floor(start + (target - start) * eased);

    el.textContent = current + suffix;

    if (progress < 1) {
      requestAnimationFrame(update);
    } else {
      el.textContent = target + suffix;
    }
  }

  requestAnimationFrame(update);
}

/* ============================================
   PROFILE CARDS RENDER (with pagination)
   ============================================ */
function renderProfileCards() {
  const container = document.querySelector('.profile-grid');
  if (!container) return;

  container.innerHTML = '';

  if (allProfileKeys.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1; padding: var(--space-6); text-align: center; background: var(--color-card); border: 1px solid var(--color-border); border-radius: var(--radius-xl); color: var(--color-text-light);">
        <p>Tidak ada tokoh/stakeholder terpantau dalam data sheet.</p>
      </div>
    `;
    updateProfilePaginationUI();
    return;
  }

  const totalPages = Math.ceil(allProfileKeys.length / PROFILES_PER_PAGE);
  if (profileCurrentPage > totalPages) profileCurrentPage = totalPages;
  if (profileCurrentPage < 1) profileCurrentPage = 1;

  const startIdx = (profileCurrentPage - 1) * PROFILES_PER_PAGE;
  const endIdx = Math.min(startIdx + PROFILES_PER_PAGE, allProfileKeys.length);
  const pageKeys = allProfileKeys.slice(startIdx, endIdx);

  pageKeys.forEach((key, idx) => {
    const s = allProfilesData[key];
    if (!s) return;

    let posPct = 0, neuPct = 0, negPct = 0;
    if (s.mentions > 0) {
      posPct = Math.round((s.Positif / s.mentions) * 100);
      neuPct = Math.round((s.Netral / s.mentions) * 100);
      negPct = 100 - posPct - neuPct;
    }

    const cardHtml = `
      <div class="profile-card" style="opacity: 0; animation: fadeInUp 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94) ${0.05 + idx * 0.08}s forwards;">
        <div class="profile-card-top">
          <div class="avatar ${s.avatarClass}">${s.initials}</div>
          <div>
            <div class="profile-card-name">${s.name}</div>
            <div class="profile-card-role">${s.role}</div>
          </div>
        </div>
        <div class="profile-card-stat">
          <span class="profile-card-stat-label">Total Mentions</span>
          <span class="profile-card-stat-value">${formatNumber(s.mentions)}</span>
        </div>
        <div class="profile-card-sentiment-label">Distribusi Sentimen</div>
        <div class="sentiment-bar">
          <div class="sentiment-bar-positive" style="width: 0%" data-width="${posPct}"></div>
          <div class="sentiment-bar-neutral" style="width: 0%" data-width="${neuPct}"></div>
          <div class="sentiment-bar-negative" style="width: 0%" data-width="${negPct}"></div>
        </div>
        <div class="sentiment-bar-labels">
          <span class="positive-label">${posPct}% Positif</span>
          <span>${neuPct}% Netral</span>
          <span class="negative-label">${negPct}% Negatif</span>
        </div>
      </div>
    `;
    container.insertAdjacentHTML('beforeend', cardHtml);
  });

  // Animate sentiment bars
  setTimeout(() => {
    const segments = document.querySelectorAll('.sentiment-bar-positive, .sentiment-bar-neutral, .sentiment-bar-negative');
    segments.forEach(seg => {
      const w = seg.getAttribute('data-width');
      if (w) seg.style.width = w + '%';
    });
  }, 200);

  updateProfilePaginationUI();
}

/* ============================================
   PROFILE PAGINATION UI
   ============================================ */
function updateProfilePaginationUI() {
  const paginationEl = document.getElementById('profile-pagination');
  const infoEl = document.getElementById('profile-pagination-info');
  const pagesEl = document.getElementById('profile-pagination-pages');
  const prevBtn = document.getElementById('profile-prev-btn');
  const nextBtn = document.getElementById('profile-next-btn');

  if (!paginationEl) return;

  const totalPages = Math.ceil(allProfileKeys.length / PROFILES_PER_PAGE);

  if (totalPages <= 1) {
    paginationEl.style.display = 'none';
    return;
  }

  paginationEl.style.display = 'flex';

  const startIdx = (profileCurrentPage - 1) * PROFILES_PER_PAGE + 1;
  const endIdx = Math.min(profileCurrentPage * PROFILES_PER_PAGE, allProfileKeys.length);
  if (infoEl) infoEl.textContent = `Menampilkan ${startIdx}–${endIdx} dari ${allProfileKeys.length} tokoh`;

  if (prevBtn) prevBtn.disabled = profileCurrentPage === 1;
  if (nextBtn) nextBtn.disabled = profileCurrentPage === totalPages;

  if (pagesEl) {
    pagesEl.innerHTML = '';
    const maxVisible = 5;
    let startPage = Math.max(1, profileCurrentPage - Math.floor(maxVisible / 2));
    let endPage = Math.min(totalPages, startPage + maxVisible - 1);
    if (endPage - startPage < maxVisible - 1) {
      startPage = Math.max(1, endPage - maxVisible + 1);
    }
    for (let i = startPage; i <= endPage; i++) {
      const btn = document.createElement('button');
      btn.className = `pagination-page-btn${i === profileCurrentPage ? ' active' : ''}`;
      btn.textContent = i;
      btn.addEventListener('click', () => {
        profileCurrentPage = i;
        renderProfileCards();
        document.querySelector('.profile-grid')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
      pagesEl.appendChild(btn);
    }
  }
}

function setupProfilePagination() {
  const prevBtn = document.getElementById('profile-prev-btn');
  const nextBtn = document.getElementById('profile-next-btn');

  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      if (profileCurrentPage > 1) {
        profileCurrentPage--;
        renderProfileCards();
        document.querySelector('.profile-grid')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      const totalPages = Math.ceil(allProfileKeys.length / PROFILES_PER_PAGE);
      if (profileCurrentPage < totalPages) {
        profileCurrentPage++;
        renderProfileCards();
        document.querySelector('.profile-grid')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  }
}

/* ============================================
   TABLE STATEMENTS RENDER & FILTERING
   ============================================ */
function renderStatementsTable(data) {
  const tbody = document.querySelector('.data-table tbody');
  const footerText = document.querySelector('.table-footer-text');
  if (!tbody) return;

  // Extract statements from the dynamic data
  let sheetStatements = [];
  data.forEach(row => {
    const tokohList = detectStakeholdersLocal(row);
    if (!tokohList || tokohList.length === 0) return;

    tokohList.forEach(tokohObj => {
      sheetStatements.push({
        tanggal: formatDateString(row.Tanggal),
        tokoh: tokohObj.name,
        kutipan: `"${row.Ringkasan || row['Judul Berita']}"`,
        sentimen: row.Sentimen || 'Netral',
        link: row['URL asli'] || '#'
      });
    });
  });

  // Apply search query filter
  if (tableSearchQuery) {
    const q = tableSearchQuery.toLowerCase();
    sheetStatements = sheetStatements.filter(row => 
      row.tokoh.toLowerCase().includes(q) || 
      row.kutipan.toLowerCase().includes(q)
    );
  }

  // Calculate pagination details
  const totalItems = sheetStatements.length;
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE) || 1;
  if (tableCurrentPage > totalPages) tableCurrentPage = totalPages;

  const startIdx = (tableCurrentPage - 1) * ITEMS_PER_PAGE;
  const endIdx = startIdx + ITEMS_PER_PAGE;
  const pageItems = sheetStatements.slice(startIdx, endIdx);

  // Render rows
  tbody.innerHTML = '';
  if (pageItems.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" style="text-align: center; padding: var(--space-8); color: var(--color-text-light);">
          Tidak ada kutipan ditemukan di sheet.
        </td>
      </tr>
    `;
  } else {
    pageItems.forEach(row => {
      const initials = getStakeholderInitials(row.tokoh);
      const avatarClass = STAKEHOLDERS_AVATARS[row.tokoh] || 'avatar-blue';

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${row.tanggal}</td>
        <td>
          <div class="table-user">
            <div class="table-avatar ${avatarClass}">${initials}</div>
            <span class="table-user-name">${row.tokoh}</span>
          </div>
        </td>
        <td><span class="table-quote">${row.kutipan}</span></td>
        <td>${getSentimentBadge(row.sentimen)}</td>
        <td><a href="${row.link}" target="_blank" class="table-link">Lihat Berita</a></td>
      `;
      tbody.appendChild(tr);
    });
  }

  // Update table footer text
  if (footerText) {
    const showingCount = pageItems.length;
    const displayStart = totalItems > 0 ? startIdx + 1 : 0;
    footerText.textContent = `Menampilkan ${displayStart}-${startIdx + showingCount} dari ${totalItems} kutipan`;
  }

  // Update pagination buttons
  const prevBtn = document.querySelector('.pagination .pagination-btn:first-child');
  const nextBtn = document.querySelector('.pagination .pagination-btn:last-child');
  
  if (prevBtn) prevBtn.disabled = tableCurrentPage === 1;
  if (nextBtn) nextBtn.disabled = tableCurrentPage === totalPages;
}

function setupSearchFilter() {
  const searchInput = document.querySelector('.table-header .search-input');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      tableSearchQuery = e.target.value;
      tableCurrentPage = 1;
      renderStatementsTable(allNewsData);
    });
  }

  const prevBtn = document.querySelector('.pagination .pagination-btn:first-child');
  const nextBtn = document.querySelector('.pagination .pagination-btn:last-child');

  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      if (tableCurrentPage > 1) {
        tableCurrentPage--;
        renderStatementsTable(allNewsData);
      }
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      tableCurrentPage++;
      renderStatementsTable(allNewsData);
    });
  }
}

/* ============================================
   LOCAL HELPER FUNCTIONS
   ============================================ */
function detectStakeholdersLocal(row) {
  let tok = row['Tokoh terkait']?.trim() || '';
  let jab = (row['Jabatan'] || row['jabatan'] || '').trim();

  if (tok && tok !== '-' && tok !== '') {
    // Split by comma, or newline if they list multiple people
    let rawTokens = tok.split(/,|\r?\n/).map(t => t.trim()).filter(t => t !== '');
    let rawJabatan = jab ? jab.split(/,|\r?\n/).map(t => t.trim()) : [];
    
    let results = [];
    let seen = new Set();

    rawTokens.forEach((t, i) => {
      let role = rawJabatan[i] || ''; // match index

      let processedName = t;
      if (t.includes('Syahrul Yasin Limpo') || t.includes('Limpo') || t.includes('Syahrul Yasin')) processedName = 'H. Syahrul Yasin Limpo';
      else if (t.includes('Tri Wahyudi Saleh') || t.includes('Tri Wahyudi')) processedName = 'Tri Wahyudi Saleh';
      else if (t.includes('Herman Deru')) processedName = 'H. Herman Deru';
      // Clean up 'dan ' if someone typed 'dan Jawa Tengah'
      else if (t.toLowerCase().startsWith('dan ')) processedName = t.substring(4).trim();
      
      if (processedName !== '' && !seen.has(processedName)) {
        seen.add(processedName);
        results.push({ name: processedName, role: role });
      }
    });
    
    return results;
  }
  
  const title = (row['Judul Berita'] || '').toLowerCase();
  if (title.includes('tri wahyudi') || title.includes('dirut pusri')) {
    return [{ name: 'Tri Wahyudi Saleh', role: 'Direktur Utama PT Pusri' }];
  }
  if (title.includes('herman deru') || title.includes('gubernur sumsel') || title.includes('gubernur sumatera selatan')) {
    return [{ name: 'H. Herman Deru', role: 'Gubernur Sumatera Selatan' }];
  }
  if (title.includes('syahrul yasin') || title.includes('menteri pertanian') || title.includes('mentan')) {
    return [{ name: 'H. Syahrul Yasin Limpo', role: 'Menteri Pertanian RI' }];
  }
  return [];
}

function formatDateString(dateStr) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agt', 'Sep', 'Okt', 'Nov', 'Des'];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

/**
 * Social Media Trending Algorithm
 * Calculates weight of a mention based on recency.
 * Uses an exponential decay gravity formula similar to Hacker News / Reddit.
 */
function calculateTrendingScore(dateStr) {
  let baseScore = 100;
  if (!dateStr || dateStr === '-') return baseScore / 10;

  let d = new Date(dateStr);
  if (isNaN(d.getTime())) return baseScore / 10;

  let diffHours = (Date.now() - d.getTime()) / (1000 * 60 * 60);
  if (diffHours < 0) diffHours = 0; // Future dates count as right now
  
  // Score drops significantly as hours pass
  return baseScore / Math.pow(diffHours + 2, 1.5);
}
