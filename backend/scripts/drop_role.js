import 'dotenv/config';
import pg from 'pg';

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

(async () => {
  try {
    await pool.query('ALTER TABLE users DROP COLUMN IF EXISTS role');
    console.log('Role column dropped successfully.');
  } catch (err) {
    console.error('Error:', err);
  } finally {
    pool.end();
  }
})();
