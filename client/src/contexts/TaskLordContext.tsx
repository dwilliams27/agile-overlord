import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { io, Socket } from 'socket.io-client';
import { User } from './TeamChatContext';

// Define ticket types
export enum TicketStatus {
  TODO = "todo",
  IN_PROGRESS = "in_progress",
  REVIEW = "review",
  DONE = "done",
  BACKLOG = "backlog"
}

export enum TicketPriority {
  HIGHEST = "highest",
  HIGH = "high",
  MEDIUM = "medium",
  LOW = "low",
  LOWEST = "lowest"
}

export enum TicketType {
  TASK = "task",
  BUG = "bug",
  FEATURE = "feature",
  EPIC = "epic",
  STORY = "story"
}

export interface Ticket {
  id: number;
  title: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  type?: TicketType;
  assigneeId: number | null;
  createdBy: number;
  createdAt: string;
  updatedAt: string;
  assignee?: User;
  creator?: User;
}

export interface Comment {
  id: number;
  ticketId: number;
  userId: number;
  content: string;
  createdAt: string;
  updatedAt: string;
  user?: User;
}

export interface BoardData {
  [TicketStatus.TODO]: Ticket[];
  [TicketStatus.IN_PROGRESS]: Ticket[];
  [TicketStatus.REVIEW]: Ticket[];
  [TicketStatus.DONE]: Ticket[];
  [TicketStatus.BACKLOG]: Ticket[];
}

