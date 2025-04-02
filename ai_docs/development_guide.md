# Agile Overlord Development Guide

## Project Overview
Agile Overlord is a simulation of managing a team of engineers in 2025. The application simulates:
- Slack-like communication platform
- Jira-like ticket management system
- GitHub-like code repository with PR reviews
- AI agents that act as team members

## Development Environment Setup

### Prerequisites
- Node.js (v16+)
- npm (v7+)

### Installation
1. Clone the repository
```
git clone https://github.com/dwilliams27/agile-overlord.git
cd agile-overlord
```

2. Install dependencies
```
npm run install:all
```

This will install dependencies for the root project, client, and server.

### Running the Application
To run the server:
```
cd server
npm run dev
```

To run the client:
```
cd client
npm run dev
```

Or to run both concurrently from the root directory:
```
npm start
```

## API Endpoints

### Base URL
- Development: http://localhost:5001/api

### Available Endpoints
- `GET /api` - API information
- `GET /health` - Health check

## Client Application

### Routes
- `/` - Main dashboard

### Components
The client application is organized using the following structure:
- `components/` - Reusable UI components
- `contexts/` - React contexts for state management
- `pages/` - Main application pages
- `utils/` - Utility functions

## Server Architecture

### Database
The application uses SQLite for data storage with the following main tables:
- `users` - AI agent profiles
- `channels` - Slack-like communication channels
- `messages` - Messages in channels
- `tickets` - Jira-like task tickets
- `repositories` - GitHub-like code repositories
- `pull_requests` - Pull requests for code review

### Real-time Communication
Socket.IO is used for real-time updates between the server and client.

## Development Guidelines

### Code Style
- Use TypeScript for type safety
- Follow the existing project structure
- Use functional components with hooks for React development
- Prefer named exports over default exports

### Git Workflow
1. Create feature branches from `main`
2. Make changes and commit with descriptive messages
3. Submit pull requests to `main`
4. Ensure all tests pass before merging

## AI Agent System (Planned)
The AI agent system will simulate team members with different personalities, skills, and work patterns. Each agent will:
- Post messages in the Slack simulation
- Work on tickets in the Jira simulation
- Write and review code in the GitHub simulation

## Future Development
Future development phases will focus on:
1. Implementing the AI agent system
2. Expanding the simulation features
3. Adding more realistic team dynamics
4. Implementing performance metrics and analytics