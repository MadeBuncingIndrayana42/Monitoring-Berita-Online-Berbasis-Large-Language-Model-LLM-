/* ============================================
   Sentiment Analysis Page - sentiment.js
   Dynamic calculations based on Google Sheet CSV ONLY (No Fake Data)
   ============================================ */

let allNewsData = [];
let gaugeChartInstance = null;
let trendChartInstance = null;

document.addEventListener('DOMContentLoaded', () => {
  // Initialize shared layout (sidebar + topbar)
  initLayout('Pusri Media Intelligence', 'Sistem Analisis Sentimen PR PT Pupuk Sriwidjaja Palembang');

  // Initialize interactive components
  initDateFilter();

  // Start background auto-sync polling
  startAutoSync((data) => {
    allNewsData = data;
    applyDateFilterAndRefresh();
  });
});

/* ============================================
   DATE FILTER & REFRESH LOGIC
   ============================================ */
function applyDateFilterAndRefresh() {
  if (!allNewsData || allNewsData.length === 0) {
    updateSentimentPage([]);
    return;
  }

  const timeSelect = document.getElementById('filter-time');
  const timeFilter = timeSelect ? timeSelect.value : 'Semua';
  const filteredData = window.filterDataByTime(allNewsData, timeFilter);

  const titleEl = document.getElementById('trend-chart-title');
  if (titleEl) {
    if (timeFilter === 'Minggu') titleEl.textContent = 'Tren Sentimen Mingguan';
    else if (timeFilter === 'Bulan') titleEl.textContent = 'Tren Sentimen Bulanan';
    else if (timeFilter === 'Tahun') titleEl.textContent = 'Tren Sentimen Tahunan';
    else titleEl.textContent = 'Tren Sentimen Keseluruhan';
  }

  updateSentimentPage(filteredData, timeFilter);
}

function initDateFilter() {
  const timeSelect = document.getElementById('filter-time');
  if (timeSelect) {
    timeSelect.addEventListener('change', () => {
      applyDateFilterAndRefresh();
    });
  }
}

/* ============================================
   MAIN PAGE REPAINT
   ============================================ */
function updateSentimentPage(data, timeFilter) {
  if (!data || data.length === 0) {
    showEmptyState();
    return;
  }

  const total = data.length;
  const positive = data.filter(r => r.Sentimen === 'Positif').length;
  const score = total > 0 ? Math.round((positive / total) * 100) : 0;

  // 1. Render Gauge Chart & Score
  createGaugeChart(score);

  // 2. Render Weekly Trend Chart
  createTrendChart(data, timeFilter);

  // 3. Render Media Source Comparison Chart
  renderMediaComparison(data);

  // 4. Render Topic Triggers
  renderTopics(data);
}

function showEmptyState() {
  createGaugeChart(0);
  
  const trendCtx = document.getElementById('trend-chart');
  if (trendCtx && trendChartInstance) trendChartInstance.destroy();
  
  const mediaContainer = document.querySelector('.h-bar-chart');
  if (mediaContainer) mediaContainer.innerHTML = '<p style="text-align: center; padding: 20px; color: var(--color-text-light);">Tidak ada data media.</p>';

  const positiveListEl = document.querySelector('.topic-card.positive .topic-list');
  const negativeListEl = document.querySelector('.topic-card.negative .topic-list');
  if (positiveListEl) positiveListEl.innerHTML = '<p style="text-align: center; padding: 10px; color: var(--color-text-light);">Tidak ada topik.</p>';
  if (negativeListEl) negativeListEl.innerHTML = '<p style="text-align: center; padding: 10px; color: var(--color-text-light);">Tidak ada topik.</p>';
}

/* ============================================
   1. GAUGE CHART (Half-circle doughnut)
   ============================================ */
