import express from 'express';
import http from 'http';
import cors from 'cors';
import { Server as SocketIOServer } from 'socket.io';
import dotenv from 'dotenv';
import routes from './routes';
import db from './utils/db';
import { AgentManager } from './services/agents/agent.manager';

// Load environment variables
dotenv.config();

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

// Create agent manager instance
const agentManager = new AgentManager();

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('A user connected', socket.id);

  // Set up user online status
  socket.on('user:online', (userId) => {
    console.log(`User ${userId} is online`);
    socket.broadcast.emit('user:online', userId);
  });

  // Handle typing indicators
  socket.on('user:typing', (data) => {
    socket.broadcast.emit('user:typing', data);
  });

  // Handle joining channels
  socket.on('channel:join', (channelId) => {
    socket.join(`channel:${channelId}`);
  });

  // Handle leaving channels
  socket.on('channel:leave', (channelId) => {
    socket.leave(`channel:${channelId}`);
  });
  
  // Listen for new messages to trigger AI agent responses
  socket.on('message:created', (message) => {
    // Forward to agent manager to handle AI responses
    agentManager.handleIncomingMessage(message);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected', socket.id);
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
  console.log(`Server running on port ${PORT}`);
  await seedInitialData();
  
  // Initialize the agent manager
  agentManager.setIO(io);
  
  setTimeout(async () => {
    await agentManager.initialize();
    console.log('AI agent system initialized');
  }, 2000);
});

export { app, server, io };
