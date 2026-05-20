// src/db/pool.js
// Single pool instance — shared across all route handlers.
// Why a pool? Opening a new DB connection per request is expensive (~100ms).
// A pool keeps N connections warm and reuses them.

const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  },
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  console.error('Unexpected DB pool error:', err.message);
});

module.exports = pool;