function createGaugeChart(score) {
  const ctx = document.getElementById('gauge-chart');
  if (!ctx) return;

  const remaining = 100 - score;

  // Update gauge text elements in DOM
  const valEl = document.getElementById('gauge-value');
  const badgeEl = document.getElementById('gauge-badge');
  const changeEl = document.getElementById('gauge-change');

  if (valEl) valEl.textContent = score + '%';
  
  if (badgeEl) {
    badgeEl.className = 'gauge-label'; // Reset class
    if (score >= 70) {
      badgeEl.textContent = 'Kesehatan Sentimen Baik';
      badgeEl.classList.add('good');
    } else if (score >= 40) {
      badgeEl.textContent = 'Kesehatan Sentimen Cukup';
      badgeEl.classList.add('warning');
    } else {
      badgeEl.textContent = 'Kesehatan Sentimen Kurang';
      badgeEl.classList.add('bad');
    }
  }

  if (changeEl) {
    changeEl.textContent = 'Berdasarkan data sheet aktif';
  }

  // Draw chart
  if (gaugeChartInstance) {
    gaugeChartInstance.destroy();
    gaugeChartInstance = null;
  }

  // Gunakan renderChartSafe agar canvas punya ukuran sebelum animasi jalan
  window.renderChartSafe(ctx, (canvas) => {
    return new Chart(canvas, {
      type: 'doughnut',
      data: {
        datasets: [{
          data: [score, remaining],
          backgroundColor: [
            createGaugeGradient(ctx, score),
            '#e2e8f0'
          ],
          borderWidth: 0,
          cutout: '78%',
          borderRadius: 6
        }]
      },
      options: {
        rotation: -90,
        circumference: 180,
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { enabled: false }
        },
        animation: {
          duration: 1800,
          easing: 'easeInOutCubic',
          onProgress: function(animation) {
            const progress = animation.currentStep / animation.numSteps;
            const currentScore = Math.round(score * progress);
            if (valEl) valEl.textContent = currentScore + '%';
          },
          onComplete: function() {
            if (valEl) valEl.textContent = score + '%';
          }
        }
      }
    });
  }).then(instance => { gaugeChartInstance = instance; });
}

function createGaugeGradient(canvas, score) {
  const context = canvas.getContext('2d');
  const gradient = context.createLinearGradient(0, 0, canvas.width, 0);

  gradient.addColorStop(0, '#dc2626');   // Red
  gradient.addColorStop(0.4, '#f59e0b'); // Yellow
  gradient.addColorStop(0.7, '#16a34a'); // Green
  gradient.addColorStop(1, '#16a34a');   // Green

  if (score >= 70) {
    return '#16a34a';
  } else if (score >= 40) {
    return '#f59e0b';
  } else {
    return '#dc2626';
  }
}

/* ============================================
   2. STACKED BAR CHART (Weekly Trend)
   ============================================ */
function formatIndoMonthShort(m) {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agt', 'Sep', 'Okt', 'Nov', 'Des'];
  return months[m] || '';
}

