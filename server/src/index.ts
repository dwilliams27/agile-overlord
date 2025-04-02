import express from 'express';
import http from 'http';
import cors from 'cors';
import { Server as SocketIOServer } from 'socket.io';
import dotenv from 'dotenv';
import routes from './routes';
import db from './utils/db';
import aiAgentService from './services/aiAgentService';

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
    const channels = await new Promise<any[]>((resolve, reject) => {
      db.all('SELECT * FROM channels', [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
    
    if (channels.length === 0) {
      console.log('No channels found, creating default channels');
      
      // Create default channels
      await new Promise<void>((resolve, reject) => {
        db.run('INSERT INTO channels (name, description) VALUES (?, ?)', 
          ['general', 'General discussion'], (err) => {
            if (err) reject(err);
            else resolve();
          });
      });
      
      await new Promise<void>((resolve, reject) => {
        db.run('INSERT INTO channels (name, description) VALUES (?, ?)', 
          ['random', 'Random topics'], (err) => {
            if (err) reject(err);
            else resolve();
          });
      });
    }
    
    // Check and seed users
    const users = await new Promise<any[]>((resolve, reject) => {
      db.all('SELECT * FROM users', [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
    
    if (users.length === 0) {
      console.log('No users found, creating admin user and AI agents');
      
      // Create admin user
      await new Promise<void>((resolve, reject) => {
        db.run('INSERT INTO users (name, role, is_ai) VALUES (?, ?, ?)', 
          ['Admin', 'admin', 0], (err) => {
            if (err) reject(err);
            else resolve();
          });
      });
      
      // Create some AI agents
      await new Promise<void>((resolve, reject) => {
        db.run('INSERT INTO users (name, role, personality, is_ai) VALUES (?, ?, ?, ?)', 
          ['StanBot', 'Engineer', 'Extremely serious about code quality', 1], (err) => {
            if (err) reject(err);
            else resolve();
          });
      });
      
      await new Promise<void>((resolve, reject) => {
        db.run('INSERT INTO users (name, role, personality, is_ai) VALUES (?, ?, ?, ?)', 
          ['GingerBot', 'Designer', 'Passionate about UX and aesthetics', 1], (err) => {
            if (err) reject(err);
            else resolve();
          });
      });
      
      await new Promise<void>((resolve, reject) => {
        db.run('INSERT INTO users (name, role, personality, is_ai) VALUES (?, ?, ?, ?)', 
          ['CasualBot', 'Junior Developer', 'Relaxed and sometimes unfocused', 1], (err) => {
            if (err) reject(err);
            else resolve();
          });
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
  
  // Initialize AI agent service after database is seeded
  setTimeout(() => {
    aiAgentService.initialize(io);
  }, 2000);
});

export { app, server, io };
