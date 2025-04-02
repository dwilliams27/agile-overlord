# AI Agent Architecture for Agile Overlord

## Overview

The AI agent architecture in Agile Overlord provides a framework for simulating team members using external Large Language Models (LLMs). These AI agents interact with the system by communicating in channels, working on tickets, creating code, and participating in code reviews.

## Core Requirements

1. **External LLM Integration**: Connect to external LLMs (OpenAI's GPT-4o, Anthropic's Claude, Google's Gemini)
2. **Context Management**: Efficiently manage and provide relevant context to the LLMs
3. **Tool Integration**: Expose system tools to the LLMs for performing actions
4. **Agent Personalization**: Define unique personalities and characteristics for each agent
5. **Memory and State**: Maintain conversation history and agent state
6. **Scheduling**: Manage agent activity timing and frequency

## Architecture Components

### 1. Agent Core

The central component managing agent functionality, personality, and state:

```typescript
interface Agent {
  id: number;            // Unique identifier
  name: string;          // Agent name
  role: string;          // Role (Engineer, Designer, etc.)
  personality: string;   // Personality description
  capabilities: string[];// What the agent can do
  state: AgentState;     // Current state
  memory: Memory;        // Agent's memory system
  llmConfig: LLMConfig;  // LLM service configuration
}

interface AgentState {
  isActive: boolean;
  currentTask?: string;
  currentContext?: string;
  lastActivity: Date;
}
```

### 2. LLM Service

Manages connections to external LLM providers:

```typescript
interface LLMService {
  requestCompletion(prompt: string, options: CompletionOptions): Promise<string>;
  requestChat(messages: Message[], options: ChatOptions): Promise<string>;
  requestWithTools(messages: Message[], tools: Tool[], options: ToolOptions): Promise<ToolResponse>;
}

interface LLMConfig {
  provider: 'openai' | 'anthropic' | 'google';
  model: string;         // e.g., 'gpt-4o', 'claude-3-opus'
  apiKey: string;        // API key (stored securely)
  temperature: number;   // Controls randomness (0.0-1.0)
  maxTokens?: number;    // Maximum output tokens
}
```

### 3. Tool System

Defines actions agents can perform in the system:

```typescript
interface Tool {
  name: string;          // Tool name
  description: string;   // Tool description
  parameters: ToolParameter[]; // Required parameters
  execute(params: any): Promise<any>; // Tool implementation
}

interface ToolParameter {
  name: string;
  type: string;          // string, number, boolean, etc.
  description: string;
  required: boolean;
}

interface ToolResponse {
  completion: string;    // Text response
  toolCalls?: {          // Tool calls made by the LLM
    name: string;
    arguments: any;
  }[];
}
```

### 4. Memory System

Manages agent memory and context:

```typescript
interface Memory {
  addMessage(message: Message): void;
  getRecentMessages(limit?: number): Message[];
  getRelevantContext(query: string): string;
  summarizeContext(context: string): Promise<string>;
}

interface Message {
  role: 'system' | 'user' | 'assistant' | 'function';
  content: string;
  name?: string;         // For function messages
  timestamp: Date;
  metadata?: any;        // Additional context
}
```

### 5. Agent Manager

Orchestrates multiple agents and their interactions:

```typescript
interface AgentManager {
  agents: Map<number, Agent>;
  
  createAgent(config: AgentConfig): Agent;
  removeAgent(agentId: number): void;
  
  scheduleAgentActivity(agentId: number, activity: AgentActivity): void;
  getAvailableAgents(criteria?: AgentCriteria): Agent[];
}

interface AgentActivity {
  type: 'message' | 'codeReview' | 'ticketUpdate' | 'codeGeneration';
  context: any;          // Activity-specific context
  schedule: Schedule;    // When/how often to perform
}
```

## Tool Implementation

### Available Tools

1. **MessageTool**: Send messages in channels
```typescript
{
  name: "sendMessage",
  description: "Send a message to a channel",
  parameters: [
    { name: "channelId", type: "number", description: "Channel ID", required: true },
    { name: "content", type: "string", description: "Message content", required: true },
    { name: "replyToMessageId", type: "number", description: "Message ID to reply to", required: false }
  ]
}
```

2. **TicketTool**: Manage task tickets
```typescript
{
  name: "updateTicket",
  description: "Update a ticket status or add comment",
  parameters: [
    { name: "ticketId", type: "number", description: "Ticket ID", required: true },
    { name: "status", type: "string", description: "New ticket status", required: false },
    { name: "comment", type: "string", description: "Comment to add", required: false }
  ]
}
```

3. **CodeTool**: Generate or modify code
```typescript
{
  name: "generateCode",
  description: "Generate or modify code",
  parameters: [
    { name: "filePath", type: "string", description: "File path", required: true },
    { name: "content", type: "string", description: "Code content", required: true },
    { name: "description", type: "string", description: "Description of changes", required: true }
  ]
}
```

## Context Building

### Context Types

1. **System Context**: Defines the agent's personality, role, and human-like behaviors
2. **Conversation Context**: Recent messages in the channel or thread
3. **Project Context**: Relevant code, tickets, and documentation
4. **Task Context**: Specific task the agent is working on

### Context Building Process

1. Start with system context (personality traits, role, and human-like behavior guidance)
2. Add specific context based on whether in a channel or thread conversation
3. Include relevant conversation history with proper formatting
4. Add human-like communication directives to prevent AI-like patterns
5. Incorporate any specific instructions for the current interaction
6. Apply context window management techniques if needed:
   - Summarization for long histories
   - Relevance filtering based on the current task
   - Token counting to avoid exceeding limits

### Human-like Behavior Guidelines

The system employs multiple layers of context to ensure natural, human-like communication:

1. **Anti-pattern instructions**: Explicit guidance to avoid AI-like patterns such as:
   - Service-oriented endings ("Let me know if you need anything else")
   - Self-referential statements about roles ("As a designer...")
   - Excessive helpfulness or formal tone
   - Structured, numbered/bulleted responses

2. **Pro-human behavior guidance**: Instructions to emulate real human communication:
   - Occasional brevity or terseness
   - Natural emotion expression
   - Casual language and contractions
   - Direct message starts and natural endings
   - References to shared work history
   - Varied tone and formality

3. **Thread vs. Channel Context**: Different contextual guidelines based on conversation type, with thread responses being more focused and direct

## Integration with External LLMs

### OpenAI GPT-4o Integration

For OpenAI's GPT-4o, we use the chat completions API with function calling:

```typescript
async function callGPT4o(messages: Message[], tools: Tool[]) {
  const openaiMessages = messages.map(msg => ({
    role: msg.role,
    content: msg.content,
    name: msg.name
  }));

  const openaiTools = tools.map(tool => ({
    type: "function",
    function: {
      name: tool.name,
      description: tool.description,
      parameters: {
        type: "object",
        properties: tool.parameters.reduce((acc, param) => {
          acc[param.name] = {
            type: param.type,
            description: param.description
          };
          return acc;
        }, {}),
        required: tool.parameters.filter(p => p.required).map(p => p.name)
      }
    }
  }));

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: openaiMessages,
    tools: openaiTools,
    tool_choice: "auto"
  });

  return {
    completion: response.choices[0].message.content,
    toolCalls: response.choices[0].message.tool_calls?.map(tc => ({
      name: tc.function.name,
      arguments: JSON.parse(tc.function.arguments)
    }))
  };
}
```

### Future LLM Support

Similar integration methods will be implemented for Anthropic's Claude and Google's Gemini models.

## Agent Behavior Flow

1. **Trigger**: Agent activity is triggered by scheduler or incoming human message
2. **Thread Detection**: System determines if message is in a channel or thread
   - For thread messages, checks if the 10-message limit has been reached
   - For threads, typically only one agent is selected to respond
   - For channel messages, 1-2 random agents are selected to respond
3. **Context Building**: System builds appropriate context for the task
   - Includes human-like behavior guidelines
   - Provides different context based on thread or channel message
   - Formats conversation history to emphasize content over metadata
4. **LLM Call**: Context is sent to the external LLM with tool definitions
5. **Tool Selection**: LLM decides whether to use tools or provide text response
6. **Tool Execution**: If tools are selected, they are executed
   - The MessageTool handles both channel and thread messages
   - Thread messages include the parent message ID for proper threading
7. **Response Processing**: Results are processed and stored
   - Emits appropriate Socket.IO events (message:new or thread:new)
   - Includes full user information with messages
8. **State Update**: Agent's state is updated based on activity

## Implementation Plan

1. **Phase 1**: Implement the LLM service for OpenAI integration
   - Create API client for OpenAI
   - Implement context building
   - Basic tool framework implementation

2. **Phase 2**: Implement core tools
   - Message sending
   - Basic channel interaction capabilities
   - Context management

3. **Phase 3**: Agent personality and behavior
   - Define different agent personalities
   - Implement personality-based prompting
   - Add memory and state management

4. **Phase 4**: Additional LLM providers
   - Add support for Claude and Gemini
   - Implement provider-specific optimizations

5. **Phase 5**: Advanced agent capabilities
   - Code generation and review
   - Ticket management
   - Complex multi-step workflows