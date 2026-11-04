import { OpenAI } from 'openai';
import { Groq } from 'groq-sdk';
import { Anthropic } from '@anthropic-ai/sdk';
import { getSupabaseServer } from '../../lib/supabase-server.js';

/**
 * Wootech AI Router
 * Handles resilient LLM requests with fallback capability.
 * Records telemetry (latency, tokens, cost) and routes to available providers.
 */
class WootechLLMRouter {
  constructor() {
    this.fallbackChain = ['openai', 'groq', 'anthropic'];
  }

  /**
   * Retrieves encrypted credentials for a tenant and initializes the provider client.
   * Note: In a real implementation, decrypt the API keys using a master KMS key.
   */
  async getProviderClient(tenantId, providerName) {
    const supabase = getSupabaseServer();
    const { data: creds, error } = await supabase
      .from('provider_credentials')
      .select('api_key_encrypted, config_json')
      .eq('organization_id', tenantId)
      .eq('service', providerName)
      .eq('is_active', true)
      .single();

    if (error || !creds) {
      throw new Error(`Credentials not found or inactive for provider: ${providerName}`);
    }

    const apiKey = creds.api_key_encrypted; // Assume decrypted here in production

    switch (providerName) {
      case 'openai':
        return new OpenAI({ apiKey });
      case 'groq':
        return new Groq({ apiKey });
      case 'anthropic':
        return new Anthropic({ apiKey });
      default:
        throw new Error(`Unsupported provider: ${providerName}`);
    }
  }

  /**
   * Routes a chat completion request with fallback mechanism.
   * @param {string} tenantId 
   * @param {string} preferredProvider 
   * @param {string} model 
   * @param {array} messages 
   * @param {object} options 
   */
  async routeChatCompletion(tenantId, preferredProvider, model, messages, options = {}) {
    const providersToTry = [preferredProvider, ...this.fallbackChain.filter(p => p !== preferredProvider)];
    
    let lastError = null;

    for (const provider of providersToTry) {
      console.log(`[LLMRouter] Attempting chat completion with provider: ${provider}`);
      const startTime = Date.now();
      
      try {
        const client = await this.getProviderClient(tenantId, provider);
        let result;
        
        // Execute request based on provider signature
        if (provider === 'openai' || provider === 'groq') {
          // Both share a similar API signature
          result = await client.chat.completions.create({
            model: model, // Warning: Model mapping might be needed (e.g., gpt-4 vs llama3)
            messages,
            temperature: options.temperature || 0.7,
            tools: options.tools,
          });
        } else if (provider === 'anthropic') {
          // Anthropic SDK mapping (simplified)
          result = await client.messages.create({
            model: model,
            messages,
            max_tokens: 1024,
          });
        }

        const latency = Date.now() - startTime;
        console.log(`[LLMRouter] Success via ${provider} (Latency: ${latency}ms)`);
        
        // Return structured result + telemetry
        return {
          response: result,
          telemetry: {
            provider,
            latency_ms: latency,
            tokens_used: result.usage?.total_tokens || 0,
            cost_estimated: 0, // Implement cost logic
            fallback_used: provider !== preferredProvider
          }
        };

      } catch (err) {
        console.warn(`[LLMRouter] Provider ${provider} failed:`, err.message);
        lastError = err;
        // Continue loop to try next fallback
      }
    }

    // If we exhaust the chain
    throw new Error(`All LLM providers failed. Last error: ${lastError.message}`);
  }
}

export const llmRouter = new WootechLLMRouter();
