// src/index.js
// Middleware order matters. Each layer has a deliberate reason.

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');

const app = express();

// ─── 1. CORS ──────────────────────────────────────────────────────────────────
// Only allow requests from our frontend origin.
// credentials: true is required to send/receive httpOnly cookies (refresh tokens).
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));

// ─── 2. Body parsing ──────────────────────────────────────────────────────────
app.use(express.json({ limit: '10kb' })); // Reject huge payloads
app.use(cookieParser());

// ─── 3. Rate limiting ─────────────────────────────────────────────────────────
// General limit: 100 req/15min per IP
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later' }
});

// Strict limit for connection requests: prevents spam
const connectionLimiter = rateLimit({
  windowMs: 60 * 1000,   // 1 minute
  max: 10,               // 10 requests per minute
  keyGenerator: (req) => req.user?.id || req.ip,  // Per user, not IP
  message: { error: 'Too many connection requests, slow down' }
});

app.use(generalLimiter);

// ─── 4. Routes ────────────────────────────────────────────────────────────────
app.use('/auth',        require('./routes/auth'));
app.use('/users',       require('./routes/users'));

// Apply strict rate limit specifically to POST /connections
app.use('/connections', (req, res, next) => {
  if (req.method === 'POST') return connectionLimiter(req, res, next);
  next();
});
app.use('/connections', require('./routes/connections'));
app.use('/groups',      require('./routes/groups'));

// Health check — Railway and Vercel use this
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// ─── 5. 404 handler ───────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found` });
});

// ─── 6. Global error handler ──────────────────────────────────────────────────
// Catches anything that slips through without a try/catch.
// Always returns clean JSON — never leaks stack traces to clients.
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Something went wrong' });
});

// ─── Start ────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;

if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`CampusLink API running on port ${PORT}`);
  });
}

module.exports = app;