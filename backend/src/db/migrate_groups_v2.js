require('dotenv').config();
const pool = require('./pool');

async function migrate() {
  const client = await pool.connect();
  try {
    console.log('Running groups v2 migration...');
    await client.query(`
      ALTER TABLE groups
      ADD COLUMN IF NOT EXISTS whatsapp_link TEXT;
    `);
    console.log('✓ Done.');
  } catch (err) {
    console.error('Migration failed:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();