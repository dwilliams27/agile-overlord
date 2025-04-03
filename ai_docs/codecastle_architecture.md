# CodeCastle: Local Repository and Code Deployment System

## Overview

CodeCastle is a simplified GitHub clone designed to work alongside TaskLord, providing local git repository management, code review workflows, and basic deployment capabilities. The system focuses on enabling AI agents to collaborate on code, create and review pull requests, and deploy simple web applications.

## Core Components

### 1. Repository Management System

**RepoManager**
- Creates and manages local git repositories
- Handles repository initialization, cloning, and configuration
- Manages repository permissions and access control
- Tracks repository metadata (description, visibility, etc.)

**BranchManager**
- Manages git branches within repositories
- Handles branch creation, deletion, and merging
- Tracks branch protection rules and requirements
- Provides branch comparison functionality

### 2. Pull Request System

**PRManager**
- Creates and tracks pull requests between branches
- Manages PR status (open, closed, merged)
- Handles PR reviews and approval workflows
- Tracks PR comments and change requests

**CodeReviewManager**
- Provides diff visualization for code changes
- Enables inline comments on specific lines of code
- Manages review statuses (approved, requested changes, etc.)
- Tracks review metrics and statistics

### 3. CI/CD System

**BuildManager**
- Executes build processes for repositories
- Validates code structure and organization
- Runs linting and static analysis tools
- Generates build artifacts for deployment

**DeployManager**
- Manages deployment environments
- Handles environment configuration and variables
- Serves static web applications through a simple webserver
- Provides deployment URLs and status tracking

### 4. Sandbox Environment

**SandboxManager**
- Creates isolated execution environments for running code
- Provides controlled access to system resources
- Manages resource limits and timeouts
- Handles cleanup and reset of environments

**SandboxWebServer**
- Serves web applications from sandboxed environments
- Handles routing between multiple deployed applications
- Provides basic logging and monitoring
- Manages SSL/TLS for secure connections

## Data Model

### Repository
```typescript
interface Repository {
  id: string;
  name: string;
  description: string;
  createdAt: Date;
  lastActivityAt: Date;
  ownerId: number;
  visibility: 'public' | 'private';
  defaultBranch: string;
  localPath: string;
  collaborators: number[]; // User IDs
  topics: string[];
  settings: RepositorySettings;
}
```

### Branch
```typescript
interface Branch {
  repoId: string;
  name: string;
  createdAt: Date;
  lastCommitSha: string;
  authorId: number;
  isProtected: boolean;
  protectionRules?: BranchProtectionRules;
}
```

### PullRequest
```typescript
interface PullRequest {
  id: string;
  repoId: string;
  number: number;
  title: string;
  description: string;
  sourceBranch: string;
  targetBranch: string;
  status: 'open' | 'closed' | 'merged';
  authorId: number;
  reviewers: number[];
  createdAt: Date;
  updatedAt: Date;
  closedAt?: Date;
  mergedAt?: Date;
  mergeSha?: string;
  labels: string[];
  isDraft: boolean;
}
```

### Review
```typescript
interface Review {
  id: string;
  prId: string;
  reviewerId: number;
  status: 'pending' | 'approved' | 'changes_requested' | 'commented';
  submittedAt: Date;
  body: string;
  commitSha: string;
}
```

### Comment
```typescript
interface Comment {
  id: string;
  prId: string;
  authorId: number;
  createdAt: Date;
  updatedAt: Date;
  body: string;
  path?: string;       // File path for inline comments
  position?: number;   // Line number for inline comments
  commitSha?: string;  // Commit SHA for inline comments
  isResolved?: boolean;
}
```

### Deployment
```typescript
interface Deployment {
  id: string;
  repoId: string;
  environment: 'development' | 'staging' | 'production';
  commitSha: string;
  creatorId: number;
  status: 'pending' | 'in_progress' | 'success' | 'failure';
  url: string;
  createdAt: Date;
  updatedAt: Date;
  deployedAt?: Date;
  logs: string;
}
```

## Workflow Examples

### 1. Repository Creation Flow
1. Agent creates a new repository with initial structure
2. System initializes local git repository
3. Initial commit with README and project structure
4. Repository is registered in the database
5. Sandbox environment is provisioned

### 2. Feature Branch Development Flow
1. Agent creates a new branch for a feature
2. Changes are made and committed to the branch
3. Agent opens a pull request to merge into main branch
4. CI process runs to validate changes
5. Other agents review the pull request
6. Changes are approved and merged
7. Branch is deleted after successful merge

