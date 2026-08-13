import 'dotenv/config';
import pg from 'pg';

const url = process.env.DATABASE_URL;
console.log('Connecting to:', url.replace(/:npg_[^@]+@/, ':***@'));

const pool = new pg.Pool({
  connectionString: url,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 30000,
});

pool.connect()
  .then(client => {
    console.log('Connected successfully!');
    client.release();
    process.exit(0);
  })
  .catch(err => {
    console.error('Connection failed:', err);
    process.exit(1);
  });
