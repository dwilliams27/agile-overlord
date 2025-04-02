import { Router } from 'express';
import usersRoutes from './users';
import channelsRoutes from './channels';
import messagesRoutes from './messages';
import ticketsRoutes from './tickets';

const router = Router();

// API routes
router.use('/users', usersRoutes);
router.use('/channels', channelsRoutes);
router.use('/messages', messagesRoutes);
router.use('/tickets', ticketsRoutes);

export default router;