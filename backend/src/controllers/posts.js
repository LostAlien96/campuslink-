const pool = require('../db/pool');

// ─── Get feed ─────────────────────────────────────────────────────────────────
// Posts from: yourself + your accepted connections
// Sorted newest first. Each post includes reaction counts + comment count
// + whether the current user has reacted
async function getFeed(req, res) {
  const userId = req.user.id;

  try {
    const result = await pool.query(`
      SELECT
        p.id, p.type, p.content, p.created_at,
        u.id   AS author_id,
        u.name AS author_name,
        u.branch AS author_branch,
        u.year AS author_year,

        -- Reaction counts grouped as JSON
        COALESCE(
          json_object_agg(r_counts.type, r_counts.cnt)
          FILTER (WHERE r_counts.type IS NOT NULL),
          '{}'::json
        ) AS reaction_counts,

        -- Current user's reactions as array
        COALESCE(
          (SELECT json_agg(r2.type)
           FROM reactions r2
           WHERE r2.post_id = p.id AND r2.user_id = $1),
          '[]'::json
        ) AS my_reactions,

        -- Comment count
        (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id)
          AS comment_count

      FROM posts p
      JOIN users u ON u.id = p.user_id
      LEFT JOIN (
        SELECT post_id, type, COUNT(*) AS cnt
        FROM reactions
        GROUP BY post_id, type
      ) r_counts ON r_counts.post_id = p.id

      WHERE
        p.user_id = $1
        OR p.user_id IN (
          SELECT CASE
            WHEN sender_id = $1 THEN receiver_id
            ELSE sender_id
          END
          FROM connections
          WHERE (sender_id = $1 OR receiver_id = $1)
            AND status = 'accepted'
        )

      GROUP BY p.id, u.id, u.name, u.branch, u.year
      ORDER BY p.created_at DESC
      LIMIT 50
    `, [userId]);

    return res.json(result.rows);
  } catch (err) {
    console.error('Get feed error:', err);
    return res.status(500).json({ error: 'Failed to fetch feed' });
  }
}

