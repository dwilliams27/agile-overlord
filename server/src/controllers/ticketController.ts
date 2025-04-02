import { Request, Response } from 'express';
import TicketModel, { Ticket, TicketStatus, TicketPriority, TicketType } from '../models/Ticket';
import UserModel from '../models/User';
import logger from '../utils/logger';

export const getAllTickets = async (req: Request, res: Response) => {
  try {
    // Parse filter parameters
    const status = req.query.status as string[] | undefined;
    const assigneeId = req.query.assigneeId ? parseInt(req.query.assigneeId as string) : undefined;
    const sprintId = req.query.sprintId ? parseInt(req.query.sprintId as string) : undefined;
    const type = req.query.type as string[] | undefined;
    
    // Convert string arrays to enums
    const statusEnums = status?.map(s => s as TicketStatus);
    const typeEnums = type?.map(t => t as TicketType);
    
    const tickets = await TicketModel.getAll({ 
      status: statusEnums, 
      assigneeId, 
      sprintId, 
      type: typeEnums 
    });
    
    res.json(tickets);
  } catch (error) {
    logger.error('Error getting tickets:', error);
    res.status(500).json({ error: 'Failed to get tickets' });
  }
};

export const getTicketById = async (req: Request, res: Response) => {
  try {
    const ticketId = parseInt(req.params.id);
    const ticket = await TicketModel.getById(ticketId);
    
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }
    
    res.json(ticket);
  } catch (error) {
    logger.error(`Error getting ticket ${req.params.id}:`, error);
    res.status(500).json({ error: 'Failed to get ticket' });
  }
};

export const getBoard = async (req: Request, res: Response) => {
  try {
    const board = await TicketModel.getBoard();
    res.json(board);
  } catch (error) {
    logger.error('Error getting board:', error);
    res.status(500).json({ error: 'Failed to get board' });
  }
};

export const createTicket = async (req: Request, res: Response) => {
  try {
    const { 
      title, description, status, priority, type,
      assigneeId, reporterId, dueDate, storyPoints, sprintId 
    } = req.body;
    
    // Validate required fields
    if (!title || !status || !priority || !reporterId) {
      return res.status(400).json({ 
        error: 'Title, status, priority, and reporter ID are required' 
      });
    }
    
    // Validate reporter exists
    const reporter = await UserModel.getById(reporterId);
    if (!reporter) {
      return res.status(404).json({ error: 'Reporter not found' });
    }
    
    // Validate assignee if provided
    if (assigneeId) {
      const assignee = await UserModel.getById(assigneeId);
      if (!assignee) {
        return res.status(404).json({ error: 'Assignee not found' });
      }
    }
    
    // Parse due date if provided
    const parsedDueDate = dueDate ? new Date(dueDate) : null;
    
    // Create ticket
    const newTicket = await TicketModel.create({
      title,
      description: description || '',
      status: status as TicketStatus,
      priority: priority as TicketPriority,
      assigneeId: assigneeId || null,
      createdBy: reporterId
    });
    
    // Emit a socket event for the new ticket
    const io = req.app.get('io');
    if (io) {
      io.emit('ticket:new', newTicket);
    }
    
    res.status(201).json(newTicket);
  } catch (error) {
    logger.error('Error creating ticket:', error);
    res.status(500).json({ error: 'Failed to create ticket' });
  }
};

export const updateTicket = async (req: Request, res: Response) => {
  try {
    const ticketId = parseInt(req.params.id);
    const { 
      title, description, status, priority, type,
      assigneeId, dueDate, storyPoints, sprintId 
    } = req.body;
    
    // Check if ticket exists
    const ticket = await TicketModel.getById(ticketId);
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }
    
    // Validate assignee if provided
    if (assigneeId !== undefined) {
      if (assigneeId !== null) {
        const assignee = await UserModel.getById(assigneeId);
        if (!assignee) {
          return res.status(404).json({ error: 'Assignee not found' });
        }
      }
    }
    
    // Parse due date if provided
    const parsedDueDate = dueDate !== undefined 
      ? (dueDate ? new Date(dueDate) : null) 
      : undefined;
    
    // Update ticket
    const updatedTicket = await TicketModel.update(ticketId, {
      title,
      description,
      status: status as TicketStatus,
      priority: priority as TicketPriority,
      assigneeId
    });
    
    // Emit a socket event for the updated ticket
    const io = req.app.get('io');
    if (io) {
      io.emit('ticket:update', updatedTicket);
    }
    
    res.json(updatedTicket);
  } catch (error) {
    logger.error(`Error updating ticket ${req.params.id}:`, error);
    res.status(500).json({ error: 'Failed to update ticket' });
  }
};

export const updateTicketStatus = async (req: Request, res: Response) => {
  try {
    const ticketId = parseInt(req.params.id);
    const { status } = req.body;
    
    if (!status || !Object.values(TicketStatus).includes(status as TicketStatus)) {
      return res.status(400).json({ error: 'Valid status is required' });
    }
    
    // Check if ticket exists
    const ticket = await TicketModel.getById(ticketId);
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }
    
    // Update ticket status
    const updatedTicket = await TicketModel.updateStatus(ticketId, status as TicketStatus);
    
    // Emit a socket event for the updated ticket status
    const io = req.app.get('io');
    if (io) {
      io.emit('ticket:status', {
        id: ticketId,
        status,
        ticket: updatedTicket
      });
    }
    
    res.json(updatedTicket);
  } catch (error) {
    logger.error(`Error updating ticket status ${req.params.id}:`, error);
    res.status(500).json({ error: 'Failed to update ticket status' });
  }
};

export const deleteTicket = async (req: Request, res: Response) => {
  try {
    const ticketId = parseInt(req.params.id);
    
    // Check if ticket exists
    const ticket = await TicketModel.getById(ticketId);
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }
    
    // Delete ticket
    const success = await TicketModel.delete(ticketId);
    
    if (!success) {
      return res.status(500).json({ error: 'Failed to delete ticket' });
    }
    
    // Emit a socket event for the deleted ticket
    const io = req.app.get('io');
    if (io) {
      io.emit('ticket:delete', ticketId);
    }
    
    res.status(204).send();
  } catch (error) {
    logger.error(`Error deleting ticket ${req.params.id}:`, error);
    res.status(500).json({ error: 'Failed to delete ticket' });
  }
};