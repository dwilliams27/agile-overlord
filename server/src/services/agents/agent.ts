import { LLMFactory } from '../llm/llm.factory';
import { LLMConfig, Message, Tool, ToolResponse } from '../llm/types';
import { MessageTool } from '../llm/tools/message.tool';
import logger from '../../utils/logger';

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
    
    try {
      this.llmService = LLMFactory.getLLMService(this.llmConfig);
      logger.info(`Created LLM service for agent ${this.name}`, {
        provider: this.llmConfig.provider || 'default',
        model: this.llmConfig.model || 'default'
      });
    } catch (error) {
      logger.error(`Failed to create LLM service for agent ${this.name}:`, error);
      throw error;
    }
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
      content: `You are currently in channel #${channelId}. Respond to the conversation naturally.
      
When responding to messages, use the sendMessage tool with the replyToMessageId parameter set to the ID of the message you are replying to. This creates threaded conversations.`
    });
    
    // Find the latest message ID to potentially respond to
    let latestMessageId: number | null = null;
    if (recentMessages.length > 0) {
      latestMessageId = recentMessages[0].id;
    }
    
    if (latestMessageId) {
      messages.push({
        role: 'system',
        content: `The latest message ID in this channel is ${latestMessageId}. You can respond to it by using the sendMessage tool with replyToMessageId=${latestMessageId}.`
      });
    }
    
    // Add recent messages
    for (const msg of recentMessages) {
      messages.push({
        role: msg.userId === this.id ? 'assistant' : 'user',
        content: `${msg.user?.name || 'Unknown'} (messageId: ${msg.id}): ${msg.content}`,
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
      logger.info(`Agent ${this.name} taking action in channel ${channelId}`);
      
      const context = this.buildConversationContext(channelId, messages);
      logger.debug(`Built conversation context for agent ${this.name}`, {
        contextLength: context.length,
        lastMessageContent: context[context.length - 1]?.content?.substring(0, 100)
      });
      
      const tools = this.getTools();
      logger.info(`Using ${tools.length} tools for agent ${this.name}`, {
        toolNames: tools.map(t => t.name)
      });
      
      logger.info(`Requesting LLM response for agent ${this.name}`);
      const response = await this.llmService.requestWithTools(context, tools);
      logger.info(`Received LLM response for agent ${this.name}`, {
        hasCompletion: !!response.completion,
        toolCallsCount: response.toolCalls.length,
        completion: response.completion?.substring(0, 100) + (response.completion?.length > 100 ? '...' : '')
      });
      
      // Execute tool calls if any
      for (const toolCall of response.toolCalls) {
        const tool = tools.find(t => t.name === toolCall.name);
        if (tool) {
          logger.info(`Executing tool ${toolCall.name} for agent ${this.name}`, {
            arguments: toolCall.arguments
          });
          
          const result = await tool.execute(toolCall.arguments);
          logger.info(`Tool ${toolCall.name} execution result for agent ${this.name}`, result);
          
          // Add tool execution to memory
          this.addMemory({
            type: 'system',
            content: `Used tool ${toolCall.name} with result: ${JSON.stringify(result)}`,
            metadata: { toolCall, result }
          });
        } else {
          logger.warn(`Tool ${toolCall.name} not found for agent ${this.name}`);
        }
      }
      
      // Update agent state
      this.state.lastActivity = new Date();
      
      return response;
    } catch (error) {
      logger.error(`Error executing action for agent ${this.name}:`, error);
      return {
        completion: `[Error executing action: ${error.message}]`,
        toolCalls: []
      };
    }
  }
}