// ─── Create post ──────────────────────────────────────────────────────────────
async function createPost(req, res) {
  const { type, content } = req.body;
  const userId = req.user.id;

  const validTypes = ['progress', 'question', 'team_lookup', 'resource'];
  if (!type || !validTypes.includes(type)) {
    return res.status(400).json({ error: 'Valid type is required: progress, question, team_lookup, resource' });
  }
  if (!content || content.trim().length === 0) {
    return res.status(400).json({ error: 'Content cannot be empty' });
  }
  if (content.trim().length > 1000) {
    return res.status(400).json({ error: 'Post cannot exceed 1000 characters' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO posts (user_id, type, content)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [userId, type, content.trim()]
    );

    // Return with author info attached
    const post = result.rows[0];
    const userResult = await pool.query(
      'SELECT name, branch, year FROM users WHERE id = $1',
      [userId]
    );
    const user = userResult.rows[0];

    return res.status(201).json({
      ...post,
      author_id: userId,
      author_name: user.name,
      author_branch: user.branch,
      author_year: user.year,
      reaction_counts: {},
      my_reactions: [],
      comment_count: 0,
    });
  } catch (err) {
    console.error('Create post error:', err);
    return res.status(500).json({ error: 'Failed to create post' });
  }
}

// ─── Delete post ──────────────────────────────────────────────────────────────
async function deletePost(req, res) {
  const { id } = req.params;
  const userId = req.user.id;

  try {
    const result = await pool.query(
      'DELETE FROM posts WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, userId]
    );
    if (!result.rows[0]) {
      return res.status(404).json({ error: 'Post not found or not yours' });
    }
    return res.json({ deleted: true });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to delete post' });
  }
}

// ─── Toggle reaction ──────────────────────────────────────────────────────────
// If reaction exists → remove it (toggle off)
// If it doesn't → add it
async function toggleReaction(req, res) {
  const { id: postId } = req.params;
  const { type } = req.body;
  const userId = req.user.id;

  const validReactions = ['respect', 'relatable', 'help', 'collab'];
  if (!validReactions.includes(type)) {
    return res.status(400).json({ error: 'Invalid reaction type' });
  }

  try {
    // Check if exists
    const existing = await pool.query(
      'SELECT id FROM reactions WHERE post_id = $1 AND user_id = $2 AND type = $3',
      [postId, userId, type]
    );

    if (existing.rows.length > 0) {
      // Remove
      await pool.query(
        'DELETE FROM reactions WHERE post_id = $1 AND user_id = $2 AND type = $3',
        [postId, userId, type]
      );
      return res.json({ action: 'removed', type });
    } else {
      // Add
      await pool.query(
        'INSERT INTO reactions (post_id, user_id, type) VALUES ($1, $2, $3)',
        [postId, userId, type]
      );
      return res.json({ action: 'added', type });
    }
  } catch (err) {
    console.error('Toggle reaction error:', err);
    return res.status(500).json({ error: 'Failed to toggle reaction' });
  }
}

// ─── Get comments for a post ──────────────────────────────────────────────────
async function getComments(req, res) {
  const { id: postId } = req.params;

  try {
    const result = await pool.query(`
      SELECT c.id, c.content, c.parent_id, c.created_at,
        u.id AS author_id, u.name AS author_name
      FROM comments c
      JOIN users u ON u.id = c.user_id
      WHERE c.post_id = $1
      ORDER BY c.created_at ASC
    `, [postId]);

    // Build threaded structure
    const all = result.rows;
    const top = all.filter(c => !c.parent_id);
    const replies = all.filter(c => c.parent_id);

    const threaded = top.map(c => ({
      ...c,
      replies: replies.filter(r => r.parent_id === c.id),
    }));

    return res.json(threaded);
  } catch (err) {
    console.error('Get comments error:', err);
    return res.status(500).json({ error: 'Failed to fetch comments' });
  }
}

// ─── Add comment ──────────────────────────────────────────────────────────────
async function addComment(req, res) {
  const { id: postId } = req.params;
  const { content, parent_id } = req.body;
  const userId = req.user.id;

  if (!content || content.trim().length === 0) {
    return res.status(400).json({ error: 'Comment cannot be empty' });
  }

  try {
    // Verify post exists
    const postCheck = await pool.query('SELECT id FROM posts WHERE id = $1', [postId]);
    if (!postCheck.rows[0]) {
      return res.status(404).json({ error: 'Post not found' });
    }

    // If reply, verify parent comment exists and belongs to same post
    if (parent_id) {
      const parentCheck = await pool.query(
        'SELECT id FROM comments WHERE id = $1 AND post_id = $2',
        [parent_id, postId]
      );
      if (!parentCheck.rows[0]) {
        return res.status(404).json({ error: 'Parent comment not found' });
      }
    }

    const result = await pool.query(
      `INSERT INTO comments (post_id, user_id, parent_id, content)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [postId, userId, parent_id || null, content.trim()]
    );

    const comment = result.rows[0];
    const userResult = await pool.query(
      'SELECT name FROM users WHERE id = $1', [userId]
    );

    return res.status(201).json({
      ...comment,
      author_id: userId,
      author_name: userResult.rows[0].name,
      replies: [],
    });
  } catch (err) {
    console.error('Add comment error:', err);
    return res.status(500).json({ error: 'Failed to add comment' });
  }
}

// ─── Delete comment ───────────────────────────────────────────────────────────
async function deleteComment(req, res) {
  const { commentId } = req.params;
  const userId = req.user.id;

  try {
    const result = await pool.query(
      'DELETE FROM comments WHERE id = $1 AND user_id = $2 RETURNING id',
      [commentId, userId]
    );
    if (!result.rows[0]) {
      return res.status(404).json({ error: 'Comment not found or not yours' });
    }
    return res.json({ deleted: true });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to delete comment' });
  }
}

// ─── Get streak for a user ────────────────────────────────────────────────────
// Streak = consecutive days with at least one post, counting back from today
async function getStreak(req, res) {
  const userId = req.params.userId || req.user.id;

  try {
    const result = await pool.query(`
      SELECT DISTINCT DATE(created_at AT TIME ZONE 'Asia/Kolkata') AS post_date
      FROM posts
      WHERE user_id = $1
      ORDER BY post_date DESC
    `, [userId]);

    const dates = result.rows.map(r => r.post_date.toISOString().slice(0, 10));
    if (dates.length === 0) return res.json({ streak: 0 });

    const today = new Date().toISOString().slice(0, 10);
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

    // Streak only counts if posted today or yesterday
    if (dates[0] !== today && dates[0] !== yesterday) {
      return res.json({ streak: 0 });
    }

    let streak = 1;
    for (let i = 1; i < dates.length; i++) {
      const prev = new Date(dates[i - 1]);
      const curr = new Date(dates[i]);
      const diff = (prev - curr) / 86400000;
      if (diff === 1) streak++;
      else break;
    }

    return res.json({ streak });
  } catch (err) {
    console.error('Get streak error:', err);
    return res.status(500).json({ error: 'Failed to get streak' });
  }
}

module.exports = {
  getFeed, createPost, deletePost,
  toggleReaction,
  getComments, addComment, deleteComment,
  getStreak,
};