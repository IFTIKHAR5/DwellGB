// config/env.js — reads settings from backend/.env once, with safe local defaults.
// Always backend/.env, even when a script is started from another folder.
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: Number(process.env.PORT) || 5000,
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/dwellgb',

  // The React app(s) allowed to call this API (comma separated).
  CLIENT_URLS: process.env.CLIENT_URLS || 'http://localhost:5173',

  JWT_SECRET: process.env.JWT_SECRET || '',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',

  // Optional: Google sign-in. Leave empty to hide the Google button.
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || '',
  // Optional: the mobile app's own Google client IDs (Android / iPhone builds), comma separated.
  GOOGLE_APP_CLIENT_IDS: process.env.GOOGLE_APP_CLIENT_IDS || '',
};

env.isProd = env.NODE_ENV === 'production';
env.isTest = env.NODE_ENV === 'test';
// Every Google client ID whose sign-in tokens we accept: the website's + the app's.
env.googleAudiences = [env.GOOGLE_CLIENT_ID, ...env.GOOGLE_APP_CLIENT_IDS.split(',')].map((id) => id.trim()).filter(Boolean);
env.clientUrls = env.CLIENT_URLS.split(',').map((url) => url.trim()).filter(Boolean);
// While developing, also allow the mobile app's browser preview (Expo web, port 8081).
if (!env.isProd && !env.clientUrls.includes('http://localhost:8081')) env.clientUrls.push('http://localhost:8081');

if (env.JWT_SECRET.length < 16) {
  console.error('\nPlease set JWT_SECRET in backend/.env (at least 16 characters).');
  console.error('   Generate one with: node -e "console.log(require(\'crypto\').randomBytes(48).toString(\'hex\'))"\n');
  process.exit(1);
}

module.exports = env;
