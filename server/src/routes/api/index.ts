import { Router } from 'express';
import usersRoutes from './users';
import channelsRoutes from './channels';
import messagesRoutes from './messages';

const router = Router();

// API routes
router.use('/users', usersRoutes);
router.use('/channels', channelsRoutes);
router.use('/messages', messagesRoutes);

export default router;