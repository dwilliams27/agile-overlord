import { Request, Response } from 'express';
import CommentModel from '../models/Comment';
import TicketModel from '../models/Ticket';
import UserModel from '../models/User';
import logger from '../utils/logger';

export const getTicketComments = async (req: Request, res: Response) => {
  try {
    const ticketId = parseInt(req.params.ticketId);
    
    // Check if ticket exists
    const ticket = await TicketModel.getById(ticketId);
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }
    
    const comments = await CommentModel.getByTicketId(ticketId);
    res.json(comments);
  } catch (error) {
    logger.error(`Error getting comments for ticket ${req.params.ticketId}:`, error);
    res.status(500).json({ error: 'Failed to get comments' });
  }
};

export const createComment = async (req: Request, res: Response) => {
  try {
    const ticketId = parseInt(req.params.ticketId);
    const { userId, content } = req.body;
    
    if (!userId || !content) {
      return res.status(400).json({ error: 'User ID and content are required' });
    }
    
    // Check if ticket exists
    const ticket = await TicketModel.getById(ticketId);
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }
    
    // Check if user exists
    const user = await UserModel.getById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Create comment
    const newComment = await CommentModel.create({
      ticketId,
      userId,
      content
    });
    
    // Emit a socket event for the new comment
    const io = req.app.get('io');
    if (io) {
      io.emit('comment:new', newComment);
    }
    
    res.status(201).json(newComment);
  } catch (error) {
    logger.error(`Error creating comment for ticket ${req.params.ticketId}:`, error);
    res.status(500).json({ error: 'Failed to create comment' });
  }
};

export const updateComment = async (req: Request, res: Response) => {
  try {
    const ticketId = parseInt(req.params.ticketId);
    const commentId = parseInt(req.params.id);
    const { content } = req.body;
    
    if (!content) {
      return res.status(400).json({ error: 'Content is required' });
    }
    
    // Check if comment exists
    const comment = await CommentModel.getById(commentId);
    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }
    
    // Verify comment belongs to the correct ticket
    if (comment.ticketId !== ticketId) {
      return res.status(400).json({ error: 'Comment does not belong to this ticket' });
    }
    
    // Update comment
    const updatedComment = await CommentModel.update(commentId, content);
    
    // Emit a socket event for the updated comment
    const io = req.app.get('io');
    if (io) {
      io.emit('comment:update', updatedComment);
    }
    
    res.json(updatedComment);
  } catch (error) {
    logger.error(`Error updating comment ${req.params.id}:`, error);
    res.status(500).json({ error: 'Failed to update comment' });
  }
};

export const deleteComment = async (req: Request, res: Response) => {
  try {
    const ticketId = parseInt(req.params.ticketId);
    const commentId = parseInt(req.params.id);
    
    // Check if comment exists
    const comment = await CommentModel.getById(commentId);
    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }
    
    // Verify comment belongs to the correct ticket
    if (comment.ticketId !== ticketId) {
      return res.status(400).json({ error: 'Comment does not belong to this ticket' });
    }
    
    // Delete comment
    const success = await CommentModel.delete(commentId);
    
    if (!success) {
      return res.status(500).json({ error: 'Failed to delete comment' });
    }
    
    // Emit a socket event for the deleted comment
    const io = req.app.get('io');
    if (io) {
      io.emit('comment:delete', {
        id: commentId,
        ticketId
      });
    }
    
    res.status(204).send();
  } catch (error) {
    logger.error(`Error deleting comment ${req.params.id}:`, error);
    res.status(500).json({ error: 'Failed to delete comment' });
  }
};