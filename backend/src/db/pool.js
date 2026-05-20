// src/db/pool.js
// Single pool instance — shared across all route handlers.
// Why a pool? Opening a new DB connection per request is expensive (~100ms).
// A pool keeps N connections warm and reuses them.

const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Keep 10 connections warm. For a college app this is plenty.
  // In production you'd tune this based on DB plan limits.
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Fail loud on startup if DB is unreachable
pool.on('error', (err) => {
  console.error('Unexpected DB pool error:', err.message);
});

module.exports = pool;
