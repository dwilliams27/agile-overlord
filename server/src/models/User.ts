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

export interface User {
  id: number;
  name: string;
  role: string;
  personality?: string;
  avatar?: string;
  isAI: boolean;
  createdAt: Date;
  updatedAt: Date;
}

class UserModel {
  async getAll(): Promise<User[]> {
    const users = await dbAll('SELECT * FROM users ORDER BY name ASC');
    return users.map(this.mapUserFromDB);
  }

  async getById(id: number): Promise<User | null> {
    const user = await dbGet('SELECT * FROM users WHERE id = ?', [id]);
    return user ? this.mapUserFromDB(user) : null;
  }

  async create(user: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User> {
    const result = await dbRun(
      'INSERT INTO users (name, role, personality, avatar, is_ai) VALUES (?, ?, ?, ?, ?)',
      [user.name, user.role, user.personality, user.avatar, user.isAI ? 1 : 0]
    );
    
    // @ts-ignore - SQLite specific lastID
    const id = result.lastID;
    return this.getById(id) as Promise<User>;
  }

  async update(id: number, user: Partial<Omit<User, 'id' | 'createdAt' | 'updatedAt'>>): Promise<boolean> {
    const updateFields = [];
    const values = [];

    if (user.name !== undefined) {
      updateFields.push('name = ?');
      values.push(user.name);
    }

    if (user.role !== undefined) {
      updateFields.push('role = ?');
      values.push(user.role);
    }

    if (user.personality !== undefined) {
      updateFields.push('personality = ?');
      values.push(user.personality);
    }

    if (user.avatar !== undefined) {
      updateFields.push('avatar = ?');
      values.push(user.avatar);
    }

    if (user.isAI !== undefined) {
      updateFields.push('is_ai = ?');
      values.push(user.isAI ? 1 : 0);
    }

    updateFields.push('updated_at = CURRENT_TIMESTAMP');

    // If there's nothing to update, return false
    if (updateFields.length === 1) {
      return false;
    }

    values.push(id);

    const query = `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`;
    await dbRun(query, values);
    return true;
  }

  async delete(id: number): Promise<boolean> {
    const result = await dbRun('DELETE FROM users WHERE id = ?', [id]);
    // @ts-ignore - SQLite specific changes
    return result.changes > 0;
  }

  // Helper method to map database object to User interface
  private mapUserFromDB(dbUser: any): User {
    return {
      id: dbUser.id,
      name: dbUser.name,
      role: dbUser.role,
      personality: dbUser.personality,
      avatar: dbUser.avatar,
      isAI: Boolean(dbUser.is_ai),
      createdAt: new Date(dbUser.created_at),
      updatedAt: new Date(dbUser.updated_at)
    };
  }
}

export default new UserModel();