const pool = require('../db/pool');

// ─── Browse users ─────────────────────────────────────────────────────────────
async function browseUsers(req, res) {
  const { skill, level, year } = req.query;
  const currentUserId = req.user.id;

  try {
    let query, params;

    if (skill) {
      query = `
        SELECT DISTINCT u.id, u.name, u.branch, u.year, u.bio,
          u.college, u.location, u.avatar_url,
          json_agg(json_build_object('name', s.name, 'level', s.level)) AS skills
        FROM users u
        JOIN skills s ON s.user_id = u.id
        WHERE u.id != $1
          AND s.name ILIKE $2
          ${level ? 'AND s.level = $3' : ''}
          ${year  ? `AND u.year = $${level ? 4 : 3}` : ''}
        GROUP BY u.id
        ORDER BY u.name
        LIMIT 50
      `;
      params = level
        ? [currentUserId, skill, level, ...(year ? [year] : [])]
        : [currentUserId, skill, ...(year ? [year] : [])];
    } else {
      query = `
        SELECT u.id, u.name, u.branch, u.year, u.bio,
          u.college, u.location, u.avatar_url,
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

// ─── Get single user ──────────────────────────────────────────────────────────
async function getUser(req, res) {
  const { id } = req.params;

  try {
    const userResult = await pool.query(
      `SELECT u.id, u.name, u.branch, u.year, u.bio, u.avatar_url,
         u.college, u.location, u.cgpa,
         u.github_url, u.linkedin_url, u.twitter_url, u.website_url,
         u.created_at,
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

    const connectionResult = await pool.query(
      `SELECT id, status, sender_id FROM connections
       WHERE (sender_id = $1 AND receiver_id = $2)
          OR (sender_id = $2 AND receiver_id = $1)`,
      [req.user.id, id]
    );

    const profile = userResult.rows[0];
    const connection = connectionResult.rows[0] || null;

    return res.json({
      ...profile,
      connectionStatus: connection
        ? { status: connection.status, isSender: connection.sender_id === req.user.id }
        : null
    });
  } catch (err) {
    console.error('Get user error:', err);
    return res.status(500).json({ error: 'Failed to fetch user' });
  }
}

// ─── Get my own full profile ──────────────────────────────────────────────────
async function getMe(req, res) {
  const userId = req.user.id;
  try {
    const result = await pool.query(
      `SELECT u.id, u.email, u.name, u.branch, u.year, u.bio, u.avatar_url,
         u.college, u.location, u.cgpa,
         u.github_url, u.linkedin_url, u.twitter_url, u.website_url,
         u.created_at,
         COALESCE(json_agg(json_build_object('id', s.id, 'name', s.name, 'level', s.level))
           FILTER (WHERE s.id IS NOT NULL), '[]') AS skills
       FROM users u
       LEFT JOIN skills s ON s.user_id = u.id
       WHERE u.id = $1
       GROUP BY u.id`,
      [userId]
    );
    return res.json(result.rows[0]);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch profile' });
  }
}

// ─── Update own profile ───────────────────────────────────────────────────────
async function updateMe(req, res) {
  const {
    name, bio, branch, year, avatar_url,
    college, location, cgpa,
    github_url, linkedin_url, twitter_url, website_url
  } = req.body;
  const userId = req.user.id;

  // Validate CGPA if provided
  if (cgpa !== undefined && cgpa !== null && cgpa !== '') {
    const cgpaNum = parseFloat(cgpa);
    if (isNaN(cgpaNum) || cgpaNum < 0 || cgpaNum > 10) {
      return res.status(400).json({ error: 'CGPA must be between 0 and 10' });
    }
  }

  // Basic URL validation helper
  const isValidUrl = (url) => {
    if (!url) return true;
    try { new URL(url); return true; } catch { return false; }
  };

  for (const [field, url] of [
    ['github_url', github_url],
    ['linkedin_url', linkedin_url],
    ['twitter_url', twitter_url],
    ['website_url', website_url],
  ]) {
    if (url && !isValidUrl(url)) {
      return res.status(400).json({ error: `Invalid URL for ${field}` });
    }
  }

  try {
    const result = await pool.query(
      `UPDATE users SET
         name         = COALESCE($1,  name),
         bio          = COALESCE($2,  bio),
         branch       = COALESCE($3,  branch),
         year         = COALESCE($4,  year),
         avatar_url   = COALESCE($5,  avatar_url),
         college      = COALESCE($6,  college),
         location     = COALESCE($7,  location),
         cgpa         = COALESCE($8,  cgpa),
         github_url   = $9,
         linkedin_url = $10,
         twitter_url  = $11,
         website_url  = $12,
         updated_at   = now()
       WHERE id = $13
       RETURNING id, email, name, bio, branch, year, avatar_url,
                 college, location, cgpa,
                 github_url, linkedin_url, twitter_url, website_url`,
      [
        name, bio, branch, year, avatar_url,
        college, location,
        cgpa !== '' ? cgpa : null,
        github_url   || null,
        linkedin_url || null,
        twitter_url  || null,
        website_url  || null,
        userId
      ]
    );
    return res.json(result.rows[0]);
  } catch (err) {
    console.error('Update profile error:', err);
    return res.status(500).json({ error: 'Failed to update profile' });
  }
}

// ─── Add skill ────────────────────────────────────────────────────────────────
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
    return res.status(500).json({ error: 'Failed to add skill' });
  }
}

// ─── Delete skill ─────────────────────────────────────────────────────────────
async function deleteSkill(req, res) {
  const { skillId } = req.params;
  const userId = req.user.id;
  try {
    const result = await pool.query(
      'DELETE FROM skills WHERE id = $1 AND user_id = $2 RETURNING id',
      [skillId, userId]
    );
    if (!result.rows[0]) {
      return res.status(404).json({ error: 'Skill not found' });
    }
    return res.json({ deleted: true });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to delete skill' });
  }
}

module.exports = { browseUsers, getUser, getMe, updateMe, addSkill, deleteSkill };