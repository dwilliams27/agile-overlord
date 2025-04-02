import db from '../utils/db';
import { promisify } from 'util';

// Convert db methods to use promises
const dbAll = promisify(db.all.bind(db));
const dbGet = promisify(db.get.bind(db));
const dbRun = promisify(db.run.bind(db));

export interface Channel {
  id: number;
  name: string;
  description: string | null;
  isPrivate: boolean;
  createdAt: Date;
  updatedAt: Date;
}

class ChannelModel {
  async getAll(): Promise<Channel[]> {
    const channels = await dbAll('SELECT * FROM channels ORDER BY name ASC');
    return channels.map(this.mapChannelFromDB);
  }

  async getById(id: number): Promise<Channel | null> {
    const channel = await dbGet('SELECT * FROM channels WHERE id = ?', [id]);
    return channel ? this.mapChannelFromDB(channel) : null;
  }

  async create(channel: Omit<Channel, 'id' | 'createdAt' | 'updatedAt'>): Promise<Channel> {
    const result = await dbRun(
      'INSERT INTO channels (name, description, is_private) VALUES (?, ?, ?)',
      [channel.name, channel.description, channel.isPrivate ? 1 : 0]
    );
    
    // @ts-ignore - SQLite specific lastID
    const id = result.lastID;
    return this.getById(id) as Promise<Channel>;
  }

  async update(id: number, channel: Partial<Omit<Channel, 'id' | 'createdAt' | 'updatedAt'>>): Promise<boolean> {
    const updateFields = [];
    const values = [];

    if (channel.name !== undefined) {
      updateFields.push('name = ?');
      values.push(channel.name);
    }

    if (channel.description !== undefined) {
      updateFields.push('description = ?');
      values.push(channel.description);
    }

    if (channel.isPrivate !== undefined) {
      updateFields.push('is_private = ?');
      values.push(channel.isPrivate ? 1 : 0);
    }

    updateFields.push('updated_at = CURRENT_TIMESTAMP');

    // If there's nothing to update, return false
    if (updateFields.length === 1) {
      return false;
    }

    values.push(id);

    const query = `UPDATE channels SET ${updateFields.join(', ')} WHERE id = ?`;
    await dbRun(query, values);
    return true;
  }

  async delete(id: number): Promise<boolean> {
    const result = await dbRun('DELETE FROM channels WHERE id = ?', [id]);
    // @ts-ignore - SQLite specific changes
    return result.changes > 0;
  }

  // Helper method to map database object to Channel interface
  private mapChannelFromDB(dbChannel: any): Channel {
    return {
      id: dbChannel.id,
      name: dbChannel.name,
      description: dbChannel.description,
      isPrivate: Boolean(dbChannel.is_private),
      createdAt: new Date(dbChannel.created_at),
      updatedAt: new Date(dbChannel.updated_at)
    };
  }
}

export default new ChannelModel();