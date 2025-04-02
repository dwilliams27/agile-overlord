/**
 * Common types for the LLM services
 */

export type LLMProvider = 'openai' | 'anthropic' | 'google';

export interface LLMConfig {
  provider: LLMProvider;
  model: string;
  apiKey: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
}

export interface Message {
  role: 'system' | 'user' | 'assistant' | 'function' | 'tool';
  content: string;
  name?: string;
  toolCallId?: string;
  timestamp?: Date;
  metadata?: Record<string, any>;
}

export interface CompletionOptions {
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  stop?: string[];
}

export interface ChatOptions extends CompletionOptions {
  user?: string;
}

export interface ToolParameter {
  type: string; // string, number, integer, boolean, object, array
  description: string;
  required?: boolean; // Only used internally, not sent to OpenAI
  enum?: string[] | number[];
  properties?: Record<string, ToolParameter>;
  items?: ToolParameter;
  format?: string; // For additional format hints like date-time, email, etc.
}

export interface Tool {
  name: string;
  description: string;
  parameters: Record<string, ToolParameter>;
  execute: (params: Record<string, any>) => Promise<any>;
}

export interface ToolCall {
  id?: string;
  name: string;
  arguments: Record<string, any>;
}

export interface ToolResponse {
  completion: string | null;
  toolCalls: ToolCall[];
}

export interface LLMService {
  requestCompletion(prompt: string, options?: CompletionOptions): Promise<string>;
  requestChat(messages: Message[], options?: ChatOptions): Promise<string>;
  requestWithTools(messages: Message[], tools: Tool[], options?: ChatOptions): Promise<ToolResponse>;
}