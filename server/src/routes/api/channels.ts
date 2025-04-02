import { Router } from 'express';
import * as channelController from '../../controllers/channelController';
import * as messageController from '../../controllers/messageController';

const router = Router();

// GET /api/channels - Get all channels
router.get('/', channelController.getAllChannels);

// GET /api/channels/:id - Get channel by ID
router.get('/:id', channelController.getChannelById);

// POST /api/channels - Create a new channel
router.post('/', channelController.createChannel);

// PUT /api/channels/:id - Update a channel
router.put('/:id', channelController.updateChannel);

// DELETE /api/channels/:id - Delete a channel
router.delete('/:id', channelController.deleteChannel);

// GET /api/channels/:channelId/messages - Get messages in a channel
router.get('/:channelId/messages', messageController.getChannelMessages);

// POST /api/channels/:channelId/messages - Create a new message in a channel
router.post('/:channelId/messages', messageController.createMessage);

export default router;