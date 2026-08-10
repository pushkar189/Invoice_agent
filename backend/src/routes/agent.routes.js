import { Router } from 'express';
import { chat } from '../controllers/agent.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validation.middleware.js';
import { agentChatSchema } from '../validators/agent.schema.js';

const router = Router();
router.use(authenticate);
router.post('/chat', validate(agentChatSchema), chat);

export default router;
