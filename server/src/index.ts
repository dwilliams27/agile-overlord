import express from 'express';
import http from 'http';
import cors from 'cors';
import { Server as SocketIOServer } from 'socket.io';
import dotenv from 'dotenv';
import routes from './routes';
import db from './utils/db';
import initDatabase from './utils/initDb';
import { AgentManager } from './services/agents/agent.manager';
import { TaskManager } from './services/workflow/task.manager';
import logger from './utils/logger';

// Load environment variables
dotenv.config();

// Ensure logs directory exists
import fs from 'fs';
import path from 'path';
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

const app = express();
const PORT = process.env.PORT || 5000;

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.IO
const io = new SocketIOServer(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

// Make io accessible to our routes
app.set('io', io);

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/', routes);

// Health check route
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'UP' });
});

// Create service instances after Express app is set up
let agentManager: AgentManager;
let taskManager: TaskManager;

// Socket.IO connection handling
io.on('connection', (socket) => {
  logger.info('A user connected', { socketId: socket.id });

  // Set up user online status
  socket.on('user:online', (userId) => {
    logger.info(`User ${userId} is online`, { socketId: socket.id });
    socket.broadcast.emit('user:online', userId);
  });

  // Handle typing indicators
  socket.on('user:typing', (data) => {
    socket.broadcast.emit('user:typing', data);
  });

  // Handle joining channels
  socket.on('channel:join', (channelId) => {
    logger.info(`Socket ${socket.id} joining channel ${channelId}`);
    socket.join(`channel:${channelId}`);
  });

  // Handle leaving channels
  socket.on('channel:leave', (channelId) => {
    logger.info(`Socket ${socket.id} leaving channel ${channelId}`);
    socket.leave(`channel:${channelId}`);
  });
  
  // Listen for new messages to trigger AI agent responses
  socket.on('message:created', (message) => {
    logger.info(`Received message:created event on socket ${socket.id}`, {
      messageId: message?.id,
      userId: message?.userId,
      channelId: message?.channelId
    });
    
    // Forward to agent manager to handle AI responses
    const agentMgr = app.get('agentManager');
    if (agentMgr) {
      agentMgr.handleIncomingMessage(message);
    } else {
      logger.warn('Agent manager not available for message:created event');
    }
  });
  
  // Also listen for message:new events (these come from the messageController)
  socket.on('message:new', (message) => {
    logger.info(`Received message:new event on socket ${socket.id}`, {
      messageId: message?.id,
      userId: message?.userId,
      channelId: message?.channelId
    });
    
    // Forward to agent manager to handle AI responses
    const agentMgr = app.get('agentManager');
    if (agentMgr) {
      agentMgr.handleIncomingMessage(message);
    } else {
      logger.warn('Agent manager not available for message:new event');
    }
  });

  socket.on('disconnect', () => {
    logger.info('User disconnected', { socketId: socket.id });
  });
});

// Create default channels and user if none exist
const seedInitialData = async () => {
  try {
    // Import models
    const ChannelModel = (await import('./models/Channel')).default;
    const UserModel = (await import('./models/User')).default;
    
    // Check and seed channels
    const channels = await ChannelModel.getAll();
    
    if (channels.length === 0) {
      console.log('No channels found, creating default channels');
      
      // Create default channels
      await ChannelModel.create({
        name: 'general',
        description: 'General discussion',
        isPrivate: false
      });
      
      await ChannelModel.create({
        name: 'random',
        description: 'Random topics',
        isPrivate: false
      });
    }
    
    // Check and seed users
    const users = await UserModel.getAll();
    
    if (users.length === 0) {
      console.log('No users found, creating admin user and AI agents');
      
      // Create admin user
      await UserModel.create({
        name: 'Admin',
        role: 'admin',
        isAI: false
      });
      
      // Create some AI agents
      await UserModel.create({
        name: 'StanBot',
        role: 'Engineer',
        personality: 'Extremely serious about code quality',
        isAI: true
      });
      
      await UserModel.create({
        name: 'GingerBot',
        role: 'Designer',
        personality: 'Passionate about UX and aesthetics',
        isAI: true
      });
      
      await UserModel.create({
        name: 'CasualBot',
        role: 'Junior Developer',
        personality: 'Relaxed and sometimes unfocused',
        isAI: true
      });
    }
  } catch (error) {
    console.error('Error seeding initial data:', error);
  }
};

// Start server
server.listen(PORT, async () => {
  logger.info(`Server running on port ${PORT}`);
  
  try {
    // Initialize database tables
    logger.info('Initializing database tables');
    await initDatabase();
    logger.info('Database tables initialized successfully');
    
    // Initialize database with seed data
    logger.info('Seeding initial data');
    await seedInitialData();
    logger.info('Initial data seeded successfully');
    
    // Create and initialize the agent manager
    logger.info('Creating agent manager instance');
    agentManager = new AgentManager();
    
    // Make agentManager available to our routes after it's initialized
    app.set('agentManager', agentManager);
    
    // Set up IO instance on agent manager
    logger.info('Setting IO instance on agent manager');
    agentManager.setIO(io);
    
    // Create task manager
    logger.info('Creating task manager instance');
    taskManager = new TaskManager(agentManager);
    
    // Make taskManager available to our routes
    app.set('taskManager', taskManager);
    
    // Add a delay to ensure database operations are complete
    logger.info('Waiting for database operations to complete before initializing systems');
    setTimeout(async () => {
      try {
        // Initialize AI agent system
        logger.info('Initializing AI agent system');
        await agentManager.initialize();
        logger.info('AI agent system initialized successfully');
        
        // Set capabilities for agents to work with task workflows
        logger.info('Adding task capabilities to agents');
        for (const agent of agentManager.getAllAgents()) {
          agent.capabilities.push('taskExecution');
        }
        
        // The TaskManager doesn't need explicit initialization as it's stateless
        // But we'll log that it's ready to use
        logger.info('Task manager ready for use');
        
        logger.info('All systems initialized and ready');
      } catch (error) {
        logger.error('Failed to initialize systems:', error);
      }
    }, 2000);
  } catch (error) {
    logger.error('Error during server startup:', error);
  }
});

export { app, server, io };
