import { Request, Response } from 'express';
import ChannelModel, { Channel } from '../models/Channel';

export const getAllChannels = async (req: Request, res: Response) => {
  try {
    const channels = await ChannelModel.getAll();
    res.json(channels);
  } catch (error) {
    console.error('Error getting channels:', error);
    res.status(500).json({ error: 'Failed to get channels' });
  }
};

export const getChannelById = async (req: Request, res: Response) => {
  try {
    const channelId = parseInt(req.params.id);
    const channel = await ChannelModel.getById(channelId);
    
    if (!channel) {
      return res.status(404).json({ error: 'Channel not found' });
    }
    
    res.json(channel);
  } catch (error) {
    console.error('Error getting channel:', error);
    res.status(500).json({ error: 'Failed to get channel' });
  }
};

export const createChannel = async (req: Request, res: Response) => {
  try {
    const { name, description, isPrivate } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Channel name is required' });
    }
    
    const newChannel = await ChannelModel.create({
      name,
      description: description || null,
      isPrivate: Boolean(isPrivate)
    });
    
    // Emit a socket event for the new channel
    const io = req.app.get('io');
    if (io) {
      io.emit('channel:new', newChannel);
    }
    
    res.status(201).json(newChannel);
  } catch (error) {
    console.error('Error creating channel:', error);
    res.status(500).json({ error: 'Failed to create channel' });
  }
};

export const updateChannel = async (req: Request, res: Response) => {
  try {
    const channelId = parseInt(req.params.id);
    const { name, description, isPrivate } = req.body;
    
    const channel = await ChannelModel.getById(channelId);
    if (!channel) {
      return res.status(404).json({ error: 'Channel not found' });
    }
    
    const updated = await ChannelModel.update(channelId, {
      name,
      description,
      isPrivate
    });
    
    if (!updated) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }
    
    const updatedChannel = await ChannelModel.getById(channelId);
    
    // Emit a socket event for the updated channel
    const io = req.app.get('io');
    if (io) {
      io.emit('channel:update', updatedChannel);
    }
    
    res.json(updatedChannel);
  } catch (error) {
    console.error('Error updating channel:', error);
    res.status(500).json({ error: 'Failed to update channel' });
  }
};

export const deleteChannel = async (req: Request, res: Response) => {
  try {
    const channelId = parseInt(req.params.id);
    const deleted = await ChannelModel.delete(channelId);
    
    if (!deleted) {
      return res.status(404).json({ error: 'Channel not found' });
    }
    
    // Emit a socket event for the deleted channel
    const io = req.app.get('io');
    if (io) {
      io.emit('channel:delete', channelId);
    }
    
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting channel:', error);
    res.status(500).json({ error: 'Failed to delete channel' });
  }
};