import { Agent, AgentConfig } from './agent';
import UserModel from '../../models/User';
import MessageModel from '../../models/Message';
import ChannelModel from '../../models/Channel';
import logger from '../../utils/logger';

export interface AgentActivity {
  type: 'message' | 'codeReview' | 'ticketUpdate' | 'codeGeneration';
  context: any;
  schedule: {
    interval?: number;
    cron?: string;
    immediate?: boolean;
  };
}

/**
 * Manager for AI agents
 */
export class AgentManager {
  private agents: Map<number, Agent>;
  private activityIntervals: Map<number, NodeJS.Timeout>;
  private io: any | null;
  
  constructor() {
    this.agents = new Map();
    this.activityIntervals = new Map();
    this.io = null;
  }
  
  /**
   * Set Socket.IO instance for real-time communication
   */
  setIO(io: any): void {
    this.io = io;
  }
  
  /**
   * Initialize agents from the database
   */
  async initialize(): Promise<void> {
    try {
      // Get all AI users from the database
      const users = await UserModel.getAll();
      logger.info(`Found ${users.length} total users`);
      
      const aiUsers = users.filter(user => user.isAI);
      logger.info(`Found ${aiUsers.length} AI users`, aiUsers);
      
      // Create an agent for each AI user
      for (const user of aiUsers) {
        this.createAgent({
          id: user.id,
          name: user.name,
          role: user.role,
          personality: user.personality || 'Helpful and professional',
          capabilities: ['messaging']
        });
        logger.info(`Created agent for ${user.name}`, { id: user.id, role: user.role });
      }
      
      logger.info(`Initialized ${this.agents.size} AI agents`);
    } catch (error) {
      logger.error('Error initializing agents:', error);
    }
  }
  
  /**
   * Create a new agent
   */
  createAgent(config: AgentConfig): Agent {
    const agent = new Agent(config);
    this.agents.set(config.id, agent);
    return agent;
  }
  
  /**
   * Remove an agent
   */
  removeAgent(agentId: number): boolean {
    // Clear any scheduled activities
    if (this.activityIntervals.has(agentId)) {
      clearInterval(this.activityIntervals.get(agentId)!);
      this.activityIntervals.delete(agentId);
    }
    
    return this.agents.delete(agentId);
  }
  
  /**
   * Get an agent by ID
   */
  getAgent(agentId: number): Agent | undefined {
    return this.agents.get(agentId);
  }
  
  /**
   * Get all agents
   */
  getAllAgents(): Agent[] {
    return Array.from(this.agents.values());
  }
  
  /**
   * Schedule an activity for an agent
   */
  scheduleAgentActivity(agentId: number, activity: AgentActivity): void {
    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new Error(`Agent with ID ${agentId} not found`);
    }
    
    // Clear any existing interval
    if (this.activityIntervals.has(agentId)) {
      clearInterval(this.activityIntervals.get(agentId)!);
    }
    
    // Run immediately if specified
    if (activity.schedule.immediate) {
      this.executeAgentActivity(agent, activity);
    }
    
