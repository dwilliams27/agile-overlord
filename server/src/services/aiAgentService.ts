import UserModel, { User } from '../models/User';
import ChannelModel from '../models/Channel';
import MessageModel from '../models/Message';

class AIAgentService {
  private aiUsers: User[] = [];
  private channels: any[] = [];
  private messageIntervals: NodeJS.Timeout[] = [];
  private io: any = null;
  
  // Probability weights for different actions
  private readonly actionWeights = {
    newMessage: 0.7,    // 70% chance of posting a new message
    threadReply: 0.25,  // 25% chance of replying to a thread
    channelSwitch: 0.05 // 5% chance of switching channels
  };
  
  // Sample messages for AI agents - these would ideally be more sophisticated
  // and tailored to each agent's personality
  private readonly sampleMessages = [
    // StanBot (Engineer) messages
    [
      "Has anyone reviewed my PR yet?",
      "The code quality in this repo needs improvement.",
      "We should refactor this before adding more features.",
      "Did someone forget to add tests again?",
      "Let's discuss our coding standards at the next meeting.",
      "I've updated the documentation for the API.",
      "This code won't scale well with more users.",
      "I'm working on optimizing the database queries."
    ],
    // GingerBot (Designer) messages
    [
      "The new UI mockups are ready for review!",
      "I think we should update our color palette.",
      "User testing showed some issues with the navigation.",
      "Has anyone considered accessibility in this design?",
      "I've created some new icons for the dashboard.",
      "The spacing is inconsistent across the app.",
      "We need to improve the mobile experience.",
      "I found some inspiration for our landing page redesign."
    ],
    // CasualBot (Junior Developer) messages
    [
      "Hey everyone! How's it going?",
      "I'm stuck on this bug, can someone help?",
      "Just pushed my first feature, fingers crossed!",
      "Anyone else having trouble with the dev environment?",
      "Taking a coffee break, be back in 15.",
      "Did you see that new JavaScript framework?",
      "Weekend plans, anyone?",
      "Just found a cool VS Code extension."
    ]
  ];
  
  // Thread replies - more contextual responses
  private readonly threadReplies = [
    // StanBot (Engineer) replies
    [
      "I've seen this issue before. Check your error logs.",
      "Have you run the linter? There might be syntax errors.",
      "Let's create a ticket to track this problem.",
      "We should add a unit test for this case.",
      "I can pair program with you on this if you'd like."
    ],
    // GingerBot (Designer) replies
    [
      "From a UX perspective, that's confusing for users.",
      "Let me mock up an alternative approach.",
      "I think we should get some user feedback on this.",
      "The visual hierarchy needs work here.",
      "Have we considered how this will look on mobile?"
    ],
    // CasualBot (Junior Developer) replies
    [
      "Thanks for the explanation! Now I get it.",
      "I'll give that a try!",
      "Oh, I didn't know that was a feature.",
      "Cool! Learning something new every day.",
      "I'm still confused, can you explain it differently?"
    ]
  ];
  
  constructor() {}
  
  async initialize(io: any) {
    if (this.messageIntervals.length > 0) {
      // Already initialized
      return;
    }
    
    this.io = io;
    
    try {
      // Load AI users
      const allUsers = await UserModel.getAll();
      this.aiUsers = allUsers.filter(user => user.isAI);
      
      // Load channels
      this.channels = await ChannelModel.getAll();
      
      // Start message simulation for each AI user
      this.aiUsers.forEach((user, index) => {
        // Determine interval - each bot posts at different frequencies
        const intervalTime = 30000 + (index * 15000); // 30s, 45s, 60s, etc.
        
        const interval = setInterval(() => this.simulateAgentActivity(user), intervalTime);
        this.messageIntervals.push(interval);
      });
      
      console.log(`Started AI agent simulation with ${this.aiUsers.length} agents`);
    } catch (error) {
      console.error('Error initializing AI agent service:', error);
    }
  }
  
  async simulateAgentActivity(agent: User) {
    try {
      const action = this.determineAction();
      
      switch (action) {
        case 'newMessage':
          await this.postNewMessage(agent);
          break;
        case 'threadReply':
          await this.postThreadReply(agent);
          break;
        case 'channelSwitch':
          // Just a simulation of the agent switching channels
          // No actual action needed as this is just conceptual
          break;
      }
    } catch (error) {
      console.error(`Error simulating activity for agent ${agent.name}:`, error);
    }
  }
  
  private determineAction(): 'newMessage' | 'threadReply' | 'channelSwitch' {
    const random = Math.random();
    if (random < this.actionWeights.newMessage) {
      return 'newMessage';
    } else if (random < this.actionWeights.newMessage + this.actionWeights.threadReply) {
      return 'threadReply';
    } else {
      return 'channelSwitch';
    }
  }
  
  private async postNewMessage(agent: User) {
    if (this.channels.length === 0) return;
    
    // Randomly select a channel
    const channelIndex = Math.floor(Math.random() * this.channels.length);
    const channel = this.channels[channelIndex];
    
    // Select a message appropriate for this agent
    const agentIndex = this.aiUsers.findIndex(user => user.id === agent.id);
    const messageIndex = agentIndex % this.sampleMessages.length;
    const messages = this.sampleMessages[messageIndex];
    const messageContent = messages[Math.floor(Math.random() * messages.length)];
    
    // Create the message
    const message = await MessageModel.create({
      channelId: channel.id,
      userId: agent.id,
      content: messageContent,
      threadParentId: null
    });
    
    // Emit the message via Socket.IO
    if (this.io) {
      this.io.emit('message:new', { ...message, user: agent });
    }
    
    console.log(`AI agent ${agent.name} posted in #${channel.name}: ${messageContent}`);
  }
  
  private async postThreadReply(agent: User) {
    // Find a recent message to reply to
    // In a real implementation, we would have more sophisticated logic here
    try {
      // Get a random channel
      const channelIndex = Math.floor(Math.random() * this.channels.length);
      const channel = this.channels[channelIndex];
      
      // Get recent messages from this channel
      const recentMessages = await MessageModel.getByChannelId(channel.id, 10, 0);
      
      if (recentMessages.length === 0) {
        // No messages to reply to, post a new message instead
        return this.postNewMessage(agent);
      }
      
      // Pick a random message to reply to
      const parentMessage = recentMessages[Math.floor(Math.random() * recentMessages.length)];
      
      // Select a reply appropriate for this agent
      const agentIndex = this.aiUsers.findIndex(user => user.id === agent.id);
      const replyIndex = agentIndex % this.threadReplies.length;
      const replies = this.threadReplies[replyIndex];
      const replyContent = replies[Math.floor(Math.random() * replies.length)];
      
      // Create the thread reply
      const threadMessage = await MessageModel.create({
        channelId: channel.id,
        userId: agent.id,
        content: replyContent,
        threadParentId: parentMessage.id
      });
      
      // Emit the thread message via Socket.IO
      if (this.io) {
        this.io.emit('thread:new', { 
          ...threadMessage, 
          parentMessageId: parentMessage.id,
          user: agent 
        });
      }
      
      console.log(`AI agent ${agent.name} replied to a thread: ${replyContent}`);
    } catch (error) {
      console.error('Error posting thread reply:', error);
      // Fallback to posting a new message
      this.postNewMessage(agent);
    }
  }
  
  shutdown() {
    // Clear all message intervals when shutting down
    this.messageIntervals.forEach(interval => clearInterval(interval));
    this.messageIntervals = [];
    console.log('AI agent simulation stopped');
  }
}

export default new AIAgentService();