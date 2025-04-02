import { LLMConfig, LLMProvider, LLMService } from './types';
import { OpenAIService } from './openai.service';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Factory for creating LLM service instances
 */
export class LLMFactory {
  private static instances: Map<string, LLMService> = new Map();
  
  /**
   * Get or create an LLM service instance
   */
  static getLLMService(config?: Partial<LLMConfig>): LLMService {
    const provider = config?.provider || process.env.LLM_PROVIDER as LLMProvider || 'openai';
    const model = config?.model || process.env.LLM_MODEL || 'gpt-4o';
    
    const key = `${provider}:${model}`;
    
    if (this.instances.has(key)) {
      return this.instances.get(key)!;
    }
    
    let service: LLMService;
    
    switch (provider) {
      case 'openai':
        const apiKey = config?.apiKey || process.env.OPENAI_API_KEY;
        if (!apiKey) {
          throw new Error('OpenAI API key not provided and OPENAI_API_KEY environment variable not set');
        }
        service = new OpenAIService(apiKey, model);
        break;
      case 'anthropic':
        throw new Error('Anthropic LLM service not implemented yet');
      case 'google':
        throw new Error('Google LLM service not implemented yet');
      default:
        throw new Error(`Unsupported LLM provider: ${provider}`);
    }
    
    this.instances.set(key, service);
    return service;
  }
}