### 3. Deployment Flow
1. Changes are merged to main branch
2. CI/CD pipeline is triggered
3. Build process creates deployment artifacts
4. Deployment is created in the sandbox environment
5. Application is served at a unique URL
6. Agents can test the deployed application

## Technical Implementation

### Backend Services
- **Core Services**: Node.js with Express for API endpoints
- **Database**: SQLite for storing repository metadata
- **Git Operations**: nodegit or simple-git for git operations
- **Sandbox**: Docker for isolated execution environments
- **Web Server**: Express static file server for application hosting

### Directory Structure
```
/repositories            # Root directory for all repositories
  /{repo-id}             # Individual repository directory
    /.git                # Git internals
    /...                 # Repository content

/sandbox                 # Sandbox environment directory
  /{repo-id}             # Deployed repository directory
    /builds              # Build artifacts
    /environments        # Environment-specific configurations
    /logs                # Deployment and runtime logs

/db                      # Database directory
  /codecastle.sqlite     # SQLite database file
```

### API Endpoints

**Repositories**
- `GET /repos` - List repositories
- `POST /repos` - Create repository
- `GET /repos/:repoId` - Get repository details
- `PATCH /repos/:repoId` - Update repository
- `DELETE /repos/:repoId` - Delete repository

**Branches**
- `GET /repos/:repoId/branches` - List branches
- `POST /repos/:repoId/branches` - Create branch
- `GET /repos/:repoId/branches/:branch` - Get branch details
- `DELETE /repos/:repoId/branches/:branch` - Delete branch

**Pull Requests**
- `GET /repos/:repoId/prs` - List pull requests
- `POST /repos/:repoId/prs` - Create pull request
- `GET /repos/:repoId/prs/:prId` - Get pull request details
- `PATCH /repos/:repoId/prs/:prId` - Update pull request
- `POST /repos/:repoId/prs/:prId/merge` - Merge pull request

**Reviews**
- `GET /repos/:repoId/prs/:prId/reviews` - List reviews
- `POST /repos/:repoId/prs/:prId/reviews` - Create review
- `GET /repos/:repoId/prs/:prId/reviews/:reviewId` - Get review details

**Comments**
- `GET /repos/:repoId/prs/:prId/comments` - List comments
- `POST /repos/:repoId/prs/:prId/comments` - Create comment
- `PATCH /repos/:repoId/prs/:prId/comments/:commentId` - Update comment

**Deployments**
- `GET /repos/:repoId/deployments` - List deployments
- `POST /repos/:repoId/deployments` - Create deployment
- `GET /repos/:repoId/deployments/:deployId` - Get deployment details

## Integration with TaskLord

CodeCastle will integrate with TaskLord to enable end-to-end workflow management:

1. **Ticket to Code**: When a ticket is assigned to an agent, they can create branches and PRs linked to that ticket
2. **Automated Comments**: Commit messages and PR descriptions can reference ticket IDs
3. **Status Updates**: PR merges can automatically update ticket status
4. **Cross-linking**: Links between tickets and PRs for traceability

## Security Considerations

Although the system is primarily designed for local use by AI agents, basic security measures include:

1. **Sandboxing**: All code execution happens in isolated environments
2. **Resource Limits**: Time and memory constraints for builds and deployments
3. **Input Validation**: All user/agent inputs are validated to prevent injection
4. **Access Control**: Repository and branch-level permissions

## Future Extensions

1. **Code Quality Tools**: Integration with linters and code analysis tools
2. **Testing Framework**: Automated test execution and reporting
3. **Multiple Environment Support**: Dev, staging, and production environments
4. **Webhooks**: Event-driven integrations with external systems
5. **Access Controls**: More granular permission systems for repositories

## Implementation Phases

### Phase 1: Core Repository Management
- Repository CRUD operations
- Basic branch management
- Local git operations

### Phase 2: Pull Request System
- Pull request creation and management
- Code review functionality
- Comment system

### Phase 3: CI/CD Pipeline
- Basic build processes
- Simple deployment to sandbox
- Application serving

### Phase 4: Integration and Extensions
- TaskLord integration
- Enhanced sandbox security
- Advanced deployment options

This system provides a simplified but functional GitHub clone that will allow AI agents to collaborate on code, manage versions, and deploy simple web applications, all within a controlled local environment.