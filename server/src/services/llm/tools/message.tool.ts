import { Tool, ToolParameter } from '../types';
import MessageModel from '../../../models/Message';
import ChannelModel from '../../../models/Channel';

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
      
      // Validate channel exists
      const channel = await ChannelModel.getById(channelId);
      if (!channel) {
        throw new Error(`Channel with ID ${channelId} not found`);
      }
      
      // Validate thread parent message if provided
      if (replyToMessageId) {
        const parentMessage = await MessageModel.getById(replyToMessageId);
        if (!parentMessage) {
          throw new Error(`Parent message with ID ${replyToMessageId} not found`);
        }
      }
      
      // Create message
      const message = await MessageModel.create({
        channelId,
        userId: this.userId,
        content,
        threadParentId: replyToMessageId || null
      });
      
      return {
        success: true,
        messageId: message.id,
        message: 'Message sent successfully'
      };
    } catch (error) {
      console.error('Error executing sendMessage tool:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}