    // Schedule recurring activity
    if (activity.schedule.interval) {
      const interval = setInterval(() => {
        this.executeAgentActivity(agent, activity);
      }, activity.schedule.interval);
      
      this.activityIntervals.set(agentId, interval);
    }
  }
  
  /**
   * Execute a scheduled agent activity
   */
  private async executeAgentActivity(agent: Agent, activity: AgentActivity): Promise<void> {
    try {
      logger.info(`Executing ${activity.type} activity for agent ${agent.name}`, activity.context);
      
      switch (activity.type) {
        case 'message':
          await this.handleMessageActivity(agent, activity.context);
          break;
        case 'codeReview':
          logger.info('Code review activity not implemented yet');
          break;
        case 'ticketUpdate':
          logger.info('Ticket update activity not implemented yet');
          break;
        case 'codeGeneration':
          logger.info('Code generation activity not implemented yet');
          break;
      }
    } catch (error) {
      logger.error(`Error executing activity for agent ${agent.name}:`, error);
    }
  }
  
  /**
   * Handle message activity for an agent
   */
  private async handleMessageActivity(agent: Agent, context: { channelId: number }): Promise<void> {
    try {
      const { channelId } = context;
      logger.info(`Handling message activity for agent ${agent.name} in channel ${channelId}`);
      
      // Get channel and recent messages
      const channel = await ChannelModel.getById(channelId);
      if (!channel) {
        logger.error(`Channel with ID ${channelId} not found`);
        throw new Error(`Channel with ID ${channelId} not found`);
      }
      
      logger.info(`Found channel ${channel.name} (ID: ${channel.id})`);
      
      const recentMessages = await MessageModel.getByChannelId(channelId, 10);
      logger.info(`Retrieved ${recentMessages.length} recent messages from channel`, {
        messageIds: recentMessages.map(m => m.id)
      });
      
      // Generate response
      logger.info(`Generating response for agent ${agent.name}`);
      const response = await agent.takeAction(channelId, recentMessages);
      logger.info(`Agent ${agent.name} response received`, {
        hasCompletion: !!response.completion,
        toolCalls: response.toolCalls
      });
      
      // If the agent didn't use a tool to send a message, but provided a text response,
      // create a message manually
      if (response.completion && !response.toolCalls.some(tc => tc.name === 'sendMessage')) {
        logger.info(`Agent ${agent.name} provided text response without using sendMessage tool. Creating message manually`, {
          content: response.completion?.substring(0, 100) + (response.completion.length > 100 ? '...' : '')
        });
        
        const message = await MessageModel.create({
          channelId,
          userId: agent.id,
          content: response.completion,
          threadParentId: null
        });
        
        logger.info(`Created message for agent ${agent.name}`, { messageId: message.id });
        
        // Emit the message via Socket.IO
        if (this.io) {
          const messageWithUser = {
            ...message, 
            user: { 
              id: agent.id, 
              name: agent.name,
              role: agent.role,
              isAI: true
            }
          };
          
          logger.info(`Emitting message:new event for agent ${agent.name}'s message`, {
            messageId: message.id
          });
          
          this.io.emit('message:new', messageWithUser);
        } else {
          logger.warn(`Socket.IO instance not available, can't emit message:new event`);
        }
      } else if (response.toolCalls.length > 0) {
        logger.info(`Agent ${agent.name} used ${response.toolCalls.length} tools`);
      } else {
        logger.warn(`Agent ${agent.name} didn't provide a completion or use any tools`);
      }
    } catch (error) {
      logger.error(`Error handling message activity for agent ${agent.name}:`, error);
    }
  }
  
  /**
   * Handle an incoming message
   */
  async handleIncomingMessage(message: any): Promise<void> {
    logger.info('Received message for agent handling', { 
      messageId: message.id,
      channelId: message.channelId,
      userId: message.userId,
      user: message.user ? { 
        id: message.user.id, 
        name: message.user.name, 
        isAI: message.user.isAI 
      } : null
    });
    
    // Only trigger agents for messages from human users
    if (message.user && !message.user.isAI) {
      logger.info('Message is from human user, triggering agent response');
      
      // Find agents that should respond
      const agents = this.getRandomAgentsToRespond(message.channelId);
      logger.info(`Selected ${agents.length} agents to respond`, {
        agentIds: agents.map(a => a.id),
        agentNames: agents.map(a => a.name)
      });
      
      // Schedule responses with some delay for natural conversation
      for (const [index, agent] of agents.entries()) {
        // Add some delay between agent responses (1-5 seconds between each)
        const delay = 1000 + (index * 2000) + (Math.random() * 2000);
        
        logger.info(`Scheduling response from agent ${agent.name} with delay ${delay}ms`);
        
        setTimeout(() => {
          logger.info(`Executing scheduled response from agent ${agent.name}`);
          this.executeAgentActivity(agent, {
            type: 'message',
            context: { channelId: message.channelId },
            schedule: { immediate: true }
          });
        }, delay);
      }
    } else {
      logger.info('Message is not from a human user or missing user info, ignoring');
    }
  }
  
  /**
   * Get a random subset of agents to respond to a message
   */
  private getRandomAgentsToRespond(channelId: number): Agent[] {
    const allAgents = this.getAllAgents();
    
    // For now, randomly select 1-2 agents to respond
    const numResponders = Math.floor(Math.random() * 2) + 1;
    
    // Shuffle and take the first numResponders
    return allAgents
      .sort(() => Math.random() - 0.5)
      .slice(0, Math.min(numResponders, allAgents.length));
  }
  
  /**
   * Shutdown all agents
   */
  shutdown(): void {
    // Clear all scheduled activities
    for (const interval of this.activityIntervals.values()) {
      clearInterval(interval);
    }
    this.activityIntervals.clear();
    
    // Clear agent map
    this.agents.clear();
    
    console.log('All agents shut down');
  }
}