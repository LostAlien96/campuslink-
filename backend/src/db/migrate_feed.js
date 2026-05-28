require('dotenv').config();
const pool = require('./pool');

async function migrate() {
  const client = await pool.connect();
  try {
    console.log('Running feed migration...');
    await client.query(`
      -- Posts
      CREATE TABLE IF NOT EXISTS posts (
        id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        type       VARCHAR(20) NOT NULL CHECK (type IN ('progress','question','team_lookup','resource')),
        content    TEXT NOT NULL CHECK (char_length(content) > 0),
        created_at TIMESTAMPTZ DEFAULT now()
      );

      -- Reactions (one of each type per user per post)
      CREATE TABLE IF NOT EXISTS reactions (
        id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        post_id    UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
        user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        type       VARCHAR(20) NOT NULL CHECK (type IN ('respect','relatable','help','collab')),
        created_at TIMESTAMPTZ DEFAULT now(),
        UNIQUE(post_id, user_id, type)
      );

      -- Comments with threading (parent_id for replies)
      CREATE TABLE IF NOT EXISTS comments (
        id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        post_id    UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
        user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        parent_id  UUID REFERENCES comments(id) ON DELETE CASCADE,
        content    TEXT NOT NULL CHECK (char_length(content) > 0),
        created_at TIMESTAMPTZ DEFAULT now()
      );

      -- Indexes
      CREATE INDEX IF NOT EXISTS idx_posts_user_id
        ON posts(user_id, created_at DESC);

      CREATE INDEX IF NOT EXISTS idx_reactions_post_id
        ON reactions(post_id);

      CREATE INDEX IF NOT EXISTS idx_comments_post_id
        ON comments(post_id, created_at ASC);
    `);
    console.log('✓ Feed tables created.');
  } catch (err) {
    console.error('Migration failed:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();