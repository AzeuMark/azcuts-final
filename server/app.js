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
app.use(helmet());
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
