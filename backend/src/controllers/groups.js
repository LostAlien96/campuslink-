const pool = require('../db/pool');

// ─── Browse open groups ───────────────────────────────────────────
// WhatsApp link is NEVER returned here — user isn't a member yet
async function browseGroups(req, res) {
  try {
    const result = await pool.query(
      `SELECT g.id, g.name, g.purpose, g.type, g.created_at,
         u.id AS creator_id,
         u.name AS creator_name,
         COUNT(gm.user_id) FILTER (WHERE gm.status = 'accepted') AS member_count
       FROM groups g
       JOIN users u ON u.id = g.creator_id
       LEFT JOIN group_members gm ON gm.group_id = g.id
       GROUP BY g.id, u.id, u.name
       ORDER BY g.created_at DESC
       LIMIT 50`
    );
    return res.json(result.rows);
  } catch (err) {
    console.error('Browse groups error:', err);
    return res.status(500).json({ error: 'Failed to fetch groups' });
  }
}

// ─── Get single group ─────────────────────────────────────────────
// WhatsApp link only returned if requester is an accepted member
async function getGroup(req, res) {
  const { id } = req.params;
  const userId = req.user.id;

  try {
    const groupResult = await pool.query(
      `SELECT g.*, u.name AS creator_name,
         COUNT(gm.user_id) FILTER (WHERE gm.status = 'accepted') AS member_count
       FROM groups g
       JOIN users u ON u.id = g.creator_id
       LEFT JOIN group_members gm ON gm.group_id = g.id
       WHERE g.id = $1
       GROUP BY g.id, u.name`,
      [id]
    );

    if (!groupResult.rows[0]) {
      return res.status(404).json({ error: 'Group not found' });
    }

    const group = groupResult.rows[0];

    // Check if requester is an accepted member
    const memberCheck = await pool.query(
      `SELECT role FROM group_members
       WHERE group_id = $1 AND user_id = $2 AND status = 'accepted'`,
      [id, userId]
    );

    const isMember = memberCheck.rows.length > 0;
    const role = memberCheck.rows[0]?.role || null;

    // Hide WhatsApp link from non-members
    if (!isMember) {
      delete group.whatsapp_link;
    }

    // Get members list (only for accepted members)
    let members = [];
    if (isMember) {
      const membersResult = await pool.query(
        `SELECT u.id, u.name, u.branch, u.year, gm.role, gm.joined_at,
           COALESCE(json_agg(json_build_object('name', s.name, 'level', s.level))
             FILTER (WHERE s.id IS NOT NULL), '[]') AS skills
         FROM group_members gm
         JOIN users u ON u.id = gm.user_id
         LEFT JOIN skills s ON s.user_id = u.id
         WHERE gm.group_id = $1 AND gm.status = 'accepted'
         GROUP BY u.id, u.name, u.branch, u.year, gm.role, gm.joined_at
         ORDER BY gm.role DESC, gm.joined_at ASC`,
        [id]
      );
      members = membersResult.rows;
    }

    // Get pending requests (only for admins)
    let pendingRequests = [];
    if (role === 'admin') {
      const pendingResult = await pool.query(
        `SELECT u.id, u.name, u.branch, u.year, gm.joined_at AS requested_at,
           COALESCE(json_agg(json_build_object('name', s.name, 'level', s.level))
             FILTER (WHERE s.id IS NOT NULL), '[]') AS skills
         FROM group_members gm
         JOIN users u ON u.id = gm.user_id
         LEFT JOIN skills s ON s.user_id = u.id
         WHERE gm.group_id = $1 AND gm.status = 'pending'
         GROUP BY u.id, u.name, u.branch, u.year, gm.joined_at
         ORDER BY gm.joined_at ASC`,
        [id]
      );
      pendingRequests = pendingResult.rows;
    }

    return res.json({
      ...group,
      isMember,
      role,
      members,
      pendingRequests,
    });

  } catch (err) {
    console.error('Get group error:', err);
    return res.status(500).json({ error: 'Failed to fetch group' });
  }
}

