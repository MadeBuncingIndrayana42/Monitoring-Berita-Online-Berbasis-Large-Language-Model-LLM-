/* ============================================
   PR Dashboard - Media Monitoring
   Reports Page JavaScript (reports.js)
   ============================================ */

let allNewsData = [];
let dailyTrendChartInstance = null;

document.addEventListener('DOMContentLoaded', () => {
  // Initialize shared layout (sidebar + topbar)
  initLayout('Dashboard Monitoring Media', 'Sistem Analisis Sentimen PR PT Pupuk Sriwidjaja Palembang');

  // Initialize flatpickr date range picker
  const dateInput = document.getElementById('report-date-range');
  if (dateInput && typeof flatpickr !== 'undefined') {
    flatpickr(dateInput, {
      mode: "range",
      dateFormat: "j M Y",
      locale: "id",
      defaultDate: ["2026-05-01", "2026-05-31"],
      rangeSeparator: " - "
    });
  }

  // Initialize interactive buttons (only once)
  initPreviewButton();
  initExportPDF();

  // Start background auto-sync polling — data pulled from Google Sheets
  startAutoSync((data) => {
    allNewsData = data;
    generateReport(data);
  });
});

/* ============================================
   1. GENERATE DYNAMIC REPORT
   ============================================ */
function generateReport(data) {
  if (!data) return;

  const rangeInput = document.getElementById('report-date-range');
  const typeInput = document.getElementById('report-type');
  const periodEl = document.querySelector('.report-preview-period');
  const summaryEl = document.querySelector('.report-text');
  const titleEl = document.getElementById('report-main-title');
  const sectionSummary = document.getElementById('section-summary');
  const sectionSentiment = document.getElementById('section-sentiment');
  const sectionStakeholder = document.getElementById('section-stakeholder');
  const sectionTrend = document.getElementById('section-trend');

  const rangeVal = rangeInput ? rangeInput.value.trim() : "";
  let reportType = typeInput ? typeInput.value : "Laporan Detail";

  if (periodEl) periodEl.textContent = `PERIODE: ${rangeVal ? rangeVal.toUpperCase() : 'SEMUA WAKTU'}`;
  if (titleEl) titleEl.textContent = `${reportType} PR - PT Pupuk Sriwidjaja`;

  // Show/hide sections based on report type
  if (reportType === "Ringkasan Eksekutif") {
    if (sectionSummary) sectionSummary.style.display = 'block';
    if (sectionSentiment) sectionSentiment.style.display = 'none';
    if (sectionStakeholder) sectionStakeholder.style.display = 'none';
    if (sectionTrend) sectionTrend.style.display = 'none';
  } else if (reportType === "Analisis Tren") {
    if (sectionSummary) sectionSummary.style.display = 'none';
    if (sectionSentiment) sectionSentiment.style.display = 'block';
    if (sectionStakeholder) sectionStakeholder.style.display = 'none';
    if (sectionTrend) sectionTrend.style.display = 'block';
  } else {
    // Laporan Detail — show all
    if (sectionSummary) sectionSummary.style.display = 'block';
    if (sectionSentiment) sectionSentiment.style.display = 'block';
    if (sectionStakeholder) sectionStakeholder.style.display = 'block';
    if (sectionTrend) sectionTrend.style.display = 'block';
  }

  // Filter data using flatpickr date range
  const parsedRange = rangeVal ? parseDateRange(rangeVal) : null;
  let filtered = [...data];

  if (parsedRange) {
    filtered = data.filter(row => {
      if (!row.Tanggal) return false;
      const d = new Date(row.Tanggal);
      if (isNaN(d.getTime())) return false;
      return d >= parsedRange.start && d <= parsedRange.end;
    });
  }

  // Calculate stats
  const total = filtered.length;
  const positive = filtered.filter(r => r.Sentimen === 'Positif').length;
  const negative = filtered.filter(r => r.Sentimen === 'Negatif').length;

  const positivePct = total > 0 ? Math.round((positive / total) * 100) : 0;
  const negativePct = total > 0 ? Math.round((negative / total) * 100) : 0;

  // Render Sentiment Gauge
  renderGaugeChartReport(positivePct);

  // Calculate Stakeholder Stats
  const tokohMap = {};
  filtered.forEach(r => {
    if (r.Tokoh_Kunci && r.Tokoh_Kunci.trim() !== '-' && r.Tokoh_Kunci.trim() !== '') {
      const tokoh = r.Tokoh_Kunci.trim();
      tokohMap[tokoh] = (tokohMap[tokoh] || 0) + 1;
    }
  });
  
  let totalKutipan = 0;
  let topTokoh = '-';
  let topTokohCount = 0;
  
  for (const [t, count] of Object.entries(tokohMap)) {
    totalKutipan += count;
    if (count > topTokohCount) {
      topTokohCount = count;
      topTokoh = t;
    }
  }

  const statKutipanEl = document.getElementById('report-stat-kutipan');
  const statTokohEl = document.getElementById('report-stat-tokoh');
  if (statKutipanEl) statKutipanEl.textContent = totalKutipan;
  if (statTokohEl) statTokohEl.textContent = topTokoh;

  // Update statistics elements
  const totalValEl = document.querySelector('.report-stat-value.blue');
  const posValEl = document.querySelector('.report-stat-value.green');
  const negValEl = document.querySelector('.report-stat-value.red');

  if (totalValEl) {
    totalValEl.setAttribute('data-target', total);
    totalValEl.textContent = total;
  }
  if (posValEl) {
    posValEl.setAttribute('data-target', positivePct);
    posValEl.textContent = positivePct + '%';
  }
  if (negValEl) {
    negValEl.setAttribute('data-target', negativePct);
    negValEl.textContent = negativePct + '%';
  }

  // Animate stat numbers
  animateStatNumbers();

  // Generate dynamic executive summary
  if (summaryEl) {
    if (total === 0) {
      summaryEl.textContent = `Tidak ada data pemberitaan PT Pupuk Sriwidjaja (Pusri) Palembang yang terdeteksi untuk rentang tanggal terpilih (${rangeValText}). Silakan ubah rentang tanggal filter untuk memuat analisis statistik yang relevan.`;
    } else {
      let dominantSent = 'Netral';
      let dominantPct = 100 - positivePct - negativePct;
      if (positivePct >= negativePct && positivePct >= (100 - positivePct - negativePct)) {
        dominantSent = 'Positif';
        dominantPct = positivePct;
      } else if (negativePct >= positivePct && negativePct >= (100 - positivePct - negativePct)) {
        dominantSent = 'Negatif';
        dominantPct = negativePct;
      }

      summaryEl.textContent = `Selama periode ${rangeValText}, terdapat sebanyak ${total} pemberitaan yang terdeteksi mengenai PT Pupuk Sriwidjaja (Pusri) Palembang. Berdasarkan analisis media, opini publik cenderung didominasi oleh sentimen ${dominantSent} sebesar ${dominantPct}%. Isu-isu utama dalam rentang waktu ini mencakup kegiatan penyaluran bantuan sosial/CSR perusahaan untuk membantu pemulihan masyarakat (terutama bantuan kebakaran area 1 Ilir), kelancaran distribusi pupuk urea bersubsidi untuk mendukung ketahanan pangan nasional, serta program operasional lainnya yang mendapat apresiasi positif dari media digital.`;
    }
  }

  // Render daily volume chart
  renderDailyVolumeChart(filtered, timeFilter);
}

