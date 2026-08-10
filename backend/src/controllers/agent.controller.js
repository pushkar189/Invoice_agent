import { processAgentMessage } from '../services/agent.service.js';
import { logger } from '../utils/logger.js';

export const chat = async (req, res, next) => {
  try {
    const { message } = req.validatedBody;
    const userId = req.user?.id || 'anonymous';

    logger.info(`Agent chat from user ${userId}: "${message.slice(0, 100)}"`);
    const result = await processAgentMessage(message, userId);

    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

export default { chat };
