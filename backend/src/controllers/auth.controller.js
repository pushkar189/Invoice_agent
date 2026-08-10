import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '../config/database.js';
import { config } from '../config/env.js';
import { createError } from '../middleware/error.middleware.js';
import { logger } from '../utils/logger.js';

export const register = async (req, res, next) => {
  try {
    const { name, email, password } = req.validatedBody;

    const { rows: existing } = await db.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.length > 0) {
      return next(createError('Email already registered', 409, 'EMAIL_EXISTS'));
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const { rows } = await db.query(
      `INSERT INTO users (name, email, password_hash) VALUES ($1,$2,$3) RETURNING id, name, email, created_at`,
      [name, email, passwordHash]
    );

    const user = rows[0];
    const token = jwt.sign({ id: user.id, email: user.email }, config.jwt.secret, { expiresIn: config.jwt.expiresIn });

    logger.info(`New user registered: ${email}`);
    res.status(201).json({ success: true, message: 'Registered successfully', data: { user, token } });
  } catch (err) {
    next(err);
  }
};

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.validatedBody;

    const { rows } = await db.query(
      'SELECT id, name, email, password_hash FROM users WHERE email = $1',
      [email]
    );

    if (!rows.length) {
      return next(createError('Invalid email or password', 401, 'INVALID_CREDENTIALS'));
    }

    const user = rows[0];
    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      return next(createError('Invalid email or password', 401, 'INVALID_CREDENTIALS'));
    }

    const token = jwt.sign({ id: user.id, email: user.email }, config.jwt.secret, { expiresIn: config.jwt.expiresIn });
    const { password_hash, ...userWithoutPassword } = user;

    logger.info(`User logged in: ${email}`);
    res.json({ success: true, data: { user: userWithoutPassword, token } });
  } catch (err) {
    next(err);
  }
};

export const getMe = async (req, res, next) => {
  try {
    const { rows } = await db.query(
      'SELECT id, name, email, created_at FROM users WHERE id = $1',
      [req.user.id]
    );
    if (!rows.length) return next(createError('User not found', 404, 'NOT_FOUND'));
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    next(err);
  }
};

export default { register, login, getMe };
