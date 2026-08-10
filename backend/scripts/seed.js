import 'dotenv/config';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';
import pg from 'pg';

const { Pool } = pg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const seed = async () => {
  const sql = readFileSync(path.join(__dirname, '../../database/seeds/001_sample_data.sql'), 'utf8');
  try {
    console.log('🌱 Seeding database with sample data...');
    await pool.query(sql);
    console.log('✅ Seed completed successfully!');
  } catch (err) {
    console.error('❌ Seed failed:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
};

seed();
