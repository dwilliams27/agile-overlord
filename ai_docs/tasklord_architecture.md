# TaskLord Architecture

## Overview
TaskLord is the ticket management system within Agile Overlord, inspired by Jira. It provides a comprehensive interface for creating, managing, and tracking tasks assigned to both human users and AI agents.

## Core Features (MVP)
1. **Ticket Management**: Create, view, update, and delete tickets
2. **Board View**: Kanban-style board with customizable columns
3. **Assignment**: Assign tickets to team members (human or AI)
4. **Transitions**: Move tickets through different states (todo, in progress, review, done)
5. **Comments**: Add comments to tickets for discussion
6. **AI Integration**: AI agents can update tickets and add comments
7. **Filtering & Sorting**: Filter and sort tickets by various criteria

## Technical Architecture

### Data Model

#### Ticket
```typescript
interface Ticket {
  id: number;
  title: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  type: TicketType;
  assigneeId: number | null;
  reporterId: number;
  createdAt: Date;
  updatedAt: Date;
  dueDate: Date | null;
  labels: string[];
  storyPoints: number | null;
  sprintId: number | null;
}

enum TicketStatus {
  TODO = "todo",
  IN_PROGRESS = "in_progress",
  REVIEW = "review",
  DONE = "done",
  BACKLOG = "backlog"
}

enum TicketPriority {
  HIGHEST = "highest",
  HIGH = "high",
  MEDIUM = "medium",
  LOW = "low",
  LOWEST = "lowest"
}

enum TicketType {
  TASK = "task",
  BUG = "bug",
  FEATURE = "feature",
  EPIC = "epic",
  STORY = "story"
}
```

#### Comment
```typescript
interface Comment {
  id: number;
  ticketId: number;
  userId: number;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}
```

#### Sprint
```typescript
interface Sprint {
  id: number;
  name: string;
  startDate: Date;
  endDate: Date;
  status: SprintStatus;
  goal: string | null;
}

enum SprintStatus {
  PENDING = "pending",
  ACTIVE = "active",
  COMPLETED = "completed"
}
```

### API Endpoints

#### Tickets
- `GET /api/tickets` - List all tickets
- `POST /api/tickets` - Create a new ticket
- `GET /api/tickets/:id` - Get ticket details
- `PUT /api/tickets/:id` - Update a ticket
- `DELETE /api/tickets/:id` - Delete a ticket
- `POST /api/tickets/:id/status` - Update ticket status
- `GET /api/tickets/board` - Get tickets in board format

#### Comments
- `GET /api/tickets/:ticketId/comments` - List comments on a ticket
- `POST /api/tickets/:ticketId/comments` - Add a comment to a ticket
- `PUT /api/tickets/:ticketId/comments/:id` - Update a comment
- `DELETE /api/tickets/:ticketId/comments/:id` - Delete a comment

#### Sprints
- `GET /api/sprints` - List all sprints
- `POST /api/sprints` - Create a new sprint
- `GET /api/sprints/:id` - Get sprint details
- `PUT /api/sprints/:id` - Update a sprint
- `DELETE /api/sprints/:id` - Delete a sprint
- `GET /api/sprints/:id/tickets` - Get tickets in a sprint

### Real-time Events (Socket.io)
- `ticket:new` - New ticket created
- `ticket:update` - Ticket updated
- `ticket:status` - Ticket status changed
- `ticket:delete` - Ticket deleted
- `comment:new` - New comment added
- `comment:update` - Comment updated
- `comment:delete` - Comment deleted

### Frontend Components

#### Pages
- `TaskLord.tsx` - Main TaskLord interface
- `BoardView.tsx` - Kanban board view
- `TicketDetails.tsx` - Detailed ticket view
- `CreateTicket.tsx` - Ticket creation form
- `SprintManagement.tsx` - Sprint management interface

#### Components
- `KanbanBoard.tsx` - Draggable Kanban board
- `KanbanColumn.tsx` - Individual column for board
- `TicketCard.tsx` - Card representing a ticket
- `TicketForm.tsx` - Form for creating/editing tickets
- `CommentSection.tsx` - Comments section for a ticket
- `CommentItem.tsx` - Individual comment display
- `CommentInput.tsx` - Input for creating comments
- `StatusSelector.tsx` - Dropdown for changing status
- `AssigneeSelector.tsx` - Dropdown for selecting assignee
- `PriorityBadge.tsx` - Badge showing ticket priority
- `TypeIcon.tsx` - Icon representing ticket type

### State Management
- Use React context for managing TaskLord state
- Socket.io for real-time updates
- Local state for UI components

### AI Agent Integration
- AI agents can be assigned tickets and will update their status
- Agents make decisions about ticket status based on capability and time
- Agents add comments explaining their work and decisions
- Agents can create new tickets for tasks they identify
- Transition logic determines what kind of updates trigger agent activity
- Ticket updates are tied to corresponding code changes in the GitHub system

## Implementation Plan

### Phase 1: Database & API Setup
- Create database tables for tickets, comments, and sprints
- Implement basic CRUD operations for tickets
- Set up Socket.io for real-time communication

### Phase 2: Frontend Components
- Create board view components
- Implement ticket creation and editing
- Create ticket details view

### Phase 3: AI Agent Integration
- Connect existing AI agent system to TaskLord
- Implement agent ticket handling logic
- Create agent commenting system

### Phase 4: Polish & Integration
- Add drag-and-drop functionality
- Implement filtering and sorting
- Integrate with the rest of the Agile Overlord application

## UI/UX Design
- Clean, minimalist interface inspired by Jira
- Color-coded tickets based on priority and type
- Intuitive drag-and-drop interaction
- Responsive design for different screen sizes

## Future Enhancements (Post-MVP)
- Custom fields for tickets
- Time tracking
- Reporting and charts
- Swimlanes for organization
- Ticket dependencies
- Advanced filtering and search
- Custom workflows
- User notifications