interface TaskLordContextType {
  currentUser: User | null;
  tickets: Ticket[];
  board: BoardData;
  selectedTicket: Ticket | null;
  comments: Comment[];
  loadingTickets: boolean;
  loadingComments: boolean;
  fetchTickets: () => Promise<void>;
  fetchBoard: () => Promise<void>;
  fetchTicketComments: (ticketId: number) => Promise<void>;
  setCurrentUser: (user: User) => void;
  setSelectedTicket: (ticket: Ticket | null) => void;
  createTicket: (ticket: Omit<Ticket, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Ticket>;
  updateTicket: (id: number, updates: Partial<Omit<Ticket, 'id' | 'createdAt' | 'updatedAt'>>) => Promise<Ticket>;
  updateTicketStatus: (id: number, status: TicketStatus) => Promise<Ticket>;
  deleteTicket: (id: number) => Promise<void>;
  createComment: (ticketId: number, userId: number, content: string) => Promise<Comment>;
  updateComment: (ticketId: number, commentId: number, content: string) => Promise<Comment>;
  deleteComment: (ticketId: number, commentId: number) => Promise<void>;
}

const TaskLordContext = createContext<TaskLordContextType | undefined>(undefined);

// Socket instance
let socket: Socket;

export const TaskLordProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [board, setBoard] = useState<BoardData>({
    [TicketStatus.TODO]: [],
    [TicketStatus.IN_PROGRESS]: [],
    [TicketStatus.REVIEW]: [],
    [TicketStatus.DONE]: [],
    [TicketStatus.BACKLOG]: [],
  });
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loadingTickets, setLoadingTickets] = useState<boolean>(false);
  const [loadingComments, setLoadingComments] = useState<boolean>(false);
  
  // Initialize socket connection
  useEffect(() => {
    socket = io(import.meta.env.VITE_API_URL || 'http://localhost:5001');
    
    // Socket event listeners
    socket.on('ticket:new', handleNewTicket);
    socket.on('ticket:update', handleUpdatedTicket);
    socket.on('ticket:status', handleTicketStatusChange);
    socket.on('ticket:delete', handleDeletedTicket);
    socket.on('comment:new', handleNewComment);
    socket.on('comment:update', handleUpdatedComment);
    socket.on('comment:delete', handleDeletedComment);
    
    return () => {
      // Clean up socket connection
      socket.disconnect();
    };
  }, []);
  
  // Socket event handlers
  const handleNewTicket = useCallback((ticket: Ticket) => {
    setTickets(prev => [ticket, ...prev]);
    setBoard(prev => ({
      ...prev,
      [ticket.status]: [ticket, ...prev[ticket.status]]
    }));
  }, []);
  
  const handleUpdatedTicket = useCallback((ticket: Ticket) => {
    setTickets(prev => prev.map(t => t.id === ticket.id ? ticket : t));
    
    // Update board data
    setBoard(prev => {
      const newBoard = { ...prev };
      
      // Remove ticket from all columns
      Object.keys(newBoard).forEach(status => {
        newBoard[status as TicketStatus] = newBoard[status as TicketStatus].filter(t => t.id !== ticket.id);
      });
      
      // Add ticket to its new status column
      newBoard[ticket.status] = [ticket, ...newBoard[ticket.status]];
      
      return newBoard;
    });
    
    // Update selected ticket if it's the one that was updated
    if (selectedTicket && selectedTicket.id === ticket.id) {
      setSelectedTicket(ticket);
    }
  }, [selectedTicket]);
  
  const handleTicketStatusChange = useCallback((data: { id: number, status: TicketStatus, ticket: Ticket }) => {
    const { id, status, ticket } = data;
    
    setTickets(prev => prev.map(t => t.id === id ? { ...t, status, ...ticket } : t));
    
    // Update board data
    setBoard(prev => {
      const newBoard = { ...prev };
      
      // Remove ticket from all columns
      Object.keys(newBoard).forEach(s => {
        newBoard[s as TicketStatus] = newBoard[s as TicketStatus].filter(t => t.id !== id);
      });
      
      // Add ticket to its new status column
      newBoard[status] = [ticket, ...newBoard[status]];
      
      return newBoard;
    });
    
    // Update selected ticket if it's the one that was updated
    if (selectedTicket && selectedTicket.id === id) {
      setSelectedTicket(ticket);
    }
  }, [selectedTicket]);
  
  const handleDeletedTicket = useCallback((ticketId: number) => {
    setTickets(prev => prev.filter(t => t.id !== ticketId));
    
    // Update board data
    setBoard(prev => {
      const newBoard = { ...prev };
      
      // Remove ticket from all columns
      Object.keys(newBoard).forEach(status => {
        newBoard[status as TicketStatus] = newBoard[status as TicketStatus].filter(t => t.id !== ticketId);
      });
      
      return newBoard;
    });
    
    // Clear selected ticket if it's the one that was deleted
    if (selectedTicket && selectedTicket.id === ticketId) {
      setSelectedTicket(null);
    }
  }, [selectedTicket]);
  
  const handleNewComment = useCallback((comment: Comment) => {
    if (selectedTicket && selectedTicket.id === comment.ticketId) {
      setComments(prev => [...prev, comment]);
    }
  }, [selectedTicket]);
  
  const handleUpdatedComment = useCallback((comment: Comment) => {
    if (selectedTicket && selectedTicket.id === comment.ticketId) {
      setComments(prev => prev.map(c => c.id === comment.id ? comment : c));
    }
  }, [selectedTicket]);
  
  const handleDeletedComment = useCallback((data: { id: number, ticketId: number }) => {
    if (selectedTicket && selectedTicket.id === data.ticketId) {
      setComments(prev => prev.filter(c => c.id !== data.id));
    }
  }, [selectedTicket]);
  
  // API URL
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';
  
  // API calls
  const fetchTickets = useCallback(async () => {
    setLoadingTickets(true);
    try {
      const response = await axios.get(`${API_URL}/api/tickets`);
      setTickets(response.data);
    } catch (error) {
      console.error('Error fetching tickets:', error);
    } finally {
      setLoadingTickets(false);
    }
  }, [API_URL]);
  
  const fetchBoard = useCallback(async () => {
    setLoadingTickets(true);
    try {
      const response = await axios.get(`${API_URL}/api/tickets/board`);
      setBoard(response.data);
    } catch (error) {
      console.error('Error fetching board:', error);
    } finally {
      setLoadingTickets(false);
    }
  }, [API_URL]);
  
  const fetchTicketComments = useCallback(async (ticketId: number) => {
    if (!ticketId) return;
    
    setLoadingComments(true);
    try {
      const response = await axios.get(`${API_URL}/api/tickets/${ticketId}/comments`);
      setComments(response.data);
    } catch (error) {
      console.error(`Error fetching comments for ticket ${ticketId}:`, error);
    } finally {
      setLoadingComments(false);
    }
  }, [API_URL]);
  
  const createTicket = useCallback(async (ticket: Omit<Ticket, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      console.log('Sending ticket to API:', ticket);
      const response = await axios.post(`${API_URL}/api/tickets`, {
        ...ticket,
        reporterId: ticket.createdBy // Map to what controller expects
      });
      return response.data;
    } catch (error) {
      console.error('Error creating ticket:', error);
      console.error('Error response:', error.response?.data);
      throw error;
    }
  }, [API_URL]);
  
  const updateTicket = useCallback(async (id: number, updates: Partial<Omit<Ticket, 'id' | 'createdAt' | 'updatedAt'>>) => {
    try {
      const response = await axios.put(`${API_URL}/api/tickets/${id}`, updates);
      return response.data;
    } catch (error) {
      console.error(`Error updating ticket ${id}:`, error);
      throw error;
    }
  }, [API_URL]);
  
  const updateTicketStatus = useCallback(async (id: number, status: TicketStatus) => {
    try {
      const response = await axios.post(`${API_URL}/api/tickets/${id}/status`, { status });
      return response.data;
    } catch (error) {
      console.error(`Error updating ticket ${id} status:`, error);
      throw error;
    }
  }, [API_URL]);
  
  const deleteTicket = useCallback(async (id: number) => {
    try {
      await axios.delete(`${API_URL}/api/tickets/${id}`);
    } catch (error) {
      console.error(`Error deleting ticket ${id}:`, error);
      throw error;
    }
  }, [API_URL]);
  
  const createComment = useCallback(async (ticketId: number, userId: number, content: string) => {
    try {
      const response = await axios.post(`${API_URL}/api/tickets/${ticketId}/comments`, { 
        userId, 
        content 
      });
      return response.data;
    } catch (error) {
      console.error(`Error creating comment for ticket ${ticketId}:`, error);
      throw error;
    }
  }, [API_URL]);
  
  const updateComment = useCallback(async (ticketId: number, commentId: number, content: string) => {
    try {
      const response = await axios.put(`${API_URL}/api/tickets/${ticketId}/comments/${commentId}`, { 
        content 
      });
      return response.data;
    } catch (error) {
      console.error(`Error updating comment ${commentId}:`, error);
      throw error;
    }
  }, [API_URL]);
  
  const deleteComment = useCallback(async (ticketId: number, commentId: number) => {
    try {
      await axios.delete(`${API_URL}/api/tickets/${ticketId}/comments/${commentId}`);
    } catch (error) {
      console.error(`Error deleting comment ${commentId}:`, error);
      throw error;
    }
  }, [API_URL]);
  
  // Context value
  const value = {
    currentUser,
    tickets,
    board,
    selectedTicket,
    comments,
    loadingTickets,
    loadingComments,
    fetchTickets,
    fetchBoard,
    fetchTicketComments,
    setCurrentUser,
    setSelectedTicket,
    createTicket,
    updateTicket,
    updateTicketStatus,
    deleteTicket,
    createComment,
    updateComment,
    deleteComment
  };
  
  return (
    <TaskLordContext.Provider value={value}>
      {children}
    </TaskLordContext.Provider>
  );
};

// Custom hook for using the context
export const useTaskLord = () => {
  const context = useContext(TaskLordContext);
  if (context === undefined) {
    throw new Error('useTaskLord must be used within a TaskLordProvider');
  }
  return context;
};