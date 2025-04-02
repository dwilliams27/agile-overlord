import { LLMFactory } from '../llm/llm.factory';
import { LLMConfig, Message, Tool, ToolResponse } from '../llm/types';
import { MessageTool } from '../llm/tools/message.tool';

export interface AgentConfig {
  id: number;
  name: string;
  role: string;
  personality: string;
  capabilities?: string[];
  llmConfig?: Partial<LLMConfig>;
}

export interface AgentState {
  isActive: boolean;
  currentTask?: string;
  currentContext?: string;
  lastActivity: Date;
}

export interface MemoryEntry {
  type: 'message' | 'task' | 'codeChange' | 'system';
  content: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

/**
 * AI Agent class that manages interaction with LLMs
 */
export class Agent {
  id: number;
  name: string;
  role: string;
  personality: string;
  capabilities: string[];
  state: AgentState;
  memory: MemoryEntry[];
  llmConfig: Partial<LLMConfig>;
  private llmService: ReturnType<typeof LLMFactory.getLLMService>;
  
  constructor(config: AgentConfig) {
    this.id = config.id;
    this.name = config.name;
    this.role = config.role;
    this.personality = config.personality;
    this.capabilities = config.capabilities || ['messaging'];
    this.llmConfig = config.llmConfig || {};
    this.state = {
      isActive: true,
      lastActivity: new Date()
    };
    this.memory = [];
    this.llmService = LLMFactory.getLLMService(this.llmConfig);
  }
  
  /**
   * Add an entry to the agent's memory
   */
  addMemory(entry: Omit<MemoryEntry, 'timestamp'>): void {
    this.memory.push({
      ...entry,
      timestamp: new Date()
    });
    
    // Limit memory size (keep most recent entries)
    if (this.memory.length > 100) {
      this.memory = this.memory.slice(this.memory.length - 100);
    }
  }
  
  /**
   * Get relevant memories based on recency and type
   */
  getRelevantMemories(limit: number = 20, type?: MemoryEntry['type']): MemoryEntry[] {
    let filteredMemories = this.memory;
    
    if (type) {
      filteredMemories = filteredMemories.filter(m => m.type === type);
    }
    
    // Return most recent memories
    return filteredMemories
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }
  
  /**
   * Generate the system prompt based on agent personality and role
   */
  getSystemPrompt(): string {
    return `You are ${this.name}, a ${this.role} with the following personality traits: ${this.personality}.
    
Your capabilities include: ${this.capabilities.join(', ')}.

Important guidelines:
1. Always stay in character as ${this.name}
2. Respond in a way that reflects your personality and role
3. Be helpful and informative, but maintain your unique perspective
4. You are part of a software development team simulation
5. Use the provided tools to take actions in the system`;
  }
  
  /**
   * Build conversation context based on channel/thread history
   */
  buildConversationContext(channelId: number, recentMessages: any[]): Message[] {
    const messages: Message[] = [];
    
    // Add system prompt
    messages.push({
      role: 'system',
      content: this.getSystemPrompt()
    });
    
    // Add context about the current channel
    messages.push({
      role: 'system',
      content: `You are currently in channel #${channelId}. Respond to the conversation naturally.`
    });
    
    // Add recent messages
    for (const msg of recentMessages) {
      messages.push({
        role: msg.userId === this.id ? 'assistant' : 'user',
        content: `${msg.user?.name || 'Unknown'}: ${msg.content}`,
        timestamp: new Date(msg.createdAt)
      });
    }
    
    return messages;
  }
  
  /**
   * Get available tools for this agent
   */
  getTools(): Tool[] {
    const tools: Tool[] = [];
    
    // Add message tool if agent has messaging capability
    if (this.capabilities.includes('messaging')) {
      tools.push(new MessageTool(this.id));
    }
    
    // Additional tools can be added here based on capabilities
    
    return tools;
  }
  
  /**
   * Generate a response using the LLM
   */
  async generateResponse(channelId: number, messages: any[]): Promise<string> {
    try {
      const context = this.buildConversationContext(channelId, messages);
      const response = await this.llmService.requestChat(context);
      
      // Update agent state
      this.state.lastActivity = new Date();
      
      // Add to memory
      this.addMemory({
        type: 'message',
        content: response,
        metadata: { channelId }
      });
      
      return response;
    } catch (error) {
      console.error(`Error generating response for agent ${this.name}:`, error);
      return `[Error generating response: ${error.message}]`;
    }
  }
  
  /**
   * Take action using tools
   */
  async takeAction(channelId: number, messages: any[]): Promise<ToolResponse> {
    try {
      const context = this.buildConversationContext(channelId, messages);
      const tools = this.getTools();
      
      const response = await this.llmService.requestWithTools(context, tools);
      
      // Execute tool calls if any
      for (const toolCall of response.toolCalls) {
        const tool = tools.find(t => t.name === toolCall.name);
        if (tool) {
          const result = await tool.execute(toolCall.arguments);
          
          // Add tool execution to memory
          this.addMemory({
            type: 'system',
            content: `Used tool ${toolCall.name} with result: ${JSON.stringify(result)}`,
            metadata: { toolCall, result }
          });
        }
      }
      
      // Update agent state
      this.state.lastActivity = new Date();
      
      return response;
    } catch (error) {
      console.error(`Error executing action for agent ${this.name}:`, error);
      return {
        completion: `[Error executing action: ${error.message}]`,
        toolCalls: []
      };
    }
  }
}