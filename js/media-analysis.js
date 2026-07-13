/* ============================================
   Media Analysis Page - media-analysis.js
   Dynamic calculations based on Google Sheet CSV
   ============================================ */

let allNewsData = [];
let shareChartInstance = null;
let sentimentChartInstance = null;

document.addEventListener('DOMContentLoaded', () => {
  // Initialize shared layout (sidebar + topbar)
  initLayout('Media Analysis', 'Monitoring pengaruh dan sentimen sumber media');

  // Apply filter change
  const timeSelect = document.getElementById('filter-time');
  if (timeSelect) {
    timeSelect.addEventListener('change', () => {
      const timeFilter = timeSelect.value;
      const filtered = window.filterDataByTime(allNewsData, timeFilter);
      updateMediaAnalysisPage(filtered);
    });
  }

  // Start background auto-sync polling
  startAutoSync((data) => {
    allNewsData = data;
    const timeFilter = timeSelect ? timeSelect.value : 'Semua';
    const filtered = window.filterDataByTime(data, timeFilter);
    updateMediaAnalysisPage(filtered);
  });
});

/* ============================================
   MAIN PAGE REPAINT
   ============================================ */
function updateMediaAnalysisPage(data) {
  if (!data || data.length === 0) {
    showEmptyState();
    return;
  }

  // Hide empty state if present and show containers (if we ever added toggles, but here we just render)
  
  // 1. Group data by media source
  const mediaStats = {};
  data.forEach(row => {
    const source = extractSource(row);
    if (!mediaStats[source]) {
      mediaStats[source] = { total: 0, Positif: 0, Netral: 0, Negatif: 0 };
    }
    mediaStats[source].total++;
    const sent = row.Sentimen?.trim() || 'Netral';
    if (mediaStats[source][sent] !== undefined) {
      mediaStats[source][sent]++;
    }
  });

  const mediaList = Object.keys(mediaStats).map(name => ({
    name: name,
    ...mediaStats[name],
    healthScore: mediaStats[name].total > 0 ? Math.round((mediaStats[name].Positif / mediaStats[name].total) * 100) : 0
  }));

  // Sort by total news count descending
  mediaList.sort((a, b) => b.total - a.total);

  // 2. Update Stats Cards
  updateStatsCards(mediaList, data);

  // 3. Render Table
  renderMediaTable(mediaList);

  // 4. Render Share of Voice Doughnut Chart
  renderShareChart(mediaList);

  // 5. Render Sentiment Bar Chart
  renderSentimentChart(mediaList);
}

