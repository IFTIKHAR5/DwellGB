// app.js — the Express application (no network listening here, so tests can import it).
const dns = require('dns');

// Force Node.js to use Cloudflare and Google DNS to bypass local ISP blocks
try {
  dns.setServers(['1.1.1.1', '8.8.8.8']);
} catch (error) {
  console.error('DNS Override Failed:', error);
}
// app.js — the Express application (no network listening here, so tests can import it).
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const mongoSanitize = require('express-mongo-sanitize');
const morgan = require('morgan');
const mongoose = require('mongoose');

const env = require('./config/env');
const { apiLimiter } = require('./middleware/rateLimit');
const { notFound, errorHandler } = require('./middleware/error');
const { UPLOAD_ROOT } = require('./services/storage');

const app = express();

app.disable('x-powered-by');
// Behind a hosting proxy (Render, Nginx…) use the visitor's real IP — otherwise the login
// rate limit would count every visitor as the same person and lock everyone out.
if (env.isProd) app.set('trust proxy', 1);

// ---- security headers ----
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' }, // images are shown by the React app on another port
    contentSecurityPolicy: false, // API only returns JSON / images
  }),
);

// ---- CORS: only our own frontend; credentials: true lets the browser send the login cookie ----
app.use(cors({ origin: env.clientUrls, credentials: true }));

app.use(compression());
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: false, limit: '100kb' }));
app.use(cookieParser());
app.use(mongoSanitize()); // strips $ and . operators from user input (NoSQL injection)
if (!env.isTest) app.use(morgan(env.isProd ? 'combined' : 'dev'));

// ---- static uploads (images are re-encoded WebP; nosniff is set by helmet) ----
app.use(
  '/uploads',
  express.static(UPLOAD_ROOT, {
    maxAge: '30d',
    immutable: true,
    index: false,
    dotfiles: 'deny',
  }),
);

// ---- API ----
app.get('/api/health', (req, res) =>
  res.json({ status: 'ok', db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected', time: new Date().toISOString() }),
);

app.get('/api/config', (req, res) =>
  res.json({ googleEnabled: !!env.GOOGLE_CLIENT_ID }),
);

app.use('/api', apiLimiter);
app.use('/api/auth', require('./routes/auth'));
app.use('/api/listings', require('./routes/listings'));
app.use('/api/bookings', require('./routes/bookings'));
app.use('/api/reviews', require('./routes/reviews'));
app.use('/api/conversations', require('./routes/conversations'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/users', require('./routes/users'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/chat',require('./routes/chatbotRoutes'));

app.use(notFound);
app.use(errorHandler);

module.exports = app;
