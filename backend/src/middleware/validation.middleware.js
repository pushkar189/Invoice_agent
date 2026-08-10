import { createError } from './error.middleware.js';

/**
 * Middleware factory that validates req.body against a Zod schema.
 */
export const validate = (schema) => {
  return (req, res, next) => {
    try {
      const result = schema.safeParse(req.body);
      if (!result.success) {
        const messages = result.error.errors
          .map(e => `${e.path.join('.')}: ${e.message}`)
          .join('; ');
        return next(createError(messages, 422, 'VALIDATION_ERROR'));
      }
      req.validatedBody = result.data;
      next();
    } catch (err) {
      next(err);
    }
  };
};

export default { validate };
