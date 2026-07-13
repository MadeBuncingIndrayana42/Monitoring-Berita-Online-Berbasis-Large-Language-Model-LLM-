/* ============================================
   PR Dashboard - Media Monitoring
   TEMPLATE KONFIGURASI (config.example.js)

   ✅  File ini AMAN untuk di-commit ke GitHub.
       Salin file ini menjadi config.js dan isi
       dengan nilai konfigurasi Anda yang sebenarnya.

   Langkah setup:
   1. Salin file ini: cp js/config.example.js js/config.js
   2. Isi nilai di config.js dengan konfigurasi Anda
   3. JANGAN commit file config.js ke Git
   ============================================ */

const APP_CONFIG = {
  /**
   * Google OAuth 2.0 Client ID
   * Dapatkan dari: https://console.cloud.google.com/
   * APIs & Services → Credentials → OAuth 2.0 Client IDs
   * Tambahkan URL deployment Anda ke "Authorized JavaScript origins"
   *
   * Contoh: '123456789-abcdefg.apps.googleusercontent.com'
   */
  GOOGLE_CLIENT_ID: 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com',

  /**
   * URL CSV Google Sheets (Published to Web)
   * Cara mendapatkan:
   *   1. Buka Google Sheets Anda
   *   2. File → Share → Publish to web
   *   3. Pilih sheet yang sesuai, format: CSV
   *   4. Klik Publish dan copy URL-nya
   *
   * Contoh: 'https://docs.google.com/spreadsheets/d/e/YOUR_ID/pub?output=csv'
   */
  GOOGLE_SHEETS_CSV_URL: 'https://docs.google.com/spreadsheets/d/e/YOUR_SHEET_ID/pub?output=csv',
};
