// src/controllers/auth.js

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db/pool');

// ─── Token helpers ────────────────────────────────────────────────────────────

function signAccessToken(userId, email) {
  // Short-lived: 15 minutes
  // If stolen, expires fast. Refresh token (httpOnly cookie) gets a new one.
  return jwt.sign(
    { sub: userId, email },
    process.env.JWT_SECRET,
    { expiresIn: '15m' }
  );
}

function signRefreshToken(userId) {
  // Long-lived: 7 days. Stored in httpOnly cookie — JS can't read it (XSS protection).
  return jwt.sign(
    { sub: userId },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: '7d' }
  );
}

function setRefreshCookie(res, token) {
  res.cookie('refreshToken', token, {
    httpOnly: true,    // Not accessible via document.cookie
    secure: process.env.NODE_ENV === 'production',  // HTTPS only in prod
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000  // 7 days in ms
  });
}

// ─── Register ─────────────────────────────────────────────────────────────────

async function register(req, res) {
  const { email, password, name, branch, year } = req.body;

  // Basic validation — in production you'd use a schema validator (zod/joi)
  if (!email || !password || !name) {
    return res.status(400).json({ error: 'email, password, and name are required' });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  }

  try {
    // bcrypt cost factor 12: ~250ms hash time. Slow enough to resist brute force,
    // fast enough that users don't notice on registration.
    const hash = await bcrypt.hash(password, 12);

    const result = await pool.query(
      `INSERT INTO users (email, password_hash, name, branch, year)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, email, name`,
      [email.toLowerCase().trim(), hash, name.trim(), branch, year]
    );

    const user = result.rows[0];
    const accessToken = signAccessToken(user.id, user.email);
    const refreshToken = signRefreshToken(user.id);

    setRefreshCookie(res, refreshToken);

    return res.status(201).json({
      accessToken,
      user: { id: user.id, email: user.email, name: user.name }
    });

  } catch (err) {
    // Postgres unique violation code
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Email already registered' });
    }
    console.error('Register error:', err);
    return res.status(500).json({ error: 'Registration failed' });
  }
}

// ─── Login ────────────────────────────────────────────────────────────────────

async function login(req, res) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const result = await pool.query(
      'SELECT id, email, name, password_hash FROM users WHERE email = $1',
      [email.toLowerCase().trim()]
    );

    const user = result.rows[0];

    // Always run bcrypt.compare even if user not found.
    // This prevents timing attacks that reveal whether an email is registered.
    const dummyHash = '$2a$12$dummy.hash.to.prevent.timing.attacks.xxxxxxxxxx';
    const isValid = user
      ? await bcrypt.compare(password, user.password_hash)
      : await bcrypt.compare(password, dummyHash);

    if (!user || !isValid) {
      // Same error for both — don't reveal which was wrong
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const accessToken = signAccessToken(user.id, user.email);
    const refreshToken = signRefreshToken(user.id);

    setRefreshCookie(res, refreshToken);

    return res.json({
      accessToken,
      user: { id: user.id, email: user.email, name: user.name }
    });

  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Login failed' });
  }
}

// ─── Refresh token ────────────────────────────────────────────────────────────

async function refresh(req, res) {
  const token = req.cookies?.refreshToken;

  if (!token) {
    return res.status(401).json({ error: 'No refresh token' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_REFRESH_SECRET);

    // Verify user still exists (account might have been deleted)
    const result = await pool.query(
      'SELECT id, email FROM users WHERE id = $1',
      [payload.sub]
    );

    if (!result.rows[0]) {
      return res.status(401).json({ error: 'User not found' });
    }

    const user = result.rows[0];
    const newAccessToken = signAccessToken(user.id, user.email);

    return res.json({ accessToken: newAccessToken });

  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired refresh token' });
  }
}

// ─── Logout ───────────────────────────────────────────────────────────────────

function logout(req, res) {
  res.clearCookie('refreshToken');
  return res.json({ message: 'Logged out' });
}

module.exports = { register, login, refresh, logout };
