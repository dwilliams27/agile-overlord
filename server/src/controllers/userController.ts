import { Request, Response } from 'express';
import UserModel, { User } from '../models/User';

export const getAllUsers = async (req: Request, res: Response) => {
  try {
    const users = await UserModel.getAll();
    res.json(users);
  } catch (error) {
    console.error('Error getting users:', error);
    res.status(500).json({ error: 'Failed to get users' });
  }
};

export const getUserById = async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.id);
    const user = await UserModel.getById(userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json(user);
  } catch (error) {
    console.error('Error getting user:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
};

export const createUser = async (req: Request, res: Response) => {
  try {
    const { name, role, personality, avatar, isAI } = req.body;
    
    if (!name || !role) {
      return res.status(400).json({ error: 'Name and role are required' });
    }
    
    const newUser = await UserModel.create({
      name,
      role,
      personality,
      avatar,
      isAI: Boolean(isAI)
    });
    
    res.status(201).json(newUser);
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
};

export const updateUser = async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.id);
    const { name, role, personality, avatar, isAI } = req.body;
    
    const user = await UserModel.getById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const updated = await UserModel.update(userId, {
      name,
      role,
      personality,
      avatar,
      isAI
    });
    
    if (!updated) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }
    
    const updatedUser = await UserModel.getById(userId);
    res.json(updatedUser);
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
};

export const deleteUser = async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.id);
    const deleted = await UserModel.delete(userId);
    
    if (!deleted) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
};