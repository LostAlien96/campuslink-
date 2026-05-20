// src/controllers/groups.js

const pool = require('../db/pool');

// ─── Browse open groups ───────────────────────────────────────────────────────
async function browseGroups(req, res) {
  try {
    const result = await pool.query(
      `SELECT g.id, g.name, g.purpose, g.type, g.created_at,
         u.name AS creator_name,
         COUNT(gm.user_id) FILTER (WHERE gm.status = 'accepted') AS member_count
       FROM groups g
       JOIN users u ON u.id = g.creator_id
       LEFT JOIN group_members gm ON gm.group_id = g.id
       WHERE g.type = 'open'
       GROUP BY g.id, u.name
       ORDER BY g.created_at DESC
       LIMIT 30`
    );
    return res.json(result.rows);
  } catch (err) {
    console.error('Browse groups error:', err);
    return res.status(500).json({ error: 'Failed to fetch groups' });
  }
}

// ─── Create group ─────────────────────────────────────────────────────────────
async function createGroup(req, res) {
  const { name, purpose, type = 'open' } = req.body;
  const creatorId = req.user.id;

  if (!name) {
    return res.status(400).json({ error: 'Group name is required' });
  }

  const client = await pool.connect();
  try {
    // Transaction: create group + add creator as admin atomically
    // If either fails, both roll back. Creator must always be a member.
    await client.query('BEGIN');

    const groupResult = await client.query(
      `INSERT INTO groups (name, purpose, type, creator_id)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [name.trim(), purpose?.trim(), type, creatorId]
    );

    const group = groupResult.rows[0];

    // Creator is automatically an accepted admin
    await client.query(
      `INSERT INTO group_members (group_id, user_id, role, status)
       VALUES ($1, $2, 'admin', 'accepted')`,
      [group.id, creatorId]
    );

    await client.query('COMMIT');
    return res.status(201).json(group);

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Create group error:', err);
    return res.status(500).json({ error: 'Failed to create group' });
  } finally {
    client.release();
  }
}

// ─── Request to join group ────────────────────────────────────────────────────
async function requestJoin(req, res) {
  const { id: groupId } = req.params;
  const userId = req.user.id;

  try {
    const groupResult = await pool.query(
      'SELECT id, type FROM groups WHERE id = $1',
      [groupId]
    );

    if (!groupResult.rows[0]) {
      return res.status(404).json({ error: 'Group not found' });
    }

    // Check if already a member or has pending request
    const existing = await pool.query(
      'SELECT status FROM group_members WHERE group_id = $1 AND user_id = $2',
      [groupId, userId]
    );

    if (existing.rows.length > 0) {
      return res.status(409).json({ error: `Already ${existing.rows[0].status} in this group` });
    }

    // Open groups: auto-accept. Closed groups: pending for admin approval.
    const group = groupResult.rows[0];
    const status = group.type === 'open' ? 'accepted' : 'pending';

    await pool.query(
      `INSERT INTO group_members (group_id, user_id, role, status)
       VALUES ($1, $2, 'member', $3)`,
      [groupId, userId, status]
    );

    return res.status(201).json({ status, message: status === 'accepted' ? 'Joined!' : 'Request sent' });

  } catch (err) {
    console.error('Join group error:', err);
    return res.status(500).json({ error: 'Failed to join group' });
  }
}

// ─── Accept/reject join request (admin only) ──────────────────────────────────
async function respondToMember(req, res) {
  const { id: groupId, userId: targetUserId } = req.params;
  const { status } = req.body;
  const adminId = req.user.id;

  if (!['accepted', 'rejected'].includes(status)) {
    return res.status(400).json({ error: 'Status must be accepted or rejected' });
  }

  try {
    // Verify requester is an admin of this group
    const adminCheck = await pool.query(
      `SELECT role FROM group_members
       WHERE group_id = $1 AND user_id = $2 AND status = 'accepted'`,
      [groupId, adminId]
    );

    if (!adminCheck.rows[0] || adminCheck.rows[0].role !== 'admin') {
      return res.status(403).json({ error: 'Only group admins can respond to join requests' });
    }

    const result = await pool.query(
      `UPDATE group_members SET status = $1
       WHERE group_id = $2 AND user_id = $3
       RETURNING *`,
      [status, groupId, targetUserId]
    );

    if (!result.rows[0]) {
      return res.status(404).json({ error: 'Member request not found' });
    }

    return res.json(result.rows[0]);

  } catch (err) {
    console.error('Respond to member error:', err);
    return res.status(500).json({ error: 'Failed to update member status' });
  }
}

module.exports = { browseGroups, createGroup, requestJoin, respondToMember };
