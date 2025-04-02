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
  type: TicketType;
  assigneeId: number | null;
  reporterId: number;
  createdAt: Date;
  updatedAt: Date;
  dueDate: Date | null;
  storyPoints: number | null;
  sprintId: number | null;
  assignee?: {
    id: number;
    name: string;
    role: string;
    isAI: boolean;
  };
  reporter?: {
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
                r.id as reporter_id, r.name as reporter_name, r.role as reporter_role, r.is_ai as reporter_is_ai
         FROM tickets t
         LEFT JOIN users a ON t.assignee_id = a.id
         LEFT JOIN users r ON t.reporter_id = r.id
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
                r.id as reporter_id, r.name as reporter_name, r.role as reporter_role, r.is_ai as reporter_is_ai
         FROM tickets t
         LEFT JOIN users a ON t.assignee_id = a.id
         LEFT JOIN users r ON t.reporter_id = r.id
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
          title, description, status, priority, type, 
          assignee_id, reporter_id, due_date, story_points, sprint_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          ticket.title,
          ticket.description,
          ticket.status,
          ticket.priority,
          ticket.type,
          ticket.assigneeId,
          ticket.reporterId,
          ticket.dueDate ? ticket.dueDate.toISOString() : null,
          ticket.storyPoints,
          ticket.sprintId
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
      
      if (ticket.type !== undefined) {
        updateFields.push('type = ?');
        values.push(ticket.type);
      }
      
      if (ticket.assigneeId !== undefined) {
        updateFields.push('assignee_id = ?');
        values.push(ticket.assigneeId);
      }
      
      if (ticket.dueDate !== undefined) {
        updateFields.push('due_date = ?');
        values.push(ticket.dueDate ? ticket.dueDate.toISOString() : null);
      }
      
      if (ticket.storyPoints !== undefined) {
        updateFields.push('story_points = ?');
        values.push(ticket.storyPoints);
      }
      
      if (ticket.sprintId !== undefined) {
        updateFields.push('sprint_id = ?');
        values.push(ticket.sprintId);
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
      type: dbTicket.type as TicketType,
      assigneeId: dbTicket.assignee_id,
      reporterId: dbTicket.reporter_id,
      createdAt: new Date(dbTicket.created_at),
      updatedAt: new Date(dbTicket.updated_at),
      dueDate: dbTicket.due_date ? new Date(dbTicket.due_date) : null,
      storyPoints: dbTicket.story_points,
      sprintId: dbTicket.sprint_id
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
    
    // Add reporter info if available
    if (dbTicket.reporter_name) {
      ticket.reporter = {
        id: dbTicket.reporter_id,
        name: dbTicket.reporter_name,
        role: dbTicket.reporter_role,
        isAI: Boolean(dbTicket.reporter_is_ai)
      };
    }
    
    return ticket;
  }
}

export default new TicketModel();