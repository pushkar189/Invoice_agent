import pg from 'pg';
import { config } from './env.js';
import { logger } from '../utils/logger.js';

const { Pool } = pg;

const pool = new Pool({
  connectionString: config.database.url,
  ssl: {
    rejectUnauthorized: false,
  },
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 20000,
});

pool.on('error', (err) => {
  logger.error('Unexpected PostgreSQL pool error:', err.message);
});

pool.on('connect', () => {
  logger.debug('New PostgreSQL client connected');
});

export const db = {
  query: async (text, params) => {
    const start = Date.now();
    try {
      const result = await pool.query(text, params);
      const duration = Date.now() - start;
      logger.debug(`Query executed in ${duration}ms: ${text.slice(0, 80)}`);
      return result;
    } catch (err) {
      logger.error(`Query error: ${err.message} — SQL: ${text.slice(0, 100)}`);
      throw err;
    }
  },

  getClient: () => pool.connect(),

  testConnection: async () => {
    const client = await pool.connect();
    try {
      await client.query('SELECT 1');
      logger.info('✅ PostgreSQL (NeonDB) connected successfully');
      return true;
    } finally {
      client.release();
    }
  },

  end: () => pool.end(),
};

export default db;
