const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const path = require('path');

const env = require('./config/env');
const routes = require('./routes');
const errorHandler = require('./middleware/error');
const { apiLimiter, authLimiter } = require('./middleware/rateLimit');

const app = express();

// Behind a reverse proxy in production (needed for correct client IPs in
// rate-limiting and for Secure cookies).
if (env.isProd) app.set('trust proxy', 1);

// --- Global middleware ---
// Allow the SPA (served from a different origin) to embed API-served images
// (service photos, avatars) via <img>. Without this, Helmet's default
// Cross-Origin-Resource-Policy: same-origin blocks them (ERR_BLOCKED_BY_RESPONSE.NotSameOrigin).
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);
app.use(
  cors({
    origin: env.CLIENT_ORIGIN, // restrict to the React client
    credentials: true, // allow the httpOnly refresh cookie
  })
);
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(cookieParser());
if (!env.isProd) app.use(morgan('dev'));

// --- Rate limiting ---
app.use('/api', apiLimiter); // lenient global ceiling
app.use('/api/auth', authLimiter); // strict on auth endpoints

// --- Static: uploaded images (served at /uploads/*) ---
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// --- API routes (mounted under /api) ---
app.use('/api', routes);

// --- Serve the built React client (single-dyno deploy, e.g. Heroku) ---
// In production the client is built to client/dist and served from this same
// origin, so the SPA and API share a host (no CORS needed for the app itself).
if (env.isProd) {
  const clientDist = path.join(__dirname, '..', 'client', 'dist');
  app.use(express.static(clientDist));

  // SPA fallback: any non-API GET returns index.html so client-side routing works.
  app.use((req, res, next) => {
    if (req.method !== 'GET' || req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
      return next();
    }
    return res.sendFile(path.join(clientDist, 'index.html'));
  });
}

// --- 404 for unknown routes ---
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

// --- Central error handler (must be last) ---
app.use(errorHandler);

module.exports = app;
