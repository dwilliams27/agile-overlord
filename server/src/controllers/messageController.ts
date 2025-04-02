import { Request, Response } from 'express';
import MessageModel, { Message } from '../models/Message';
import ChannelModel from '../models/Channel';
import UserModel from '../models/User';

export const getChannelMessages = async (req: Request, res: Response) => {
  try {
    const channelId = parseInt(req.params.channelId);
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;
    
    // Validate channel exists
    const channel = await ChannelModel.getById(channelId);
    if (!channel) {
      return res.status(404).json({ error: 'Channel not found' });
    }
    
    const messages = await MessageModel.getByChannelId(channelId, limit, offset);
    res.json(messages);
  } catch (error) {
    console.error('Error getting channel messages:', error);
    res.status(500).json({ error: 'Failed to get messages' });
  }
};

export const getThreadMessages = async (req: Request, res: Response) => {
  try {
    const messageId = parseInt(req.params.messageId);
    
    // Validate parent message exists
    const parentMessage = await MessageModel.getById(messageId);
    if (!parentMessage) {
      return res.status(404).json({ error: 'Parent message not found' });
    }
    
    // Include the parent message and all replies
    const threadMessages = await MessageModel.getThreadMessages(messageId);
    res.json(threadMessages);
  } catch (error) {
    console.error('Error getting thread messages:', error);
    res.status(500).json({ error: 'Failed to get thread messages' });
  }
};

export const createMessage = async (req: Request, res: Response) => {
  try {
    const channelId = parseInt(req.params.channelId);
    const { userId, content } = req.body;
    
    if (!userId || !content) {
      return res.status(400).json({ error: 'User ID and content are required' });
    }
    
    // Validate channel exists
    const channel = await ChannelModel.getById(channelId);
    if (!channel) {
      return res.status(404).json({ error: 'Channel not found' });
    }
    
    // Validate user exists
    const user = await UserModel.getById(parseInt(userId));
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const newMessage = await MessageModel.create({
      channelId,
      userId: parseInt(userId),
      content,
      threadParentId: null
    });
    
    // Emit a socket event for the new message
    const io = req.app.get('io');
    if (io) {
      const messageWithUser = { ...newMessage, user };
      io.emit('message:new', messageWithUser);
      
      // Also emit message:created event for AI agents to respond to
      io.emit('message:created', messageWithUser);
    }
    
    res.status(201).json(newMessage);
  } catch (error) {
    console.error('Error creating message:', error);
    res.status(500).json({ error: 'Failed to create message' });
  }
};

export const createThreadMessage = async (req: Request, res: Response) => {
  try {
    const messageId = parseInt(req.params.messageId);
    const { userId, content } = req.body;
    
    if (!userId || !content) {
      return res.status(400).json({ error: 'User ID and content are required' });
    }
    
    // Validate parent message exists
    const parentMessage = await MessageModel.getById(messageId);
    if (!parentMessage) {
      return res.status(404).json({ error: 'Parent message not found' });
    }
    
    // Validate user exists
    const user = await UserModel.getById(parseInt(userId));
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const newThreadMessage = await MessageModel.create({
      channelId: parentMessage.channelId,
      userId: parseInt(userId),
      content,
      threadParentId: messageId
    });
    
    // Emit a socket event for the new thread message
    const io = req.app.get('io');
    if (io) {
      const messageWithUser = { ...newThreadMessage, parentMessageId: messageId, user };
      io.emit('thread:new', messageWithUser);
      
      // Also emit message:created event for AI agents to respond to
      io.emit('message:created', { ...messageWithUser, channelId: parentMessage.channelId });
    }
    
    res.status(201).json(newThreadMessage);
  } catch (error) {
    console.error('Error creating thread message:', error);
    res.status(500).json({ error: 'Failed to create thread message' });
  }
};

export const updateMessage = async (req: Request, res: Response) => {
  try {
    const messageId = parseInt(req.params.id);
    const { content } = req.body;
    
    if (!content) {
      return res.status(400).json({ error: 'Content is required' });
    }
    
    const message = await MessageModel.getById(messageId);
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }
    
    await MessageModel.update(messageId, content);
    const updatedMessage = await MessageModel.getById(messageId);
    
    // Emit a socket event for the updated message
    const io = req.app.get('io');
    if (io) {
      io.emit('message:update', updatedMessage);
    }
    
    res.json(updatedMessage);
  } catch (error) {
    console.error('Error updating message:', error);
    res.status(500).json({ error: 'Failed to update message' });
  }
};

export const deleteMessage = async (req: Request, res: Response) => {
  try {
    const messageId = parseInt(req.params.id);
    const deleted = await MessageModel.delete(messageId);
    
    if (!deleted) {
      return res.status(404).json({ error: 'Message not found' });
    }
    
    // Emit a socket event for the deleted message
    const io = req.app.get('io');
    if (io) {
      io.emit('message:delete', messageId);
    }
    
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting message:', error);
    res.status(500).json({ error: 'Failed to delete message' });
  }
};