// src/db/migrate.js
// Run once: node src/db/migrate.js
// Creates all tables and indexes from scratch
require('dotenv').config();
const pool = require('./pool');

const schema = `
  -- Enable UUID generation
  CREATE EXTENSION IF NOT EXISTS "pgcrypto";

  -- ─────────────────────────────────────────
  -- USERS  (auth identity only)
  -- ─────────────────────────────────────────
  CREATE TABLE IF NOT EXISTS users (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email         VARCHAR(255) NOT NULL UNIQUE,
    password_hash TEXT         NOT NULL,
    name          VARCHAR(100) NOT NULL,
    branch        VARCHAR(100),
    year          SMALLINT CHECK (year BETWEEN 1 AND 6),
    bio           TEXT,
    avatar_url    TEXT,
    created_at    TIMESTAMPTZ  DEFAULT now(),
    updated_at    TIMESTAMPTZ  DEFAULT now()
  );

  -- ─────────────────────────────────────────
  -- SKILLS  (normalized — queryable by name+level)
  -- Why not JSONB? We need: "find all users who know React at building+"
  -- That query is a clean JOIN here, not possible on a JSON array.
  -- ─────────────────────────────────────────
  CREATE TABLE IF NOT EXISTS skills (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name       VARCHAR(100) NOT NULL,
    level      VARCHAR(20)  NOT NULL CHECK (level IN ('curious','learning','building','strong')),
    created_at TIMESTAMPTZ  DEFAULT now()
  );

  -- ─────────────────────────────────────────
  -- CONNECTIONS
  -- sender_id always < receiver_id enforced by app layer
  -- unique index prevents A→B and B→A duplicates at DB level
  -- rejected rows stay — prevents spam re-sends
  -- ─────────────────────────────────────────
  CREATE TABLE IF NOT EXISTS connections (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    receiver_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status      VARCHAR(20) NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending','accepted','rejected')),
    message     TEXT,
    created_at  TIMESTAMPTZ DEFAULT now(),
    updated_at  TIMESTAMPTZ DEFAULT now(),
    -- prevent self-connections
    CONSTRAINT no_self_connection CHECK (sender_id <> receiver_id)
  );

  -- ─────────────────────────────────────────
  -- GROUPS
  -- ─────────────────────────────────────────
  CREATE TABLE IF NOT EXISTS groups (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name       VARCHAR(100) NOT NULL,
    purpose    TEXT,
    type       VARCHAR(10)  NOT NULL DEFAULT 'open'
                 CHECK (type IN ('open','closed')),
    creator_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ  DEFAULT now()
  );

  CREATE TABLE IF NOT EXISTS group_members (
    group_id   UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    user_id    UUID NOT NULL REFERENCES users(id)  ON DELETE CASCADE,
    role       VARCHAR(10)  NOT NULL DEFAULT 'member'
                 CHECK (role IN ('admin','member')),
    status     VARCHAR(10)  NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending','accepted')),
    joined_at  TIMESTAMPTZ  DEFAULT now(),
    PRIMARY KEY (group_id, user_id)
  );

  -- ─────────────────────────────────────────
  -- INDEXES  (explain every single one)
  -- ─────────────────────────────────────────

  -- Most common query: "find users who know React at building+"
  CREATE INDEX IF NOT EXISTS idx_skills_name_level
    ON skills(name, level);

  -- Fast lookup of all skills for a given user (profile page)
  CREATE INDEX IF NOT EXISTS idx_skills_user_id
    ON skills(user_id);

  -- Prevent A→B + B→A duplicates.
  -- LEAST/GREATEST makes (A,B) and (B,A) the same ordered pair.
  CREATE UNIQUE INDEX IF NOT EXISTS idx_connections_pair
    ON connections(LEAST(sender_id::text, receiver_id::text),
                   GREATEST(sender_id::text, receiver_id::text));

  -- Fast lookup of all connections for a user (inbox page)
  CREATE INDEX IF NOT EXISTS idx_connections_receiver
    ON connections(receiver_id, status);

  CREATE INDEX IF NOT EXISTS idx_connections_sender
    ON connections(sender_id, status);

  -- Browse open groups
  CREATE INDEX IF NOT EXISTS idx_groups_type
    ON groups(type);

  -- Fast group membership checks
  CREATE INDEX IF NOT EXISTS idx_group_members_user
    ON group_members(user_id, status);
`;

async function migrate() {
  const client = await pool.connect();
  try {
    console.log('Running migrations...');
    await client.query(schema);
    console.log('✓ All tables and indexes created.');
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
