import db from '../utils/db';

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

export interface Message {
  id: number;
  channelId: number;
  userId: number;
  content: string;
  threadParentId: number | null;
  createdAt: Date;
  updatedAt: Date;
}

class MessageModel {
  async getByChannelId(channelId: number, limit = 50, offset = 0): Promise<Message[]> {
    const messages = await dbAll(
      `SELECT * FROM messages 
       WHERE channel_id = ? AND thread_parent_id IS NULL
       ORDER BY created_at ASC LIMIT ? OFFSET ?`,
      [channelId, limit, offset]
    );
    return messages.map(this.mapMessageFromDB);
  }

  async getThreadMessages(parentMessageId: number): Promise<Message[]> {
    const messages = await dbAll(
      `SELECT * FROM messages 
       WHERE thread_parent_id = ? 
       ORDER BY created_at ASC`,
      [parentMessageId]
    );
    return messages.map(this.mapMessageFromDB);
  }

  async getById(id: number): Promise<Message | null> {
    const message = await dbGet('SELECT * FROM messages WHERE id = ?', [id]);
    return message ? this.mapMessageFromDB(message) : null;
  }

  async create(message: Omit<Message, 'id' | 'createdAt' | 'updatedAt'>): Promise<Message> {
    const result = await dbRun(
      'INSERT INTO messages (channel_id, user_id, content, thread_parent_id) VALUES (?, ?, ?, ?)',
      [message.channelId, message.userId, message.content, message.threadParentId]
    );
    
    // @ts-ignore - SQLite specific lastID
    const id = result.lastID;
    return this.getById(id) as Promise<Message>;
  }

  async update(id: number, content: string): Promise<boolean> {
    await dbRun(
      'UPDATE messages SET content = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [content, id]
    );
    return true;
  }

  async delete(id: number): Promise<boolean> {
    const result = await dbRun('DELETE FROM messages WHERE id = ?', [id]);
    // @ts-ignore - SQLite specific changes
    return result.changes > 0;
  }

  // Helper method to map database object to Message interface
  private mapMessageFromDB(dbMessage: any): Message {
    return {
      id: dbMessage.id,
      channelId: dbMessage.channel_id,
      userId: dbMessage.user_id,
      content: dbMessage.content,
      threadParentId: dbMessage.thread_parent_id,
      createdAt: new Date(dbMessage.created_at),
      updatedAt: new Date(dbMessage.updated_at)
    };
  }
}

export default new MessageModel();