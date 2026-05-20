// src/controllers/users.js

const pool = require('../db/pool');

// ─── Browse users (with skill/year filters) ───────────────────────────────────
// GET /users?skill=React&level=building&year=3
//
// This is the most performance-sensitive query. Index on skills(name, level)
// makes the JOIN fast. For 10k users this is still sub-10ms.

async function browseUsers(req, res) {
  const { skill, level, year } = req.query;
  const currentUserId = req.user.id;

  try {
    let query, params;

    if (skill) {
      // Filter by skill — join skills table
      // We exclude the requesting user from results
      query = `
        SELECT DISTINCT u.id, u.name, u.branch, u.year, u.bio, u.avatar_url,
          json_agg(json_build_object('name', s.name, 'level', s.level)) AS skills
        FROM users u
        JOIN skills s ON s.user_id = u.id
        WHERE u.id != $1
          AND s.name ILIKE $2
          ${level ? 'AND s.level = $3' : ''}
          ${year ? `AND u.year = $${level ? 4 : 3}` : ''}
        GROUP BY u.id
        ORDER BY u.name
        LIMIT 50
      `;
      params = level
        ? [currentUserId, skill, level, ...(year ? [year] : [])]
        : [currentUserId, skill, ...(year ? [year] : [])];
    } else {
      // No skill filter — return all users with their skills aggregated
      query = `
        SELECT u.id, u.name, u.branch, u.year, u.bio, u.avatar_url,
          COALESCE(json_agg(json_build_object('name', s.name, 'level', s.level))
            FILTER (WHERE s.id IS NOT NULL), '[]') AS skills
        FROM users u
        LEFT JOIN skills s ON s.user_id = u.id
        WHERE u.id != $1
          ${year ? 'AND u.year = $2' : ''}
        GROUP BY u.id
        ORDER BY u.name
        LIMIT 50
      `;
      params = year ? [currentUserId, year] : [currentUserId];
    }

    const result = await pool.query(query, params);
    return res.json(result.rows);

  } catch (err) {
    console.error('Browse users error:', err);
    return res.status(500).json({ error: 'Failed to fetch users' });
  }
}

// ─── Get single profile ───────────────────────────────────────────────────────
// GET /users/:id

async function getUser(req, res) {
  const { id } = req.params;

  try {
    const userResult = await pool.query(
      `SELECT u.id, u.name, u.branch, u.year, u.bio, u.avatar_url, u.created_at,
         COALESCE(json_agg(json_build_object('id', s.id, 'name', s.name, 'level', s.level))
           FILTER (WHERE s.id IS NOT NULL), '[]') AS skills
       FROM users u
       LEFT JOIN skills s ON s.user_id = u.id
       WHERE u.id = $1
       GROUP BY u.id`,
      [id]
    );

    if (!userResult.rows[0]) {
      return res.status(404).json({ error: 'User not found' });
    }

    // If viewing another user, also return current connection status
    const connectionResult = await pool.query(
      `SELECT id, status, sender_id
       FROM connections
       WHERE (sender_id = $1 AND receiver_id = $2)
          OR (sender_id = $2 AND receiver_id = $1)`,
      [req.user.id, id]
    );

    const profile = userResult.rows[0];
    const connection = connectionResult.rows[0] || null;

    return res.json({
      ...profile,
      connectionStatus: connection
        ? {
            status: connection.status,
            isSender: connection.sender_id === req.user.id
          }
        : null
    });

  } catch (err) {
    console.error('Get user error:', err);
    return res.status(500).json({ error: 'Failed to fetch user' });
  }
}

// ─── Update own profile ───────────────────────────────────────────────────────
// PUT /users/me

async function updateMe(req, res) {
  const { name, bio, branch, year, avatar_url } = req.body;
  const userId = req.user.id;

  try {
    const result = await pool.query(
      `UPDATE users
       SET name = COALESCE($1, name),
           bio = COALESCE($2, bio),
           branch = COALESCE($3, branch),
           year = COALESCE($4, year),
           avatar_url = COALESCE($5, avatar_url),
           updated_at = now()
       WHERE id = $6
       RETURNING id, email, name, bio, branch, year, avatar_url`,
      [name, bio, branch, year, avatar_url, userId]
    );

    return res.json(result.rows[0]);
  } catch (err) {
    console.error('Update profile error:', err);
    return res.status(500).json({ error: 'Failed to update profile' });
  }
}

// ─── Add skill ────────────────────────────────────────────────────────────────
// POST /users/me/skills

async function addSkill(req, res) {
  const { name, level } = req.body;
  const userId = req.user.id;

  if (!name || !level) {
    return res.status(400).json({ error: 'Skill name and level are required' });
  }

  const validLevels = ['curious', 'learning', 'building', 'strong'];
  if (!validLevels.includes(level)) {
    return res.status(400).json({ error: `Level must be one of: ${validLevels.join(', ')}` });
  }

  try {
    // Check for duplicate skill name for this user
    const existing = await pool.query(
      'SELECT id FROM skills WHERE user_id = $1 AND name ILIKE $2',
      [userId, name]
    );

    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'You already have this skill' });
    }

    const result = await pool.query(
      'INSERT INTO skills (user_id, name, level) VALUES ($1, $2, $3) RETURNING *',
      [userId, name.trim(), level]
    );

    return res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Add skill error:', err);
    return res.status(500).json({ error: 'Failed to add skill' });
  }
}

// ─── Delete skill ─────────────────────────────────────────────────────────────
// DELETE /users/me/skills/:skillId

async function deleteSkill(req, res) {
  const { skillId } = req.params;
  const userId = req.user.id;

  try {
    const result = await pool.query(
      'DELETE FROM skills WHERE id = $1 AND user_id = $2 RETURNING id',
      [skillId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Skill not found' });
    }

    return res.json({ deleted: true });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to delete skill' });
  }
}

module.exports = { browseUsers, getUser, updateMe, addSkill, deleteSkill };