// ─── Create group ─────────────────────────────────────────────────
async function createGroup(req, res) {
  const { name, purpose, type = 'open', whatsapp_link } = req.body;
  const creatorId = req.user.id;

  if (!name) {
    return res.status(400).json({ error: 'Group name is required' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const groupResult = await client.query(
      `INSERT INTO groups (name, purpose, type, creator_id, whatsapp_link)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [name.trim(), purpose?.trim(), type, creatorId, whatsapp_link?.trim() || null]
    );

    const group = groupResult.rows[0];

    // Creator is automatically accepted admin
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

// ─── Update group (admin only) ────────────────────────────────────
async function updateGroup(req, res) {
  const { id } = req.params;
  const { name, purpose, whatsapp_link } = req.body;
  const userId = req.user.id;

  try {
    // Only admins can update
    const adminCheck = await pool.query(
      `SELECT role FROM group_members
       WHERE group_id = $1 AND user_id = $2 AND status = 'accepted' AND role = 'admin'`,
      [id, userId]
    );

    if (!adminCheck.rows[0]) {
      return res.status(403).json({ error: 'Only admins can update group details' });
    }

    const result = await pool.query(
      `UPDATE groups
       SET name = COALESCE($1, name),
           purpose = COALESCE($2, purpose),
           whatsapp_link = $3
       WHERE id = $4
       RETURNING *`,
      [name?.trim(), purpose?.trim(), whatsapp_link?.trim() || null, id]
    );

    return res.json(result.rows[0]);
  } catch (err) {
    console.error('Update group error:', err);
    return res.status(500).json({ error: 'Failed to update group' });
  }
}

// ─── Request to join ──────────────────────────────────────────────
// ALL groups now require admin approval — no auto-join
async function requestJoin(req, res) {
  const { id: groupId } = req.params;
  const userId = req.user.id;

  try {
    const groupResult = await pool.query(
      'SELECT id FROM groups WHERE id = $1',
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
      return res.status(409).json({
        error: existing.rows[0].status === 'accepted'
          ? 'You are already a member'
          : 'You already have a pending request'
      });
    }

    // Always pending — admin must approve
    await pool.query(
      `INSERT INTO group_members (group_id, user_id, role, status)
       VALUES ($1, $2, 'member', 'pending')`,
      [groupId, userId]
    );

    return res.status(201).json({
      status: 'pending',
      message: 'Request sent — waiting for admin approval'
    });

  } catch (err) {
    console.error('Join group error:', err);
    return res.status(500).json({ error: 'Failed to request join' });
  }
}

// ─── Approve or reject join request (admin only) ──────────────────
async function respondToMember(req, res) {
  const { id: groupId, userId: targetUserId } = req.params;
  const { status } = req.body;
  const adminId = req.user.id;

  if (!['accepted', 'rejected'].includes(status)) {
    return res.status(400).json({ error: 'Status must be accepted or rejected' });
  }

  try {
    // Must be an accepted admin
    const adminCheck = await pool.query(
      `SELECT role FROM group_members
       WHERE group_id = $1 AND user_id = $2 AND status = 'accepted' AND role = 'admin'`,
      [groupId, adminId]
    );

    if (!adminCheck.rows[0]) {
      return res.status(403).json({ error: 'Only admins can approve or reject requests' });
    }

    const result = await pool.query(
      `UPDATE group_members SET status = $1
       WHERE group_id = $2 AND user_id = $3 AND status = 'pending'
       RETURNING *`,
      [status, groupId, targetUserId]
    );

    if (!result.rows[0]) {
      return res.status(404).json({ error: 'Pending request not found' });
    }

    return res.json(result.rows[0]);

  } catch (err) {
    console.error('Respond to member error:', err);
    return res.status(500).json({ error: 'Failed to update member status' });
  }
}

// ─── Promote member to admin ──────────────────────────────────────
async function promoteMember(req, res) {
  const { id: groupId, userId: targetUserId } = req.params;
  const adminId = req.user.id;

  try {
    // Only existing admins can promote
    const adminCheck = await pool.query(
      `SELECT role FROM group_members
       WHERE group_id = $1 AND user_id = $2 AND status = 'accepted' AND role = 'admin'`,
      [groupId, adminId]
    );

    if (!adminCheck.rows[0]) {
      return res.status(403).json({ error: 'Only admins can promote members' });
    }

    const result = await pool.query(
      `UPDATE group_members SET role = 'admin'
       WHERE group_id = $1 AND user_id = $2 AND status = 'accepted'
       RETURNING *`,
      [groupId, targetUserId]
    );

    if (!result.rows[0]) {
      return res.status(404).json({ error: 'Member not found' });
    }

    return res.json(result.rows[0]);

  } catch (err) {
    console.error('Promote member error:', err);
    return res.status(500).json({ error: 'Failed to promote member' });
  }
}

module.exports = {
  browseGroups, getGroup, createGroup, updateGroup,
  requestJoin, respondToMember, promoteMember
};