function showEmptyState() {
  const tableBody = document.querySelector('#media-table tbody');
  if (tableBody) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align: center; padding: var(--space-8); color: var(--color-text-light);">
          Tidak ada data media ditemukan. Silakan tambahkan data di Google Sheets.
        </td>
      </tr>
    `;
  }
  document.getElementById('stat-media-count').textContent = '0';
  document.getElementById('stat-media-active').textContent = '-';
  document.getElementById('stat-media-sentiment').textContent = '0%';
}

/* ============================================
   STATS CARDS DYNAMICS
   ============================================ */
function updateStatsCards(mediaList, allData) {
  const uniqueCount = mediaList.length;
  document.getElementById('stat-media-count').textContent = uniqueCount;

  const activeMedia = uniqueCount > 0 ? mediaList[0].name : '-';
  document.getElementById('stat-media-active').textContent = activeMedia;

  // Average Positive Sentiment across all news
  const totalNews = allData.length;
  const positiveNews = allData.filter(r => r.Sentimen === 'Positif').length;
  const avgPositive = totalNews > 0 ? Math.round((positiveNews / totalNews) * 100) : 0;
  
  document.getElementById('stat-media-sentiment').textContent = avgPositive + '%';

  // Animate bars
  setTimeout(() => {
    const mediaBar = document.getElementById('stat-media-bar');
    const sentimentBar = document.getElementById('stat-sentiment-bar');
    if (mediaBar) mediaBar.style.width = '100%';
    if (sentimentBar) sentimentBar.style.width = `${avgPositive}%`;
  }, 200);
}

/* ============================================
   RENDER DETAIL TABLE
   ============================================ */
function renderMediaTable(mediaList) {
  const tbody = document.querySelector('#media-table tbody');
  if (!tbody) return;

  tbody.innerHTML = '';
  mediaList.forEach(media => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${media.name}</strong></td>
      <td>${media.total}</td>
      <td><span class="positive-label" style="color: var(--color-positive); font-weight:600;">${media.Positif}</span></td>
      <td><span>${media.Netral}</span></td>
      <td><span class="negative-label" style="color: var(--color-negative); font-weight:600;">${media.Negatif}</span></td>
      <td>
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="font-weight: 700; width: 36px;">${media.healthScore}%</span>
          <div class="stat-card-bar" style="flex: 1; margin: 0; height: 6px; width: 80px;">
            <div class="stat-card-bar-fill green" style="width: ${media.healthScore}%"></div>
          </div>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

/* ============================================
   CHARTS RENDERING
   ============================================ */
function renderShareChart(mediaList) {
  const ctx = document.getElementById('media-share-chart');
  if (!ctx) return;

  const labels = mediaList.map(m => m.name);
  const data = mediaList.map(m => m.total);

  if (shareChartInstance) {
    shareChartInstance.destroy();
  }

  shareChartInstance = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: labels,
      datasets: [{
        data: data,
        backgroundColor: [
          '#1e3a8a', '#3b82f6', '#8b5cf6', '#f59e0b', '#10b981', '#ef4444'
        ],
        borderWidth: 2,
        borderColor: '#ffffff'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '55%',
      plugins: {
        legend: {
          position: 'right',
          labels: {
            font: { family: 'Inter', size: 12 },
            boxWidth: 12,
            padding: 16
          }
        },
        tooltip: {
          backgroundColor: '#1e293b',
          titleFont: { family: 'Inter', size: 13, weight: '600' },
          bodyFont: { family: 'Inter', size: 12 },
          padding: 12,
          cornerRadius: 8,
          callbacks: {
            label: function(context) {
              const total = context.dataset.data.reduce((a, b) => a + b, 0);
              const pct = total > 0 ? Math.round((context.parsed / total) * 100) : 0;
              return ` ${context.label}: ${context.parsed} berita (${pct}%)`;
            }
          }
        }
      },
      animation: {
        animateRotate: true,
        animateScale: true,
        duration: 1800,
        easing: 'easeInOutCubic'
      }
    }
  });
}

function renderSentimentChart(mediaList) {
  const ctx = document.getElementById('media-sentiment-chart');
  if (!ctx) return;

  const labels = mediaList.map(m => m.name);
  const positiveData = mediaList.map(m => m.Positif);
  const neutralData = mediaList.map(m => m.Netral);
  const negativeData = mediaList.map(m => m.Negatif);

  if (sentimentChartInstance) {
    sentimentChartInstance.destroy();
  }

  sentimentChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Positif',
          data: positiveData,
          backgroundColor: '#16a34a',
          borderRadius: 4,
          borderSkipped: false
        },
        {
          label: 'Netral',
          data: neutralData,
          backgroundColor: '#d1d5db',
          borderRadius: 4,
          borderSkipped: false
        },
        {
          label: 'Negatif',
          data: negativeData,
          backgroundColor: '#f87171',
          borderRadius: 4,
          borderSkipped: false
        }
      ]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          stacked: true,
          grid: { color: '#f1f5f9' },
          ticks: { font: { family: 'Inter', size: 11 } },
          border: { display: false }
        },
        y: {
          stacked: true,
          grid: { display: false },
          ticks: { font: { family: 'Inter', size: 11, weight: '500' } },
          border: { display: false }
        }
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#1e293b',
          titleFont: { family: 'Inter', size: 13, weight: '600' },
          bodyFont: { family: 'Inter', size: 12 },
          padding: 12,
          cornerRadius: 8,
          callbacks: {
            label: function(context) {
              return ` ${context.dataset.label}: ${context.parsed.x} berita`;
            }
          }
        }
      },
      animation: {
        duration: 1500,
        easing: 'easeInOutQuart',
        delay: function(context) {
          return context.datasetIndex * 250 + context.dataIndex * 100;
        }
      }
    }
  });
}
