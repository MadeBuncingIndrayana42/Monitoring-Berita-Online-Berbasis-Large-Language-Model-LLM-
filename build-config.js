/**
 * build-config.js
 * ============================================
 * Script build Netlify: membuat js/config.js
 * secara otomatis dari Environment Variables.
 *
 * Environment variables yang dibutuhkan di Netlify:
 *   - GOOGLE_CLIENT_ID
 *   - GOOGLE_SHEETS_CSV_URL
 * ============================================
 */

const fs = require('fs');
const path = require('path');

// Baca dari environment variables Netlify
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const GOOGLE_SHEETS_CSV_URL = process.env.GOOGLE_SHEETS_CSV_URL || '';

// Validasi
if (!GOOGLE_CLIENT_ID) {
  console.error('❌ ERROR: Environment variable GOOGLE_CLIENT_ID tidak ditemukan!');
  console.error('   Tambahkan di Netlify: Site Settings → Environment Variables');
  process.exit(1);
}

if (!GOOGLE_SHEETS_CSV_URL) {
  console.warn('⚠️  WARNING: GOOGLE_SHEETS_CSV_URL tidak ditemukan, menggunakan string kosong.');
}

// Generate isi file config.js
const configContent = `/* ============================================
   PR Dashboard - Media Monitoring
   KONFIGURASI SENSITIF (config.js)

   ⚠️  FILE INI DI-GENERATE OTOMATIS SAAT BUILD.
       Jangan edit manual. Ubah melalui:
       Netlify → Site Settings → Environment Variables
   ============================================ */

const APP_CONFIG = {
  /**
   * Google OAuth 2.0 Client ID
   */
  GOOGLE_CLIENT_ID: '${GOOGLE_CLIENT_ID}',

  /**
   * URL CSV Google Sheets (Published to Web)
   */
  GOOGLE_SHEETS_CSV_URL: '${GOOGLE_SHEETS_CSV_URL}',
};
`;

// Tulis ke js/config.js
const outputPath = path.join(__dirname, 'js', 'config.js');
fs.writeFileSync(outputPath, configContent, 'utf8');

console.log('✅ js/config.js berhasil di-generate dari environment variables.');
console.log(`   GOOGLE_CLIENT_ID  : ${GOOGLE_CLIENT_ID.substring(0, 20)}...`);
console.log(`   GOOGLE_SHEETS_URL : ${GOOGLE_SHEETS_CSV_URL.substring(0, 40)}...`);
