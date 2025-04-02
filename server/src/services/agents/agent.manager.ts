import { Agent, AgentConfig } from './agent';
import UserModel from '../../models/User';
import MessageModel from '../../models/Message';
import ChannelModel from '../../models/Channel';

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
      const aiUsers = users.filter(user => user.isAI);
      
      // Create an agent for each AI user
      for (const user of aiUsers) {
        this.createAgent({
          id: user.id,
          name: user.name,
          role: user.role,
          personality: user.personality || 'Helpful and professional',
          capabilities: ['messaging']
        });
      }
      
      console.log(`Initialized ${this.agents.size} AI agents`);
    } catch (error) {
      console.error('Error initializing agents:', error);
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
      switch (activity.type) {
        case 'message':
          await this.handleMessageActivity(agent, activity.context);
          break;
        case 'codeReview':
          // Not implemented yet
          break;
        case 'ticketUpdate':
          // Not implemented yet
          break;
        case 'codeGeneration':
          // Not implemented yet
          break;
      }
    } catch (error) {
      console.error(`Error executing activity for agent ${agent.name}:`, error);
    }
  }
  
  /**
   * Handle message activity for an agent
   */
  private async handleMessageActivity(agent: Agent, context: { channelId: number }): Promise<void> {
    try {
      const { channelId } = context;
      
      // Get channel and recent messages
      const channel = await ChannelModel.getById(channelId);
      if (!channel) {
        throw new Error(`Channel with ID ${channelId} not found`);
      }
      
      const recentMessages = await MessageModel.getByChannelId(channelId, 10);
      
      // Generate response
      const response = await agent.takeAction(channelId, recentMessages);
      
      // If the agent didn't use a tool to send a message, but provided a text response,
      // create a message manually
      if (response.completion && !response.toolCalls.some(tc => tc.name === 'sendMessage')) {
        const message = await MessageModel.create({
          channelId,
          userId: agent.id,
          content: response.completion,
          threadParentId: null
        });
        
        // Emit the message via Socket.IO
        if (this.io) {
          this.io.emit('message:new', { 
            ...message, 
            user: { 
              id: agent.id, 
              name: agent.name,
              role: agent.role,
              isAI: true
            } 
          });
        }
      }
    } catch (error) {
      console.error(`Error handling message activity for agent ${agent.name}:`, error);
    }
  }
  
  /**
   * Handle an incoming message
   */
  async handleIncomingMessage(message: any): Promise<void> {
    // Only trigger agents for messages from human users
    if (message.user && !message.user.isAI) {
      // Find agents that should respond
      const agents = this.getRandomAgentsToRespond(message.channelId);
      
      // Schedule responses with some delay for natural conversation
      for (const [index, agent] of agents.entries()) {
        // Add some delay between agent responses (1-5 seconds between each)
        const delay = 1000 + (index * 2000) + (Math.random() * 2000);
        
        setTimeout(() => {
          this.executeAgentActivity(agent, {
            type: 'message',
            context: { channelId: message.channelId },
            schedule: { immediate: true }
          });
        }, delay);
      }
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