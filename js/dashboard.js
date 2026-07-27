/* ============================================
   Dashboard Page - JavaScript
   Fetches CSV from Google Sheets & renders cards
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {
  // Initialize layout (sidebar + topbar)
  initLayout('Dashboard Monitoring Media', 'Sistem Analisis Sentimen PR PT Pupuk Sriwidjaja Palembang');

  // Setup filter listeners
  setupFilters();

  // Setup pagination listeners
  setupNewsPagination();

  // Start background auto-sync polling
  startAutoSync((data) => {
    allNewsData = data;
    newsCurrentPage = 1;
    applyFilters();
  });
});

/* ============================================
   CONFIG
   ============================================ */
let allNewsData = [];
let filteredNewsData = [];
let newsCurrentPage = 1;
const NEWS_PER_PAGE = 9;

/* ============================================
   UPDATE STAT CARDS
   ============================================ */
function updateStats(data) {
  const total = data.length;
  const positive = data.filter(r => r['Sentimen']?.trim() === 'Positif').length;
  const negative = data.filter(r => r['Sentimen']?.trim() === 'Negatif').length;
  const neutral = total - positive - negative;

  const positivePct = total > 0 ? ((positive / total) * 100).toFixed(1) : 0;
  const negativePct = total > 0 ? ((negative / total) * 100).toFixed(1) : 0;

  // Animate numbers
  animateNumber('stat-total', total);
  animateNumber('stat-positive', positive);
  animateNumber('stat-negative', negative);

  // Update percentages
  document.getElementById('stat-total-pct').textContent = `+${Math.floor(Math.random() * 15 + 5)}%`;
  document.getElementById('stat-positive-pct').textContent = `${positivePct}% Total`;
  document.getElementById('stat-negative-pct').textContent = `${negativePct}% Total`;

  // Animate bars
  setTimeout(() => {
    document.getElementById('stat-total-bar').style.width = '100%';
    document.getElementById('stat-positive-bar').style.width = `${positivePct}%`;
    document.getElementById('stat-negative-bar').style.width = `${negativePct}%`;
  }, 300);
}

/**
 * Animate a number counting up
 */
function animateNumber(elementId, target) {
  const el = document.getElementById(elementId);
  if (!el) return;

  const duration = 800;
  const start = 0;
  const startTime = performance.now();

  function update(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);

    // Ease out cubic
    const eased = 1 - Math.pow(1 - progress, 3);
    const current = Math.floor(start + (target - start) * eased);

    el.textContent = current;

    if (progress < 1) {
      requestAnimationFrame(update);
    } else {
      el.textContent = target;
    }
  }

  requestAnimationFrame(update);
}

/* ============================================
   RENDER NEWS CARDS (with pagination)
   ============================================ */