/* ============================================
   2. DAILY VOLUME TREND CHART
   ============================================ */
function renderDailyVolumeChart(filteredData, timeFilter) {
  const ctx = document.getElementById('daily-trend-chart');
  if (!ctx) return;

  const labels = [];
  const chartData = [];

  const titleEl = document.getElementById('report-trend-title');

  if (timeFilter === 'Tahun' || timeFilter === 'Semua') {
    if (titleEl) titleEl.textContent = 'TREN VOLUME BERITA BULANAN';
    const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agt', 'Sep', 'Okt', 'Nov', 'Des'];
    const counts = Array(12).fill(0);

    filteredData.forEach(row => {
      if (!row.Tanggal) return;
      const d = new Date(row.Tanggal);
      if (isNaN(d.getTime())) return;
      counts[d.getMonth()]++;
    });

    monthLabels.forEach((lbl, idx) => {
      labels.push(lbl);
      chartData.push(counts[idx]);
    });
  } else {
    if (titleEl) titleEl.textContent = 'TREN VOLUME BERITA HARIAN';
    const dateCounts = {};
    const days = timeFilter === 'Minggu' ? 7 : 30;
    const now = new Date();
    
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dStr = `${d.getDate()} ${formatIndoMonthShort(d.getMonth())} ${d.getFullYear()}`;
      labels.push(dStr);
      dateCounts[dStr] = 0;
    }

    filteredData.forEach(row => {
      if (!row.Tanggal) return;
      const d = new Date(row.Tanggal);
      if (isNaN(d.getTime())) return;
      const dStr = `${d.getDate()} ${formatIndoMonthShort(d.getMonth())} ${d.getFullYear()}`;
      if (dateCounts[dStr] !== undefined) {
        dateCounts[dStr]++;
      }
    });

    labels.forEach(lbl => {
      chartData.push(dateCounts[lbl]);
    });
  }

  if (dailyTrendChartInstance) {
    dailyTrendChartInstance.destroy();
  }

  dailyTrendChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Jumlah Berita',
        data: chartData,
        backgroundColor: '#93a4d1',
        borderRadius: 6,
        borderSkipped: false,
        maxBarThickness: 48
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#1e293b',
          titleFont: { family: "'Inter', sans-serif", size: 12 },
          bodyFont: { family: "'Inter', sans-serif", size: 13 },
          padding: 10,
          cornerRadius: 8,
          callbacks: {
            label: function(context) {
              return context.parsed.y + ' berita';
            }
          }
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: {
            font: { family: "'Inter', sans-serif", size: 11, weight: '500' },
            color: '#94a3b8'
          },
          border: { display: false }
        },
        y: {
          beginAtZero: true,
          grid: { color: '#f1f5f9' },
          ticks: {
            stepSize: 1,
            font: { family: "'Inter', sans-serif", size: 11, weight: '500' },
            color: '#94a3b8'
          },
          border: { display: false }
        }
      },
      animation: {
        duration: 1500,
        easing: 'easeInOutQuart',
        delay: function(context) {
          return context.dataIndex * 80;
        }
      }
    }
  });
}

