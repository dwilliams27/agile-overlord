import db from '../utils/db';
import logger from '../utils/logger';

// Wrap db methods in promises
const dbAll = (sql: string, params: any[] = []): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
};

const dbGet = (sql: string, params: any[] = []): Promise<any> => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) {
        reject(err);
      } else {
        resolve(row);
      }
    });
  });
};

const dbRun = (sql: string, params: any[] = []): Promise<{ lastID: number; changes: number }> => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) {
        reject(err);
      } else {
        resolve({ lastID: this.lastID, changes: this.changes });
      }
    });
  });
};

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
  type?: TicketType; // Optional to match existing schema
  assigneeId: number | null;
  createdBy: number; // Using createdBy instead of reporterId
  createdAt: Date;
  updatedAt: Date;
  dueDate?: Date | null; // Optional to match existing schema
  storyPoints?: number | null; // Optional to match existing schema
  sprintId?: number | null; // Optional to match existing schema
  assignee?: {
    id: number;
    name: string;
    role: string;
    isAI: boolean;
  };
  creator?: { // Using creator instead of reporter
    id: number;
    name: string;
    role: string;
    isAI: boolean;
  };
}

class TicketModel {
  async getAll(options: { 
    status?: TicketStatus[],
    assigneeId?: number,
    sprintId?: number,
    type?: TicketType[],
  } = {}): Promise<Ticket[]> {
    let whereConditions = [];
    let params = [];
    
    if (options.status && options.status.length > 0) {
      whereConditions.push(`t.status IN (${options.status.map(() => '?').join(', ')})`);
      params.push(...options.status);
    }
    
    if (options.assigneeId !== undefined) {
      whereConditions.push('t.assignee_id = ?');
      params.push(options.assigneeId);
    }
    
    if (options.sprintId !== undefined) {
      whereConditions.push('t.sprint_id = ?');
      params.push(options.sprintId);
    }
    
    if (options.type && options.type.length > 0) {
      whereConditions.push(`t.type IN (${options.type.map(() => '?').join(', ')})`);
      params.push(...options.type);
    }
    
    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    
    try {
      const tickets = await dbAll(
        `SELECT t.*, 
                a.id as assignee_id, a.name as assignee_name, a.role as assignee_role, a.is_ai as assignee_is_ai,
                c.id as creator_id, c.name as creator_name, c.role as creator_role, c.is_ai as creator_is_ai
         FROM tickets t
         LEFT JOIN users a ON t.assignee_id = a.id
         LEFT JOIN users c ON t.created_by = c.id
         ${whereClause}
         ORDER BY t.updated_at DESC`,
        params
      );
      
      return tickets.map(this.mapTicketFromDB);
    } catch (error) {
      logger.error('Error fetching tickets:', error);
      throw error;
    }
  }
  
  async getById(id: number): Promise<Ticket | null> {
    try {
      const ticket = await dbGet(
        `SELECT t.*, 
                a.id as assignee_id, a.name as assignee_name, a.role as assignee_role, a.is_ai as assignee_is_ai,
                c.id as creator_id, c.name as creator_name, c.role as creator_role, c.is_ai as creator_is_ai
         FROM tickets t
         LEFT JOIN users a ON t.assignee_id = a.id
         LEFT JOIN users c ON t.created_by = c.id
         WHERE t.id = ?`,
        [id]
      );
      
      return ticket ? this.mapTicketFromDB(ticket) : null;
    } catch (error) {
      logger.error(`Error fetching ticket ${id}:`, error);
      throw error;
    }
  }
  
  async getBoard(): Promise<Record<TicketStatus, Ticket[]>> {
    try {
      const tickets = await this.getAll();
      
      // Group tickets by status
      const board: Record<TicketStatus, Ticket[]> = {
        [TicketStatus.TODO]: [],
        [TicketStatus.IN_PROGRESS]: [],
        [TicketStatus.REVIEW]: [],
        [TicketStatus.DONE]: [],
        [TicketStatus.BACKLOG]: []
      };
      
      tickets.forEach(ticket => {
        board[ticket.status].push(ticket);
      });
      
      return board;
    } catch (error) {
      logger.error('Error fetching board:', error);
      throw error;
    }
  }
  
