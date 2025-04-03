# Agent Task-Based Workflow System

## Overview
The Agent Task-Based Workflow System is designed to manage AI agents working on tickets within the Agile Overlord application. It enables agents to automatically work on tickets when they are assigned and moved to "in progress", breaking down complex tasks into discrete steps, executing them with appropriate tools, and evaluating the results.

## Core Components

### 1. TaskManager
Central controller for managing agent task workflows. Responsible for:
- Monitoring ticket status changes and assignments
- Creating TaskWorkflow instances for agents
- Managing workflow execution
- Providing system-wide coordination

### 2. TaskWorkflow
The core workflow implementation that handles task execution:
- Dynamically plans task-specific steps based on ticket description
- Executes steps using appropriate tools
- Evaluates step results and makes intelligent decisions
- Manages context between steps
- Includes robust error recovery

### 3. TaskPlan
Represents a plan created by the agent for accomplishing a task:
- Contains a sequence of concrete, action-oriented steps
- Identifies required tools for each step
- Adapts to the specific requirements in the ticket

### 4. TaskStep
Represents a single discrete step in the task execution:
- Tracks execution status (pending, in_progress, completed, failed, retrying)
- Stores tool usage information and results
- Maintains retry count and error history
- Includes recovery strategies for failures

### 5. TaskState
Maintains the overall state of task execution:
- Tracks current step index
- Stores execution history and evaluations
- Manages workflow lifecycle (planning, executing, evaluating, completed, failed)

## Task Workflow Cycle

The task workflow follows a three-phase cycle:

### 1. Planning Phase
The agent analyzes the ticket to understand the requirements and creates a specific plan:
- Interprets the ticket description to understand the task
- Creates a numbered list of concrete steps needed to complete the task
- Identifies which tools will be used for each step
- Focuses only on what's explicitly required

### 2. Execution Phase
For each step in the plan:
- Selects the appropriate tool based on the step's requirements
- Provides the correct parameters to the tool
- Executes the tool and captures the result
- Maintains context continuity with previous steps

### 3. Evaluation Phase
After each step execution:
- Determines if the step was completed successfully
- Analyzes any errors and suggests recovery strategies
- Decides whether to proceed to the next step or retry
- Ensures context continuity throughout the task

## Error Recovery System

The workflow includes a comprehensive error recovery system:

- **Retry Mechanism**: Automatically retries failed steps with graduated backoff
- **Recovery Strategies**: Provides specific guidance based on error types
- **Context Preservation**: Maintains error history across retry attempts
- **Graceful Degradation**: Continues with the task even if some steps fail
- **Maximum Retry Limits**: Prevents infinite retry loops
- **Informative Diagnostics**: Logs detailed information about failures

## Available Tools

Agents have access to tools that allow them to take specific actions:

- **send_message**: Post messages to channels with proper formatting
- **add_ticket_comment**: Add informative comments to tickets
- **update_ticket_status**: Change ticket status when work is completed

Additional tools will be added for code manipulation, PR creation, and more complex operations.

## Technical Implementation

The system is implemented with:
- TypeScript for type safety and better maintainability
- SQLite for storing ticket and message data
- Winston logger for detailed agent activity tracking
- LLM integration for dynamic planning and execution
- Socket.IO for real-time updates

## Context Continuity

The system emphasizes maintaining context throughout task execution:
- Prompts include previous steps and their results
- Instructions emphasize consistency in tone and approach
- Evaluations consider the overall flow of the task
- Messages reference previous communications when appropriate

## Key Features

1. **Task-Specific Planning**: Dynamically adapts to any task described in a ticket
2. **Intelligent Tool Selection**: Chooses appropriate tools for each step
3. **Robust Error Handling**: Recovers gracefully from failures
4. **Context Awareness**: Maintains continuity throughout execution
5. **Self-Evaluation**: Critically analyzes each step's results before proceeding