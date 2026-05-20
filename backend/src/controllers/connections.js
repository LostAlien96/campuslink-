// src/controllers/connections.js
//
// This is the most technically important part of the system.
// Every step in the request flow is deliberate — worth explaining in interviews.

const pool = require('../db/pool');

// ─── Send connection request ──────────────────────────────────────────────────
// POST /connections
// Body: { receiverId, message }
//
// Flow:
// 1. Validate receiver exists
// 2. Check if a connection row already exists (either direction)
// 3. Insert with status=pending
// 4. DB unique index is a second layer of duplicate protection

async function sendRequest(req, res) {
  const senderId = req.user.id;
  const { receiverId, message } = req.body;

  if (!receiverId) {
    return res.status(400).json({ error: 'receiverId is required' });
  }

  if (senderId === receiverId) {
    return res.status(400).json({ error: 'You cannot connect with yourself' });
  }

  try {
    // Step 1: Verify receiver exists
    const receiverCheck = await pool.query(
      'SELECT id FROM users WHERE id = $1',
      [receiverId]
    );
    if (!receiverCheck.rows[0]) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Step 2: Application-level duplicate check
    // Checks both directions: A→B and B→A
    // Why check both? If B already requested A, we shouldn't create a parallel row.
    const existing = await pool.query(
      `SELECT id, status FROM connections
       WHERE (sender_id = $1 AND receiver_id = $2)
          OR (sender_id = $2 AND receiver_id = $1)`,
      [senderId, receiverId]
    );

    if (existing.rows.length > 0) {
      const conn = existing.rows[0];
      if (conn.status === 'pending') {
        return res.status(409).json({ error: 'A request is already pending' });
      }
      if (conn.status === 'accepted') {
        return res.status(409).json({ error: 'You are already connected' });
      }
      if (conn.status === 'rejected') {
        // Rejected rows stay to prevent spam. The sender knows not to try again.
        return res.status(409).json({ error: 'This request was previously declined' });
      }
    }

    // Step 3: Insert — DB unique index is second layer of protection
    const result = await pool.query(
      `INSERT INTO connections (sender_id, receiver_id, status, message)
       VALUES ($1, $2, 'pending', $3)
       RETURNING id, status, created_at`,
      [senderId, receiverId, message?.trim() || null]
    );

    return res.status(201).json(result.rows[0]);

  } catch (err) {
    // Postgres unique violation — the DB index caught a race condition
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Connection request already exists' });
    }
    console.error('Send connection error:', err);
    return res.status(500).json({ error: 'Failed to send request' });
  }
}

// ─── Respond to request ───────────────────────────────────────────────────────
// PUT /connections/:id
// Body: { status: "accepted" | "rejected" }
//
// Authorization check is critical here:
// The JWT user must be the RECEIVER of this connection, not the sender.
// Without this check, any user could accept anyone else's requests.

async function respondToRequest(req, res) {
  const { id } = req.params;
  const { status } = req.body;
  const currentUserId = req.user.id;

  if (!['accepted', 'rejected'].includes(status)) {
    return res.status(400).json({ error: 'Status must be accepted or rejected' });
  }

  try {
    // Fetch the connection row
    const result = await pool.query(
      'SELECT * FROM connections WHERE id = $1',
      [id]
    );

    if (!result.rows[0]) {
      return res.status(404).json({ error: 'Connection not found' });
    }

    const connection = result.rows[0];

    // Authorization: only the receiver can respond
    if (connection.receiver_id !== currentUserId) {
      return res.status(403).json({ error: 'Not authorized to respond to this request' });
    }

    // Can only respond to pending requests
    if (connection.status !== 'pending') {
      return res.status(409).json({ error: `Request is already ${connection.status}` });
    }

    const updated = await pool.query(
      `UPDATE connections SET status = $1, updated_at = now()
       WHERE id = $2
       RETURNING id, status, updated_at`,
      [status, id]
    );

    return res.json(updated.rows[0]);

  } catch (err) {
    console.error('Respond to connection error:', err);
    return res.status(500).json({ error: 'Failed to update request' });
  }
}

// ─── My connections ───────────────────────────────────────────────────────────
// GET /connections/me?type=received|sent|accepted

async function myConnections(req, res) {
  const userId = req.user.id;
  const { type = 'received' } = req.query;

  try {
    let query;

    if (type === 'accepted') {
      // All accepted connections — show both sent and received
      query = `
        SELECT c.id, c.status, c.message, c.created_at,
          CASE
            WHEN c.sender_id = $1 THEN u.id
            ELSE u2.id
          END AS peer_id,
          CASE
            WHEN c.sender_id = $1 THEN u.name
            ELSE u2.name
          END AS peer_name,
          CASE
            WHEN c.sender_id = $1 THEN u.branch
            ELSE u2.branch
          END AS peer_branch
        FROM connections c
        JOIN users u  ON u.id  = c.receiver_id
        JOIN users u2 ON u2.id = c.sender_id
        WHERE (c.sender_id = $1 OR c.receiver_id = $1)
          AND c.status = 'accepted'
        ORDER BY c.updated_at DESC
      `;
    } else if (type === 'sent') {
      query = `
        SELECT c.id, c.status, c.message, c.created_at,
          u.id AS peer_id, u.name AS peer_name, u.branch AS peer_branch
        FROM connections c
        JOIN users u ON u.id = c.receiver_id
        WHERE c.sender_id = $1
        ORDER BY c.created_at DESC
      `;
    } else {
      // received (default) — show pending requests for the inbox
      query = `
        SELECT c.id, c.status, c.message, c.created_at,
          u.id AS peer_id, u.name AS peer_name, u.branch AS peer_branch,
          COALESCE(json_agg(json_build_object('name', s.name, 'level', s.level))
            FILTER (WHERE s.id IS NOT NULL), '[]') AS peer_skills
        FROM connections c
        JOIN users u ON u.id = c.sender_id
        LEFT JOIN skills s ON s.user_id = u.id
        WHERE c.receiver_id = $1 AND c.status = 'pending'
        GROUP BY c.id, u.id
        ORDER BY c.created_at DESC
      `;
    }

    const result = await pool.query(query, [userId]);
    return res.json(result.rows);

  } catch (err) {
    console.error('Get connections error:', err);
    return res.status(500).json({ error: 'Failed to fetch connections' });
  }
}

module.exports = { sendRequest, respondToRequest, myConnections };
