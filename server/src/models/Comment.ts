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

export interface Comment {
  id: number;
  ticketId: number;
  userId: number;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  user?: {
    id: number;
    name: string;
    role: string;
    isAI: boolean;
  };
}

class CommentModel {
  async getByTicketId(ticketId: number): Promise<Comment[]> {
    try {
      const comments = await dbAll(
        `SELECT c.*, u.id as user_id, u.name as user_name, u.role as user_role, u.is_ai as user_is_ai
         FROM comments c
         LEFT JOIN users u ON c.user_id = u.id
         WHERE c.ticket_id = ?
         ORDER BY c.created_at ASC`,
        [ticketId]
      );
      
      return comments.map(this.mapCommentFromDB);
    } catch (error) {
      logger.error(`Error fetching comments for ticket ${ticketId}:`, error);
      throw error;
    }
  }
  
  async getById(id: number): Promise<Comment | null> {
    try {
      const comment = await dbGet(
        `SELECT c.*, u.id as user_id, u.name as user_name, u.role as user_role, u.is_ai as user_is_ai
         FROM comments c
         LEFT JOIN users u ON c.user_id = u.id
         WHERE c.id = ?`,
        [id]
      );
      
      return comment ? this.mapCommentFromDB(comment) : null;
    } catch (error) {
      logger.error(`Error fetching comment ${id}:`, error);
      throw error;
    }
  }
  
  async create(comment: Omit<Comment, 'id' | 'createdAt' | 'updatedAt'>): Promise<Comment> {
    try {
      const result = await dbRun(
        'INSERT INTO comments (ticket_id, user_id, content) VALUES (?, ?, ?)',
        [comment.ticketId, comment.userId, comment.content]
      );
      
      const id = result.lastID;
      return this.getById(id) as Promise<Comment>;
    } catch (error) {
      logger.error('Error creating comment:', error);
      throw error;
    }
  }
  
  async update(id: number, content: string): Promise<Comment | null> {
    try {
      await dbRun(
        'UPDATE comments SET content = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [content, id]
      );
      
      return this.getById(id);
    } catch (error) {
      logger.error(`Error updating comment ${id}:`, error);
      throw error;
    }
  }
  
  async delete(id: number): Promise<boolean> {
    try {
      const result = await dbRun(
        'DELETE FROM comments WHERE id = ?',
        [id]
      );
      
      return result.changes > 0;
    } catch (error) {
      logger.error(`Error deleting comment ${id}:`, error);
      throw error;
    }
  }
  
  private mapCommentFromDB(dbComment: any): Comment {
    const comment: Comment = {
      id: dbComment.id,
      ticketId: dbComment.ticket_id,
      userId: dbComment.user_id,
      content: dbComment.content,
      createdAt: new Date(dbComment.created_at),
      updatedAt: new Date(dbComment.updated_at)
    };
    
    // Add user info if available
    if (dbComment.user_name) {
      comment.user = {
        id: dbComment.user_id,
        name: dbComment.user_name,
        role: dbComment.user_role,
        isAI: Boolean(dbComment.user_is_ai)
      };
    }
    
    return comment;
  }
}

export default new CommentModel();