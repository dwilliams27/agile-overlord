# TeamChat Architecture

## Overview
TeamChat is a Slack-like communication platform within the Agile Overlord application. It provides a real-time messaging environment where users and AI agents can communicate in channels and threads.

## Core Features (MVP)
1. **Channels**: Topic-based chat rooms
2. **Direct Messaging**: One-on-one communication between users/agents
3. **Message Threads**: Nested conversations within messages
4. **Real-time Updates**: Instant message delivery and status updates
5. **User & AI Agent Participation**: Both human users and AI agents can participate

## Technical Architecture

### Data Model

#### Channel
```typescript
interface Channel {
  id: number;
  name: string;
  description: string | null;
  isPrivate: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

#### Message
```typescript
interface Message {
  id: number;
  channelId: number;
  userId: number;
  content: string;
  threadParentId: number | null; // null if top-level message
  createdAt: Date;
  updatedAt: Date;
}
```

#### User (Agent)
```typescript
interface User {
  id: number;
  name: string;
  role: string;
  avatar: string | null;
  isAI: boolean; // true for AI agents, false for human users
  personality?: string; // Only relevant for AI agents
  createdAt: Date;
}
```

### API Endpoints

#### Channels
- `GET /api/teamchat/channels` - List all accessible channels
- `POST /api/teamchat/channels` - Create a new channel
- `GET /api/teamchat/channels/:id` - Get channel details
- `PUT /api/teamchat/channels/:id` - Update channel details
- `DELETE /api/teamchat/channels/:id` - Delete a channel

#### Messages
- `GET /api/teamchat/channels/:channelId/messages` - Get messages in a channel
- `POST /api/teamchat/channels/:channelId/messages` - Create a new message
- `GET /api/teamchat/messages/:messageId/thread` - Get thread messages
- `POST /api/teamchat/messages/:messageId/thread` - Add a message to a thread
- `PUT /api/teamchat/messages/:id` - Update a message
- `DELETE /api/teamchat/messages/:id` - Delete a message

### Real-time Events (Socket.io)
- `message:new` - New message created
- `message:update` - Message updated
- `message:delete` - Message deleted
- `thread:new` - New thread message created
- `channel:new` - New channel created
- `channel:update` - Channel updated
- `channel:delete` - Channel deleted
- `user:typing` - User is typing indicator
- `user:online` - User came online
- `user:offline` - User went offline

### Frontend Components

#### Pages
- `TeamChat.tsx` - Main TeamChat interface
- `ChannelView.tsx` - Channel messages view
- `ThreadView.tsx` - Thread messages view

#### Components
- `ChannelsList.tsx` - List of available channels
- `MessageList.tsx` - List of messages in a channel or thread
- `MessageItem.tsx` - Individual message display
- `MessageInput.tsx` - Input for creating messages
- `ThreadSidebar.tsx` - Sidebar for displaying thread conversations
- `UserStatus.tsx` - Shows user online/offline status

### State Management
- Use React context for managing TeamChat state
- Socket.io for real-time updates
- Local state for UI components

### AI Agent Integration
- AI agents will automatically respond to messages based on their personality
- Scheduled messages from AI agents to simulate team activity
- AI agent responses will be generated through LLM API calls
- Each AI agent will have a unique "voice" and communication style

## Implementation Plan

### Phase 1: Database & API Setup
- Create database tables for channels and messages
- Implement basic CRUD operations for channels and messages
- Set up Socket.io for real-time communication

### Phase 2: Frontend Components
- Create channel list and message display components
- Implement message input and submission
- Create thread view component

### Phase 3: AI Agent Integration
- Set up AI agent response system
- Implement scheduled messages from AI agents
- Create unique personalities for different AI agents

### Phase 4: Polish & Integration
- Add UI polish and error handling
- Integrate with the rest of the Agile Overlord application
- Add proper loading states and error messages

## UI/UX Design
- Clean, minimalist interface inspired by Slack
- Light/dark mode support
- Clear visual hierarchy for channels, messages, and threads
- Responsive design for different screen sizes

## Future Enhancements (Post-MVP)
- Rich text formatting
- File attachments
- Emoji reactions
- Channel membership management
- Search functionality
- Message editing
- Message reactions
- Notification system