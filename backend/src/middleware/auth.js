// src/middleware/auth.js
// Verifies JWT on every protected route.
// Attaches req.user = { id, email } so downstream handlers don't re-query.
//
// Why not sessions?
// Sessions require server-side storage (Redis or DB). JWTs are stateless —
// the token itself carries the claim. No lookup needed per request.
//
// Known tradeoff: JWTs can't be invalidated before expiry.
// Mitigation: short-lived access tokens (15min) + refresh tokens in httpOnly cookies.

const jwt = require('jsonwebtoken');

function authMiddleware(req, res, next) {
  // Token lives in Authorization header: "Bearer <token>"
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    // Attach to request — route handlers use req.user.id freely
    req.user = { id: payload.sub, email: payload.email };
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired', code: 'TOKEN_EXPIRED' });
    }
    return res.status(401).json({ error: 'Invalid token' });
  }
}

module.exports = authMiddleware;
