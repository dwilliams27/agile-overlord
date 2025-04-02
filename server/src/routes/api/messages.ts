import { Router } from 'express';
import * as messageController from '../../controllers/messageController';

const router = Router();

// GET /api/messages/:messageId/thread - Get thread messages
router.get('/:messageId/thread', messageController.getThreadMessages);

// POST /api/messages/:messageId/thread - Add a message to a thread
router.post('/:messageId/thread', messageController.createThreadMessage);

// PUT /api/messages/:id - Update a message
router.put('/:id', messageController.updateMessage);

// DELETE /api/messages/:id - Delete a message
router.delete('/:id', messageController.deleteMessage);

export default router;