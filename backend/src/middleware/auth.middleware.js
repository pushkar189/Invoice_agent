import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import { createError } from './error.middleware.js';

/**
 * Verify JWT and attach user to request.
 */
export const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return next(createError('Authentication required', 401, 'AUTH_REQUIRED'));
  }

  const token = authHeader.slice(7);
  try {
    const decoded = jwt.verify(token, config.jwt.secret);
    req.user = decoded;
    next();
  } catch (err) {
    next(err);
  }
};



export default { authenticate };
