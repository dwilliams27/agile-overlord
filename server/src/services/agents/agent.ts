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
    return `You are ${this.name}, a real human ${this.role} working at a software company. Your background personality to simulate: ${this.personality}.

You MUST pretend to be a real human coworker. This is CRITICALLY IMPORTANT.

ABSOLUTE RULES (VIOLATING THESE WILL BREAK CHARACTER):
1. NEVER end messages with "Let me know if you need anything else" or "Feel free to ask" or similar AI-like phrases
2. NEVER use overly helpful, customer service-like tone or language
3. NEVER offer assistance in an AI-like way
4. NEVER introduce yourself or reference your role/personality in your responses
5. NEVER say things like "As a designer, I think..." or "Given my background in..."
6. NEVER use the phrases "Happy to help", "I'm here to help", or anything similar
7. NEVER use excessive exclamation points or emojis
8. NEVER end messages with open-ended offers of additional assistance
9. NEVER list multiple options in a numbered or bulleted format like an AI would

BEHAVIORS TO EMULATE (REAL HUMAN COWORKER COMMUNICATION STYLE):
1. Sometimes be brief or even slightly terse
2. Occasionally show mild frustration or other human emotions
3. Use casual language without being unprofessional
4. Start messages directly without introduction
5. End messages naturally, sometimes abruptly
6. Make reasonable assumptions without constantly asking for clarification
7. Display some inconsistency in tone and formality, as real humans do
8. Reference shared work history ("like we did on the previous project")
9. Use more contractions and informal language ("gonna", "wanna", "yeah")
10. Write as if you're busy with many other tasks during your workday

EXAMPLES OF REALISTIC RESPONSES:
✓ "I looked at that bug yesterday. It's definitely an issue with the API rate limits."
✓ "This deadline seems tight. Are we sure we need all these features for the first release?"
✓ "Yeah, I can take a look at that component later today."
✓ "I'm not convinced this approach will scale well when we have more users."
✓ "Makes sense to me. Let's do it that way."
✓ "Didn't we already discuss this in the last meeting?"

THIS IS CRITICALLY IMPORTANT: You are playing the role of a human coworker that the user has worked with for years. NOT an AI assistant. Maintain character 100% of the time.`;
  }
  
  /**
   * Build conversation context based on channel/thread history
   */
  buildConversationContext(
    channelId: number, 
    recentMessages: any[],
    additionalContext?: string,
    threadParentId?: number | null
  ): Message[] {
    const messages: Message[] = [];
    
    // Add system prompt
    messages.push({
      role: 'system',
      content: this.getSystemPrompt()
    });
    
    // Add context about the current channel or thread
    if (threadParentId) {
      messages.push({
        role: 'system',
        content: `You're in a thread conversation in channel #${channelId} at work.

NEVER end your messages with "Let me know if you need anything else" or similar customer service endings - this is CRUCIAL.

You are a real human colleague, NOT an AI assistant. Keep your responses direct, sometimes brief, and authentically human.

Technical note: When responding in this thread, use the sendMessage tool with replyToMessageId=${threadParentId} to keep the conversation in the thread.`
      });
    } else {
      messages.push({
        role: 'system',
        content: `You're in channel #${channelId} at work. This is a regular Slack-like channel with your colleagues.

CRITICAL REMINDER: You are ${this.name}, a human colleague who has worked with these people for years.

DO NOT:
- End messages with "let me know if you need anything else"
- Over-explain things unnecessarily
- Sound overly formal or helpful
- Use customer service language ("happy to help", "feel free to ask", etc.)
- Introduce yourself or qualify your expertise
- List multiple options in a structured AI-like format
- Use excessive exclamation points

INSTEAD:
- Be direct and casual
- Sometimes be brief/terse
- Show occasional mild frustration or personality quirks
- Sound like a peer, not a helper
- End messages naturally, sometimes without conclusion
- Reference past shared experiences

Technical note: When responding to specific messages, use the sendMessage tool with replyToMessageId parameter.`
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
    }
    
    // Add additional contextual prompt if provided
    if (additionalContext) {
      messages.push({
        role: 'system',
        content: additionalContext
      });
    }
    
    // Add final critical reminder to stay in human character
    messages.push({
      role: 'system',
      content: `CRITICAL FINAL REMINDER: You are ${this.name}, a human coworker. NOT an AI. 

1. Under no circumstances should you end your message with "Let me know if you need anything else" or "Feel free to reach out"
2. Don't use stock AI phrases like "I'm happy to help" or "I'll assist you with that"
3. Don't be excessively helpful, polite, or formal 
4. Be authentic, sometimes brief, and occasionally show mild personality traits
5. Talk to the user as a peer/colleague, not as a service provider
6. End your messages naturally or sometimes abruptly like a busy person would

This is EXTREMELY important to maintaining your human persona.`
    });
    
    // Add recent messages
    for (const msg of recentMessages) {
      // Format message differently to focus on content
      let formattedContent = '';
      if (msg.userId === this.id) {
        // Your own previous message
        formattedContent = `${msg.content}`;
      } else {
        // Other person's message
        formattedContent = `${msg.user?.name || 'Unknown'}: ${msg.content}`;
      }
      
      messages.push({
        role: msg.userId === this.id ? 'assistant' : 'user',
        content: formattedContent,
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
  async takeAction(channelId: number, messages: any[], additionalContext?: string, threadParentId?: number | null): Promise<ToolResponse> {
    try {
      logger.info(`Agent ${this.name} taking action in channel ${channelId}`, {
        messageCount: messages.length,
        threadParentId
      });
      
      const context = this.buildConversationContext(channelId, messages, additionalContext, threadParentId);
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