/* ============================================
   3. PREVIEW & EXPORT ACTIONS
   ============================================ */
let reportGaugeChartInstance = null;

function renderGaugeChartReport(score) {
  const ctx = document.getElementById('gauge-chart-report');
  if (!ctx) return;

  const valEl = document.getElementById('report-gauge-score');
  if (valEl) valEl.textContent = score + '%';

  if (reportGaugeChartInstance) {
    reportGaugeChartInstance.destroy();
  }

  const remaining = 100 - score;
  const context = ctx.getContext('2d');
  const gradient = context.createLinearGradient(0, 0, ctx.width, 0);
  gradient.addColorStop(0, '#dc2626');   // Red
  gradient.addColorStop(0.4, '#f59e0b'); // Yellow
  gradient.addColorStop(0.7, '#16a34a'); // Green
  gradient.addColorStop(1, '#16a34a');   // Green

  reportGaugeChartInstance = new Chart(ctx, {
    type: 'doughnut',
    data: {
      datasets: [{
        data: [score, remaining],
        backgroundColor: [gradient, '#e2e8f0'],
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
        duration: 1000,
        easing: 'easeInOutCubic'
      }
    }
  });
}

function initPreviewButton() {
  const btnPreview = document.getElementById('btn-preview');
  if (!btnPreview) return;

  btnPreview.addEventListener('click', () => {
    generateReport(allNewsData);

    const reportPreview = document.getElementById('report-preview');
    if (reportPreview) {
      reportPreview.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
}

function initExportPDF() {
  const btnExport = document.getElementById('btn-export-pdf');
  if (!btnExport) return;

  btnExport.addEventListener('click', () => {
    // Gunakan fungsi native browser print
    window.print();
  });
}

/* ============================================
   4. ANIMATE STAT NUMBERS ON LOAD
   ============================================ */
function animateStatNumbers() {
  const statValues = document.querySelectorAll('.report-stat-value[data-target]');

  statValues.forEach(el => {
    const target = parseInt(el.getAttribute('data-target'), 10);
    const isPercentage = el.classList.contains('green') || el.classList.contains('red');
    const duration = 1000;
    const startTime = performance.now();
    const start = 0;

    function update(currentTime) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      const eased = 1 - Math.pow(1 - progress, 3);
      const currentValue = Math.round(start + (target - start) * eased);

      if (isPercentage) {
        el.textContent = currentValue + '%';
      } else {
        el.textContent = currentValue;
      }

      if (progress < 1) {
        requestAnimationFrame(update);
      } else {
        el.textContent = target + (isPercentage ? '%' : '');
      }
    }

    requestAnimationFrame(update);
  });
}

/* ============================================
   5. DATE PARSING HELPERS
   ============================================ */
function parseDateRange(rangeStr) {
  const parts = rangeStr.split(' - ');
  if (parts.length === 0) return null;

  function parseIndoDate(str) {
    if (!str) return null;
    const months = {
      'jan': 0, 'januari': 0,
      'feb': 1, 'februari': 1,
      'mar': 2, 'maret': 2,
      'apr': 3, 'april': 3,
      'mei': 4,
      'jun': 5, 'juni': 5,
      'jul': 6, 'juli': 6,
      'agt': 7, 'agustus': 7,
      'sep': 8, 'september': 8,
      'okt': 9, 'oktober': 9,
      'nov': 10, 'november': 10,
      'des': 11, 'desember': 11
    };
    const tokens = str.toLowerCase().trim().split(/\s+/);
    if (tokens.length < 3) return null;

    const day = parseInt(tokens[0], 10);
    const monthStr = tokens[1];
    const year = parseInt(tokens[2], 10);

    const monthIdx = months[monthStr] !== undefined ? months[monthStr] : 4;
    return new Date(year, monthIdx, day);
  }

  const start = parseIndoDate(parts[0]);
  const end = parts.length > 1 ? parseIndoDate(parts[1]) : parseIndoDate(parts[0]);

  if (start && end) {
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }
  return null;
}

function formatIndoMonthShort(m) {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agt', 'Sep', 'Okt', 'Nov', 'Des'];
  return months[m] || '';
}
