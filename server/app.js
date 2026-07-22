const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const path = require('path');

const env = require('./config/env');
const routes = require('./routes');
const errorHandler = require('./middleware/error');

const app = express();

// --- Global middleware ---
app.use(helmet());
app.use(
  cors({
    origin: env.CLIENT_ORIGIN, // restrict to the React client
    credentials: true, // allow the httpOnly refresh cookie
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
if (!env.isProd) app.use(morgan('dev'));

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
