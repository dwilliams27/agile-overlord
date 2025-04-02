import { 
  LLMService, 
  Message, 
  Tool, 
  CompletionOptions, 
  ChatOptions,
  ToolResponse
} from './types';
import OpenAI from 'openai';
import logger from '../../utils/logger';

/**
 * OpenAI LLM service implementation
 */
export class OpenAIService implements LLMService {
  private client: OpenAI;
  private defaultModel: string;
  
  constructor(apiKey: string, defaultModel = 'gpt-4o') {
    if (!apiKey) {
      const error = new Error('OpenAI API key is required');
      logger.error('Failed to initialize OpenAI service:', error);
      throw error;
    }
    
    this.client = new OpenAI({ apiKey });
    this.defaultModel = defaultModel;
    logger.info(`OpenAI service initialized with model ${defaultModel}`);
  }
  
  /**
   * Request a completion from the OpenAI API
   */
  async requestCompletion(prompt: string, options: CompletionOptions = {}): Promise<string> {
    try {
      const completion = await this.client.completions.create({
        model: 'gpt-3.5-turbo-instruct', // OpenAI's text completion model
        prompt,
        max_tokens: options.maxTokens || 1000,
        temperature: options.temperature || 0.7,
        top_p: options.topP || 1,
        frequency_penalty: options.frequencyPenalty || 0,
        presence_penalty: options.presencePenalty || 0,
        stop: options.stop
      });
      
      return completion.choices[0]?.text || '';
    } catch (error) {
      console.error('Error requesting completion from OpenAI:', error);
      throw new Error(`OpenAI completion request failed: ${error.message}`);
    }
  }
  
  /**
   * Request a chat completion from the OpenAI API
   */
  async requestChat(messages: Message[], options: ChatOptions = {}): Promise<string> {
    try {
      const openaiMessages = messages.map(msg => ({
        role: msg.role as any,
        content: msg.content,
        name: msg.name
      }));
      
      const chatCompletion = await this.client.chat.completions.create({
        model: options.user === 'debug' ? 'gpt-3.5-turbo' : this.defaultModel,
        messages: openaiMessages,
        max_tokens: options.maxTokens,
        temperature: options.temperature || 0.7,
        top_p: options.topP || 1,
        frequency_penalty: options.frequencyPenalty || 0,
        presence_penalty: options.presencePenalty || 0,
        stop: options.stop,
        user: options.user
      });
      
      return chatCompletion.choices[0]?.message?.content || '';
    } catch (error) {
      console.error('Error requesting chat completion from OpenAI:', error);
      throw new Error(`OpenAI chat request failed: ${error.message}`);
    }
  }
  
  /**
   * Request a chat completion with tools from the OpenAI API
   */
  async requestWithTools(messages: Message[], tools: Tool[], options: ChatOptions = {}): Promise<ToolResponse> {
    try {
      logger.info('Preparing OpenAI request with tools', {
        messageCount: messages.length,
        toolCount: tools.length
      });
      
      const openaiMessages = messages.map(msg => ({
        role: msg.role as any,
        content: msg.content,
        name: msg.name,
        tool_call_id: msg.toolCallId
      }));
      
      // Convert tools to OpenAI format
      const openaiTools = tools.map(tool => ({
        type: 'function' as const,
        function: {
          name: tool.name,
          description: tool.description,
          parameters: {
            type: 'object',
            properties: tool.parameters,
            required: Object.entries(tool.parameters)
              .filter(([_, param]) => param.required)
              .map(([name]) => name)
          }
        }
      }));
      
      logger.info('Making OpenAI API request', {
        model: options.user === 'debug' ? 'gpt-3.5-turbo' : this.defaultModel,
        temperature: options.temperature || 0.7,
        toolCount: openaiTools.length,
        messageCount: openaiMessages.length
      });
      
      logger.debug('OpenAI request details', {
        messages: openaiMessages.map(m => ({
          role: m.role,
          contentLength: m.content?.length || 0,
          content: m.content?.substring(0, 100) + (m.content?.length > 100 ? '...' : '')
        })),
        tools: openaiTools.map(t => t.function.name)
      });
      
      const chatCompletion = await this.client.chat.completions.create({
        model: options.user === 'debug' ? 'gpt-3.5-turbo' : this.defaultModel,
        messages: openaiMessages,
        tools: openaiTools,
        tool_choice: 'auto',
        max_tokens: options.maxTokens,
        temperature: options.temperature || 0.7,
        top_p: options.topP || 1,
        frequency_penalty: options.frequencyPenalty || 0,
        presence_penalty: options.presencePenalty || 0,
        stop: options.stop,
        user: options.user
      });
      
      const response = chatCompletion.choices[0]?.message;
      
      // Parse tool calls if any
      const toolCalls = response.tool_calls?.map(tc => ({
        id: tc.id,
        name: tc.function.name,
        arguments: JSON.parse(tc.function.arguments)
      })) || [];
      
      logger.info('OpenAI API response received', {
        hasContent: !!response.content,
        contentLength: response.content?.length || 0,
        toolCallCount: toolCalls.length
      });
      
      if (toolCalls.length > 0) {
        logger.info('Tool calls in response', {
          tools: toolCalls.map(tc => tc.name)
        });
      }
      
      return {
        completion: response.content,
        toolCalls
      };
    } catch (error) {
      logger.error('Error requesting tool-based completion from OpenAI:', error);
      throw new Error(`OpenAI tool request failed: ${error.message}`);
    }
  }
}