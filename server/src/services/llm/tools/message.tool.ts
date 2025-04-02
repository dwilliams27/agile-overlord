import { Tool, ToolParameter } from '../types';
import MessageModel from '../../../models/Message';
import ChannelModel from '../../../models/Channel';
import UserModel from '../../../models/User';
import logger from '../../../utils/logger';

// Import io instance
let io: any;
try {
  io = require('../../../index').io;
} catch (err) {
  logger.warn('Could not import io instance directly', err);
  io = null;
}

/**
 * Tool for sending messages in channels
 */
export class MessageTool implements Tool {
  name = 'sendMessage';
  description = 'Send a message to a channel or reply to another message';
  userId: number;
  
  constructor(userId: number) {
    this.userId = userId;
  }
  
  parameters: Record<string, ToolParameter> = {
    channelId: {
      type: 'integer',
      description: 'The ID of the channel to send the message to',
      required: true
    },
    content: {
      type: 'string',
      description: 'The content of the message to send',
      required: true
    },
    replyToMessageId: {
      type: 'integer',
      description: 'The ID of the message to reply to (for thread replies)',
      required: false
    }
  };
  
  async execute(params: Record<string, any>): Promise<any> {
    try {
      const { channelId, content, replyToMessageId } = params;
      
      logger.info(`Executing sendMessage tool for user ${this.userId}`, { 
        channelId, 
        hasReplyToMessageId: !!replyToMessageId
      });
      
      // Validate channel exists
      const channel = await ChannelModel.getById(channelId);
      if (!channel) {
        logger.error(`Channel with ID ${channelId} not found`);
        throw new Error(`Channel with ID ${channelId} not found`);
      }
      
      // Get user information
      const user = await UserModel.getById(this.userId);
      if (!user) {
        logger.error(`User with ID ${this.userId} not found`);
        throw new Error(`User with ID ${this.userId} not found`);
      }
      
      // For now, use the input message ID as parentMessageId by default
      // This ensures all AI responses are threaded
      let parentMessageId = null;
      
      // Check if replyToMessageId is provided
      if (replyToMessageId) {
        // Validate thread parent message
        const parentMessage = await MessageModel.getById(replyToMessageId);
        if (!parentMessage) {
          logger.error(`Parent message with ID ${replyToMessageId} not found`);
          throw new Error(`Parent message with ID ${replyToMessageId} not found`);
        }
        parentMessageId = replyToMessageId;
      } else {
        // Get the latest message in the channel to reply to
        const recentMessages = await MessageModel.getByChannelId(channelId, 1);
        if (recentMessages.length > 0) {
          parentMessageId = recentMessages[0].id;
          logger.info(`No replyToMessageId provided, using latest message ID ${parentMessageId} as parent`);
        }
      }
      
      // Create message
      const message = await MessageModel.create({
        channelId,
        userId: this.userId,
        content,
        threadParentId: parentMessageId
      });
      
      logger.info(`Created message ID ${message.id} for user ${this.userId}`, { 
        isThreadMessage: !!parentMessageId 
      });
      
      // Emit socket event for the new message
      if (io) {
        const messageWithUser = {
          ...message,
          user: {
            id: user.id,
            name: user.name,
            role: user.role,
            isAI: user.isAI
          }
        };
        
        if (parentMessageId) {
          // Emit thread:new event
          logger.info(`Emitting thread:new event for message ${message.id}`);
          io.emit('thread:new', {
            ...messageWithUser,
            parentMessageId
          });
        } else {
          // Emit message:new event
          logger.info(`Emitting message:new event for message ${message.id}`);
          io.emit('message:new', messageWithUser);
        }
      } else {
        logger.warn('Socket.io instance not available, could not emit message events');
      }
      
      return {
        success: true,
        messageId: message.id,
        isThreadMessage: !!parentMessageId,
        message: 'Message sent successfully'
      };
    } catch (error) {
      logger.error('Error executing sendMessage tool:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}