  async create(ticket: Omit<Ticket, 'id' | 'createdAt' | 'updatedAt'>): Promise<Ticket> {
    try {
      const result = await dbRun(
        `INSERT INTO tickets (
          title, description, status, priority, 
          assignee_id, created_by
        ) VALUES (?, ?, ?, ?, ?, ?)`,
        [
          ticket.title,
          ticket.description,
          ticket.status,
          ticket.priority,
          ticket.assigneeId,
          ticket.createdBy
        ]
      );
      
      const id = result.lastID;
      return this.getById(id) as Promise<Ticket>;
    } catch (error) {
      logger.error('Error creating ticket:', error);
      throw error;
    }
  }
  
  async update(id: number, ticket: Partial<Omit<Ticket, 'id' | 'createdAt' | 'updatedAt'>>): Promise<Ticket | null> {
    try {
      const currentTicket = await this.getById(id);
      if (!currentTicket) {
        return null;
      }
      
      const updateFields = [];
      const values = [];
      
      if (ticket.title !== undefined) {
        updateFields.push('title = ?');
        values.push(ticket.title);
      }
      
      if (ticket.description !== undefined) {
        updateFields.push('description = ?');
        values.push(ticket.description);
      }
      
      if (ticket.status !== undefined) {
        updateFields.push('status = ?');
        values.push(ticket.status);
      }
      
      if (ticket.priority !== undefined) {
        updateFields.push('priority = ?');
        values.push(ticket.priority);
      }
      
      if (ticket.assigneeId !== undefined) {
        updateFields.push('assignee_id = ?');
        values.push(ticket.assigneeId);
      }
      
      // Always update the updated_at timestamp
      updateFields.push('updated_at = CURRENT_TIMESTAMP');
      
      // Add ID at the end for WHERE clause
      values.push(id);
      
      await dbRun(
        `UPDATE tickets SET ${updateFields.join(', ')} WHERE id = ?`,
        values
      );
      
      return this.getById(id);
    } catch (error) {
      logger.error(`Error updating ticket ${id}:`, error);
      throw error;
    }
  }
  
  async updateStatus(id: number, status: TicketStatus): Promise<Ticket | null> {
    try {
      await dbRun(
        'UPDATE tickets SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [status, id]
      );
      
      return this.getById(id);
    } catch (error) {
      logger.error(`Error updating ticket ${id} status:`, error);
      throw error;
    }
  }
  
  async delete(id: number): Promise<boolean> {
    try {
      const result = await dbRun(
        'DELETE FROM tickets WHERE id = ?',
        [id]
      );
      
      return result.changes > 0;
    } catch (error) {
      logger.error(`Error deleting ticket ${id}:`, error);
      throw error;
    }
  }
  
  private mapTicketFromDB(dbTicket: any): Ticket {
    const ticket: Ticket = {
      id: dbTicket.id,
      title: dbTicket.title,
      description: dbTicket.description,
      status: dbTicket.status as TicketStatus,
      priority: dbTicket.priority as TicketPriority,
      assigneeId: dbTicket.assignee_id,
      createdBy: dbTicket.created_by,
      createdAt: new Date(dbTicket.created_at),
      updatedAt: new Date(dbTicket.updated_at)
    };
    
    // Add assignee info if available
    if (dbTicket.assignee_name) {
      ticket.assignee = {
        id: dbTicket.assignee_id,
        name: dbTicket.assignee_name,
        role: dbTicket.assignee_role,
        isAI: Boolean(dbTicket.assignee_is_ai)
      };
    }
    
    // Add creator info if available
    if (dbTicket.creator_name) {
      ticket.creator = {
        id: dbTicket.creator_id,
        name: dbTicket.creator_name,
        role: dbTicket.creator_role,
        isAI: Boolean(dbTicket.creator_is_ai)
      };
    }
    
    return ticket;
  }
}

export default new TicketModel();