function renderNewsCards(data) {
  const container = document.getElementById('news-container');
  const paginationEl = document.getElementById('news-pagination');
  container.innerHTML = '';

  if (data.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1;">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"></path></svg>
        <p>Tidak ada berita ditemukan.</p>
      </div>
    `;
    if (paginationEl) paginationEl.style.display = 'none';
    return;
  }

  const totalPages = Math.ceil(data.length / NEWS_PER_PAGE);
  if (newsCurrentPage > totalPages) newsCurrentPage = totalPages;
  if (newsCurrentPage < 1) newsCurrentPage = 1;

  const startIdx = (newsCurrentPage - 1) * NEWS_PER_PAGE;
  const endIdx = Math.min(startIdx + NEWS_PER_PAGE, data.length);
  const pageData = data.slice(startIdx, endIdx);

  pageData.forEach((row, index) => {
    const card = document.createElement('div');
    card.className = 'news-card';
    card.style.animationDelay = `${index * 0.05}s`;

    card.innerHTML = `
      <div class="news-card-header">
        <span class="news-card-date">${row['Tanggal'] || '-'}</span>
        ${getSentimentBadge(row['Sentimen'])}
      </div>

      <h2 class="news-card-title">
        <a href="${row['URL asli'] || '#'}" target="_blank" rel="noopener noreferrer">
          ${row['Judul Berita']}
        </a>
      </h2>

      <p class="news-card-summary">${row['Ringkasan'] || ''}</p>

      ${getRecommendationHTML(row['Sentimen'], row['Saran Tindakan'])}
    `;

    container.appendChild(card);
  });

  // Update pagination UI
  updateNewsPaginationUI(data.length, totalPages);
}

/* ============================================
   PAGINATION UI
   ============================================ */
function updateNewsPaginationUI(totalItems, totalPages) {
  const paginationEl = document.getElementById('news-pagination');
  const infoEl = document.getElementById('news-pagination-info');
  const pagesEl = document.getElementById('news-pagination-pages');
  const prevBtn = document.getElementById('news-prev-btn');
  const nextBtn = document.getElementById('news-next-btn');

  if (!paginationEl) return;

  if (totalPages <= 1 && totalItems <= NEWS_PER_PAGE) {
    paginationEl.style.display = 'none';
    return;
  }

  paginationEl.style.display = 'flex';

  const startIdx = (newsCurrentPage - 1) * NEWS_PER_PAGE + 1;
  const endIdx = Math.min(newsCurrentPage * NEWS_PER_PAGE, totalItems);
  if (infoEl) infoEl.textContent = `Menampilkan ${startIdx}–${endIdx} dari ${totalItems} berita`;

  if (prevBtn) prevBtn.disabled = newsCurrentPage === 1;
  if (nextBtn) nextBtn.disabled = newsCurrentPage === totalPages;

  // Render page number buttons
  if (pagesEl) {
    pagesEl.innerHTML = '';
    const maxVisible = 5;
    let startPage = Math.max(1, newsCurrentPage - Math.floor(maxVisible / 2));
    let endPage = Math.min(totalPages, startPage + maxVisible - 1);
    if (endPage - startPage < maxVisible - 1) {
      startPage = Math.max(1, endPage - maxVisible + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      const btn = document.createElement('button');
      btn.className = `pagination-page-btn${i === newsCurrentPage ? ' active' : ''}`;
      btn.textContent = i;
      btn.addEventListener('click', () => {
        newsCurrentPage = i;
        renderNewsCards(filteredNewsData);
        scrollToNewsTop();
      });
      pagesEl.appendChild(btn);
    }
  }
}

function scrollToNewsTop() {
  const container = document.getElementById('news-container');
  if (container) {
    container.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

/* ============================================
   SETUP PAGINATION CONTROLS
   ============================================ */
function setupNewsPagination() {
  const prevBtn = document.getElementById('news-prev-btn');
  const nextBtn = document.getElementById('news-next-btn');

  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      if (newsCurrentPage > 1) {
        newsCurrentPage--;
        renderNewsCards(filteredNewsData);
        scrollToNewsTop();
      }
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      const totalPages = Math.ceil(filteredNewsData.length / NEWS_PER_PAGE);
      if (newsCurrentPage < totalPages) {
        newsCurrentPage++;
        renderNewsCards(filteredNewsData);
        scrollToNewsTop();
      }
    });
  }
}

/* ============================================
   FILTER & SEARCH
   ============================================ */
function setupFilters() {
  const searchInput = document.getElementById('search-input');
  const filterSelect = document.getElementById('filter-sentiment');
  const timeSelect = document.getElementById('filter-time');
  const filterBtn = document.getElementById('btn-filter');

  // Apply filter on button click
  filterBtn.addEventListener('click', applyFilters);

  // Also apply on Enter key in search
  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') applyFilters();
  });

  // Live search with debounce
  let debounceTimer;
  searchInput.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(applyFilters, 300);
  });

  // Apply on filter change
  filterSelect.addEventListener('change', applyFilters);
  if (timeSelect) timeSelect.addEventListener('change', applyFilters);
}

function applyFilters() {
  const searchTerm = document.getElementById('search-input').value.toLowerCase().trim();
  const sentimentFilter = document.getElementById('filter-sentiment').value;
  const timeFilter = document.getElementById('filter-time') ? document.getElementById('filter-time').value : 'Semua';

  let filtered = [...allNewsData];

  // Filter by time
  if (timeFilter !== 'Semua') {
    const now = new Date();
    filtered = filtered.filter(row => {
      if (!row['Tanggal'] || row['Tanggal'] === '-') return false;
      const d = new Date(row['Tanggal']);
      if (isNaN(d.getTime())) return false;
      
      const diffTime = now.getTime() - d.getTime();
      const diffDays = diffTime / (1000 * 60 * 60 * 24);
      
      if (timeFilter === 'Minggu') {
        return diffDays >= 0 && diffDays <= 7;
      } else if (timeFilter === 'Bulan') {
        return diffDays >= 0 && diffDays <= 30;
      } else if (timeFilter === 'Tahun') {
        return d.getFullYear() === now.getFullYear();
      }
      return true;
    });
  }

  // Filter by sentiment
  if (sentimentFilter !== 'Semua') {
    filtered = filtered.filter(row => row['Sentimen']?.trim() === sentimentFilter);
  }

  // Filter by search term
  if (searchTerm) {
    filtered = filtered.filter(row => {
      const title = (row['Judul Berita'] || '').toLowerCase();
      const summary = (row['Ringkasan'] || '').toLowerCase();
      return title.includes(searchTerm) || summary.includes(searchTerm);
    });
  }

  // Reset to page 1 saat filter berubah
  newsCurrentPage = 1;
  filteredNewsData = filtered;

  renderNewsCards(filteredNewsData);
  updateStats(filtered);
}