function createTrendChart(data, timeFilter) {
  const ctx = document.getElementById('trend-chart');
  if (!ctx) return;

  let labels = [];
  let positifData = [];
  let netralData = [];
  let negatifData = [];

  if (timeFilter === 'Tahun' || timeFilter === 'Semua') {
    labels = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agt', 'Sep', 'Okt', 'Nov', 'Des'];
    positifData = Array(12).fill(0);
    netralData = Array(12).fill(0);
    negatifData = Array(12).fill(0);

    data.forEach(row => {
      if (!row.Tanggal) return;
      const date = new Date(row.Tanggal);
      if (isNaN(date.getTime())) return;

      const monthIndex = date.getMonth();
      const sent = row.Sentimen?.trim() || 'Netral';
      if (sent === 'Positif') positifData[monthIndex]++;
      else if (sent === 'Negatif') negatifData[monthIndex]++;
      else netralData[monthIndex]++;
    });
  } else {
    const days = timeFilter === 'Minggu' ? 7 : 30;
    const now = new Date();
    const dateMap = {};
    
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const label = `${d.getDate()} ${formatIndoMonthShort(d.getMonth())}`;
      labels.push(label);
      dateMap[label] = { pos: 0, neu: 0, neg: 0 };
    }

    data.forEach(row => {
      if (!row.Tanggal) return;
      const date = new Date(row.Tanggal);
      if (isNaN(date.getTime())) return;

      const label = `${date.getDate()} ${formatIndoMonthShort(date.getMonth())}`;
      if (dateMap[label]) {
        const sent = row.Sentimen?.trim() || 'Netral';
        if (sent === 'Positif') dateMap[label].pos++;
        else if (sent === 'Negatif') dateMap[label].neg++;
        else dateMap[label].neu++;
      }
    });

    labels.forEach(label => {
      positifData.push(dateMap[label].pos);
      netralData.push(dateMap[label].neu);
      negatifData.push(dateMap[label].neg);
    });
  }

  if (trendChartInstance) {
    trendChartInstance.destroy();
    trendChartInstance = null;
  }

  // Gunakan renderChartSafe agar animasi bar jalan di mobile
  window.renderChartSafe(ctx, (canvas) => {
    return new Chart(canvas, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Positif',
            data: positifData,
            backgroundColor: '#16a34a',
            borderRadius: 4,
            borderSkipped: false
          },
          {
            label: 'Netral',
            data: netralData,
            backgroundColor: '#d1d5db',
            borderRadius: 4,
            borderSkipped: false
          },
          {
            label: 'Negatif',
            data: negatifData,
            backgroundColor: '#f87171',
            borderRadius: 4,
            borderSkipped: false
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            stacked: true,
            grid: { display: false },
            ticks: {
              font: { family: 'Inter', size: 12, weight: '500' },
              color: '#64748b'
            }
          },
          y: {
            stacked: true,
            beginAtZero: true,
            grid: {
              color: '#e2e8f0',
              drawBorder: false,
              borderDash: [5, 5]
            },
            ticks: {
              stepSize: 1,
              font: { family: 'Inter', size: 12, weight: '500' },
              color: '#64748b'
            }
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
                return context.dataset.label + ': ' + context.parsed.y + ' berita';
              }
            }
          }
        },
        animation: {
          duration: 1500,
          easing: 'easeInOutQuart',
          delay: function(context) {
            return context.datasetIndex * 300;
          }
        }
      }
    });
  }).then(instance => { trendChartInstance = instance; });

/* ============================================
   3. HORIZONTAL BAR CHART (Media Source Comparison)
   ============================================ */
function renderMediaComparison(data) {
  const container = document.querySelector('.h-bar-chart');
  if (!container) return;

  const sourceData = {};
  data.forEach(row => {
    const source = extractSource(row);
    if (!sourceData[source]) {
      sourceData[source] = { total: 0, Positif: 0, Netral: 0, Negatif: 0 };
    }
    sourceData[source].total++;
    const sent = row['Sentimen']?.trim() || 'Netral';
    if (sourceData[source][sent] !== undefined) {
      sourceData[source][sent]++;
    }
  });

  let sourcesArray = Object.keys(sourceData).map(src => ({
    name: src,
    ...sourceData[src]
  }));
  
  sourcesArray.sort((a, b) => b.total - a.total);

  // Strictly use the media sources in the spreadsheet
  const topSources = sourcesArray.slice(0, 5);
  container.innerHTML = '';

  if (topSources.length === 0) {
    container.innerHTML = '<p style="text-align: center; padding: 20px; color: var(--color-text-light); width: 100%;">Tidak ada data media terpantau.</p>';
    return;
  }

  topSources.forEach(src => {
    let posPct = 0, neuPct = 0, negPct = 0;
    if (src.total > 0) {
      posPct = Math.round((src.Positif / src.total) * 100);
      neuPct = Math.round((src.Netral / src.total) * 100);
      negPct = 100 - posPct - neuPct;
    }

    const rowHtml = `
      <div class="h-bar-row">
        <span class="h-bar-label">${src.name}</span>
        <div class="h-bar-track">
          <div class="h-bar-segment positive" style="width: 0%" data-width="${posPct}"></div>
          <div class="h-bar-segment neutral" style="width: 0%" data-width="${neuPct}"></div>
          <div class="h-bar-segment negative" style="width: 0%" data-width="${negPct}"></div>
        </div>
        <span class="h-bar-percentage">${posPct}%</span>
      </div>
    `;
    container.insertAdjacentHTML('beforeend', rowHtml);
  });

  animateHorizontalBars();
  // Gunakan observeHorizontalBars agar animasi trigger saat masuk viewport
  if (window.observeHorizontalBars) {
    window.observeHorizontalBars('.h-bar-chart');
  } else {
    animateHorizontalBars();
  }
}

