import { z } from 'zod';

export const agentChatSchema = z.object({
  message: z.string().min(1, 'Message is required').max(1000, 'Message too long'),
  conversationId: z.string().optional(),
});

export default { agentChatSchema };
