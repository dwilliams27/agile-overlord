import { Router } from 'express';
import * as ticketController from '../../controllers/ticketController';
import * as commentController from '../../controllers/commentController';

const router = Router();

// Ticket Routes
router.get('/', ticketController.getAllTickets);
router.post('/', ticketController.createTicket);
router.get('/board', ticketController.getBoard);
router.get('/:id', ticketController.getTicketById);
router.put('/:id', ticketController.updateTicket);
router.post('/:id/status', ticketController.updateTicketStatus);
router.delete('/:id', ticketController.deleteTicket);

// Comment Routes
router.get('/:ticketId/comments', commentController.getTicketComments);
router.post('/:ticketId/comments', commentController.createComment);
router.put('/:ticketId/comments/:id', commentController.updateComment);
router.delete('/:ticketId/comments/:id', commentController.deleteComment);

export default router;