function animateHorizontalBars() {
  const rows = document.querySelectorAll('.h-bar-row');
  rows.forEach((row, rowIndex) => {
    const segments = row.querySelectorAll('.h-bar-segment');
    segments.forEach(seg => {
      seg.style.width = '0%';
    });

    // Staggered delay per row for cascade effect
    setTimeout(() => {
      segments.forEach(seg => {
        const targetWidth = seg.getAttribute('data-width');
        if (targetWidth) {
          seg.style.width = targetWidth + '%';
        }
      });
    }, 200 + rowIndex * 150);
  });
}

/* ============================================
   4. SENTIMENT TOPICS TRIGGERS
   ============================================ */
function renderTopics(data) {
  const positiveListEl = document.querySelector('.topic-card.positive .topic-list');
  const negativeListEl = document.querySelector('.topic-card.negative .topic-list');

  if (!positiveListEl || !negativeListEl) return;

  const basePositive = {};
  const baseNegative = {};

  // Map sheet items into topics
  data.forEach(row => {
    const topic = classifyTopic(row);
    const sent = row.Sentimen?.trim() || 'Netral';
    
    if (sent === 'Positif') {
      basePositive[topic] = (basePositive[topic] || 0) + 1;
    } else if (sent === 'Negatif') {
      baseNegative[topic] = (baseNegative[topic] || 0) + 1;
    }
  });

  // Sort and render positive topics
  const sortedPos = Object.keys(basePositive)
    .map(key => ({ name: key, count: basePositive[key] }))
    .sort((a, b) => b.count - a.count);

  positiveListEl.innerHTML = '';
  if (sortedPos.length === 0) {
    positiveListEl.innerHTML = '<div style="padding: 20px; color: var(--color-text-light); text-align: center; width: 100%;">Tidak ada topik pemicu sentimen positif.</div>';
  } else {
    sortedPos.slice(0, 5).forEach((topic, idx) => {
      const itemHtml = `
        <div class="topic-item" style="opacity: 0; animation: fadeInUp 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) ${0.1 + idx * 0.1}s forwards;">
          <div class="topic-item-left">
            <div class="topic-item-icon">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path></svg>
            </div>
            <span class="topic-item-text">${topic.name}</span>
          </div>
          <span class="topic-item-count">${formatNumber(topic.count)}</span>
        </div>
      `;
      positiveListEl.insertAdjacentHTML('beforeend', itemHtml);
    });
    // Trigger animasi fadeInUp saat elemen masuk viewport
    if (window.observeAnimations) {
      window.observeAnimations('.topic-card.positive .topic-item');
    }
  }

  // Sort and render negative topics
  const sortedNeg = Object.keys(baseNegative)
    .map(key => ({ name: key, count: baseNegative[key] }))
    .sort((a, b) => b.count - a.count);

  negativeListEl.innerHTML = '';
  if (sortedNeg.length === 0) {
    negativeListEl.innerHTML = '<div style="padding: 20px; color: var(--color-text-light); text-align: center; width: 100%;">Tidak ada topik pemicu sentimen negatif.</div>';
  } else {
    sortedNeg.slice(0, 5).forEach((topic, idx) => {
      const itemHtml = `
        <div class="topic-item" style="opacity: 0; animation: fadeInUp 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) ${0.1 + idx * 0.1}s forwards;">
          <div class="topic-item-left">
            <div class="topic-item-icon">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6"></path></svg>
            </div>
            <span class="topic-item-text">${topic.name}</span>
          </div>
          <span class="topic-item-count">${formatNumber(topic.count)}</span>
        </div>
      `;
      negativeListEl.insertAdjacentHTML('beforeend', itemHtml);
    });
    // Trigger animasi fadeInUp saat elemen masuk viewport
    if (window.observeAnimations) {
      window.observeAnimations('.topic-card.negative .topic-item');
    }
  }
}
