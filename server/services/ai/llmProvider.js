/**
 * LLM Provider Abstraction Layer
 * 
 * Supports multiple LLM providers with unified interface:
 * - OpenAI (GPT-4o, GPT-4o-mini, GPT-3.5-turbo)
 * - Google Gemini (1.5 Pro, 1.5 Flash, 2.0)
 * - Anthropic (Claude 3.5 Sonnet, 3.5 Haiku, 3 Opus)
 * - Groq (Llama 3.1, Mixtral, Gemma)
 * - OpenRouter (unified access to 100+ models)
 * - Local (Ollama, LM Studio)
 * 
 * Features:
 * - Model routing by task type
 * - Token budget management
 * - Cost tracking
 * - Fallback chains
 * - Streaming support
 * - Structured output (JSON mode)
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';
import { Anthropic } from '@anthropic-ai/sdk';
import Groq from 'groq-sdk';
import { getSupabaseServer } from '../../lib/supabase-server.js';
import { logger } from '../../utils/logger.js';

// ============================================================
// TYPES & INTERFACES
// ============================================================

/**
 * @typedef {Object} LLMMessage
 * @property {'system'|'user'|'assistant'|'tool'} role
 * @property {string} content
 * @property {string} [name] - for tool messages
 * @property {string} [tool_call_id] - for tool responses
 * @property {Object} [tool_calls] - for assistant tool calls
 */

/**
 * @typedef {Object} LLMResponse
 * @property {string} content
 * @property {Object} [toolCalls]
 * @property {Object} usage - { promptTokens, completionTokens, totalTokens }
 * @property {string} model
 * @property {string} provider
 * @property {number} latencyMs
 */

/**
 * @typedef {Object} LLMChunk
 * @property {string} content
 * @property {boolean} done
 * @property {Object} [toolCalls]
 */

/**
 * @typedef {Object} ModelConfig
 * @property {string} provider
 * @property {string} model
 * @property {number} [temperature]
 * @property {number} [maxTokens]
 * @property {number} [topP]
 * @property {boolean} [jsonMode]
 * @property {Object} [responseSchema] - for structured output
 * @property {Object[]} [tools] - function declarations
 * @property {string} [toolChoice] - 'auto'|'none'|'required'|{function: name}
 */

// ============================================================
// MODEL ROUTING CONFIGURATION
// ============================================================

const MODEL_ROUTING = {
  // Fast, cheap models for simple tasks
  'intent_detection': { 
    primary: { provider: 'groq', model: 'llama-3.1-8b-instant' },
    fallback: [{ provider: 'gemini', model: 'gemini-1.5-flash' }]
  },
  
  // Main conversation - balanced quality/speed
  'conversation': { 
    primary: { provider: 'gemini', model: 'gemini-1.5-pro' },
    fallback: [
      { provider: 'openai', model: 'gpt-4o' },
      { provider: 'anthropic', model: 'claude-3-5-sonnet-20241022' }
    ]
  },
  
  // Cheap summarization
  'summarization': { 
    primary: { provider: 'openai', model: 'gpt-4o-mini' },
    fallback: [{ provider: 'groq', model: 'llama-3.1-8b-instant' }]
  },
  
  // Complex reasoning - best models
  'agent_architect': { 
    primary: { provider: 'anthropic', model: 'claude-3-5-sonnet-20241022' },
    fallback: [
      { provider: 'openai', model: 'gpt-4o' },
      { provider: 'gemini', model: 'gemini-1.5-pro' }
    ]
  },
  
  // Adversarial testing - need strong reasoning
  'red_team': { 
    primary: { provider: 'openai', model: 'gpt-4o' },
    fallback: [
      { provider: 'anthropic', model: 'claude-3-5-sonnet-20241022' },
      { provider: 'gemini', model: 'gemini-1.5-pro' }
    ]
  },
  
  // Embeddings
  'embeddings': { 
    primary: { provider: 'openai', model: 'text-embedding-3-small' },
    fallback: [{ provider: 'gemini', model: 'text-embedding-004' }]
  }
};

// Cost per 1M tokens (approximate, update regularly)
const MODEL_COSTS = {
  'openai': {
    'gpt-4o': { input: 5.00, output: 15.00 },
    'gpt-4o-mini': { input: 0.15, output: 0.60 },
    'gpt-4-turbo': { input: 10.00, output: 30.00 },
    'gpt-3.5-turbo': { input: 0.50, output: 1.50 },
    'text-embedding-3-small': { input: 0.02, output: 0 },
    'text-embedding-3-large': { input: 0.13, output: 0 }
  },
  'anthropic': {
    'claude-3-5-sonnet-20241022': { input: 3.00, output: 15.00 },
    'claude-3-5-haiku-20241022': { input: 0.25, output: 1.25 },
    'claude-3-opus-20240229': { input: 15.00, output: 75.00 }
  },
  'gemini': {
    'gemini-1.5-pro': { input: 3.50, output: 10.50 },
    'gemini-1.5-flash': { input: 0.075, output: 0.30 },
    'gemini-2.0-flash-exp': { input: 0.10, output: 0.40 },
    'text-embedding-004': { input: 0.02, output: 0 }
  },
  'groq': {
    'llama-3.1-8b-instant': { input: 0.05, output: 0.08 },
    'llama-3.1-70b-versatile': { input: 0.59, output: 0.79 },
    'mixtral-8x7b-32768': { input: 0.24, output: 0.24 },
    'gemma2-9b-it': { input: 0.07, output: 0.07 }
  }
};

// ============================================================
// PROVIDER IMPLEMENTATIONS
// ============================================================

class BaseProvider {
  constructor(config) {
    this.config = config;
    this.name = config.name;
  }
  
  async chat(messages, config) { throw new Error('Not implemented'); }
  async stream(messages, config) { throw new Error('Not implemented'); }
  async embeddings(texts, config) { throw new Error('Not implemented'); }
  estimateCost(usage, model) { return 0; }
}

class OpenAIProvider extends BaseProvider {
  constructor(config) {
    super({ ...config, name: 'openai' });
    this.client = new OpenAI({ apiKey: config.apiKey });
  }
  
  async chat(messages, config) {
    const startTime = Date.now();
    
    const openAIMessages = messages.map(m => ({
      role: m.role === 'tool' ? 'tool' : m.role,
      content: m.content,
      name: m.name,
      tool_call_id: m.tool_call_id,
      tool_calls: m.tool_calls
    }));
    
    const requestConfig = {
      model: config.model,
      messages: openAIMessages,
      temperature: config.temperature ?? 0.7,
      max_tokens: config.maxTokens,
      top_p: config.topP,
      response_format: config.jsonMode ? { type: 'json_object' } : undefined,
      tools: config.tools,
      tool_choice: config.toolChoice
    };
    
    const completion = await this.client.chat.completions.create(requestConfig);
    
    const choice = completion.choices[0];
    const usage = completion.usage;
    
    return {
      content: choice.message.content || '',
      toolCalls: choice.message.tool_calls,
      usage: {
        promptTokens: usage.prompt_tokens,
        completionTokens: usage.completion_tokens,
        totalTokens: usage.total_tokens
      },
      model: completion.model,
      provider: 'openai',
      latencyMs: Date.now() - startTime
    };
  }
  
  async *stream(messages, config) {
    const openAIMessages = messages.map(m => ({
      role: m.role === 'tool' ? 'tool' : m.role,
      content: m.content,
      name: m.name,
      tool_call_id: m.tool_call_id,
      tool_calls: m.tool_calls
    }));
    
    const stream = await this.client.chat.completions.create({
      model: config.model,
      messages: openAIMessages,
      temperature: config.temperature ?? 0.7,
      max_tokens: config.maxTokens,
      top_p: config.topP,
      stream: true,
      tools: config.tools,
      tool_choice: config.toolChoice
    });
    
    let accumulatedContent = '';
    let toolCalls = null;
    
    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta;
      if (delta?.content) {
        accumulatedContent += delta.content;
        yield { content: delta.content, done: false };
      }
      if (delta?.tool_calls) {
        toolCalls = delta.tool_calls;
      }
    }
    
    yield { content: accumulatedContent, done: true, toolCalls };
  }
  
  async embeddings(texts, config) {
    const response = await this.client.embeddings.create({
      model: config.model || 'text-embedding-3-small',
      input: texts
    });
    
    return response.data.map(d => d.embedding);
  }
  
  estimateCost(usage, model) {
    const costs = MODEL_COSTS.openai[model] || { input: 0, output: 0 };
    return (usage.promptTokens * costs.input + usage.completionTokens * costs.output) / 1_000_000;
  }
}

class GeminiProvider extends BaseProvider {
  constructor(config) {
    super({ ...config, name: 'gemini' });
    this.genAI = new GoogleGenerativeAI(config.apiKey);
  }
  
  async chat(messages, config) {
    const startTime = Date.now();
    
    // Convert messages to Gemini format
    const systemInstruction = messages.find(m => m.role === 'system')?.content;
    const userMessages = messages.filter(m => m.role !== 'system');
    
    const model = this.genAI.getGenerativeModel({
      model: config.model,
      generationConfig: {
        temperature: config.temperature ?? 0.7,
        maxOutputTokens: config.maxTokens,
        topP: config.topP,
        responseMimeType: config.jsonMode ? 'application/json' : 'text/plain'
      },
      tools: config.tools ? [{ functionDeclarations: config.tools }] : undefined,
      systemInstruction: systemInstruction ? { parts: [{ text: systemInstruction }] } : undefined
    });
    
    const chat = model.startChat({
      history: userMessages.slice(0, -1).map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }]
      })),
      systemInstruction: systemInstruction ? { parts: [{ text: systemInstruction }] } : undefined
    });
    
    const lastMessage = userMessages[userMessages.length - 1];
    const result = await chat.sendMessage(lastMessage.content);
    
    const response = result.response;
    const text = response.text();
    const functionCalls = response.functionCalls();
    
    // Estimate usage (Gemini doesn't return exact tokens in all cases)
    const promptTokens = this.estimateTokens(messages.map(m => m.content).join(' '));
    const completionTokens = this.estimateTokens(text);
    
    return {
      content: text,
      toolCalls: functionCalls?.map(fc => ({
        id: fc.name,
        type: 'function',
        function: { name: fc.name, arguments: JSON.stringify(fc.args) }
      })),
      usage: { promptTokens, completionTokens, totalTokens: promptTokens + completionTokens },
      model: config.model,
      provider: 'gemini',
      latencyMs: Date.now() - startTime
    };
  }
  
  async *stream(messages, config) {
    // Simplified streaming - in production use proper streaming
    const result = await this.chat(messages, config);
    const words = result.content.split(' ');
    
    for (let i = 0; i < words.length; i++) {
      yield { content: words[i] + (i < words.length - 1 ? ' ' : ''), done: i === words.length - 1 };
    }
  }
  
  async embeddings(texts, config) {
    const model = this.genAI.getGenerativeModel({ 
      model: config.model || 'text-embedding-004' 
    });
    
    const embeddings = [];
    for (const text of texts) {
      const result = await model.embedContent(text);
      embeddings.push(result.embedding.values);
    }
    
    return embeddings;
  }
  
  estimateTokens(text) {
    // Rough estimation: ~1 token per 4 chars for English, ~1 per 3 for Portuguese
    return Math.ceil(text.length / 3.5);
  }
  
  estimateCost(usage, model) {
    const costs = MODEL_COSTS.gemini[model] || { input: 0, output: 0 };
    return (usage.promptTokens * costs.input + usage.completionTokens * costs.output) / 1_000_000;
  }
}

class AnthropicProvider extends BaseProvider {
  constructor(config) {
    super({ ...config, name: 'anthropic' });
    this.client = new Anthropic({ apiKey: config.apiKey });
  }
  
  async chat(messages, config) {
    const startTime = Date.now();
    
    const systemMessage = messages.find(m => m.role === 'system');
    const userMessages = messages.filter(m => m.role !== 'system');
    
    const requestConfig = {
      model: config.model,
      max_tokens: config.maxTokens || 4096,
      temperature: config.temperature ?? 0.7,
      top_p: config.topP,
      system: systemMessage?.content,
      messages: userMessages.map(m => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.content
      })),
      tools: config.tools?.map(t => ({
        name: t.name,
        description: t.description,
        input_schema: t.parameters
      })),
      tool_choice: config.toolChoice === 'auto' ? { type: 'auto' } : 
                   config.toolChoice === 'none' ? { type: 'none' } :
                   config.toolChoice === 'required' ? { type: 'any' } :
                   config.toolChoice?.function ? { type: 'tool', name: config.toolChoice.function.name } :
                   { type: 'auto' }
    };
    
    const response = await this.client.messages.create(requestConfig);
    
    const content = response.content.find(c => c.type === 'text')?.text || '';
    const toolCalls = response.content
      .filter(c => c.type === 'tool_use')
      .map(c => ({
        id: c.id,
        type: 'function',
        function: { name: c.name, arguments: JSON.stringify(c.input) }
      }));
    
    const usage = response.usage;
    
    return {
      content,
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      usage: {
        promptTokens: usage.input_tokens,
        completionTokens: usage.output_tokens,
        totalTokens: usage.input_tokens + usage.output_tokens
      },
      model: response.model,
      provider: 'anthropic',
      latencyMs: Date.now() - startTime
    };
  }
  
  async *stream(messages, config) {
    // Simplified streaming
    const result = await this.chat(messages, config);
    const words = result.content.split(' ');
    
    for (let i = 0; i < words.length; i++) {
      yield { content: words[i] + (i < words.length - 1 ? ' ' : ''), done: i === words.length - 1 };
    }
  }
  
  estimateCost(usage, model) {
    const costs = MODEL_COSTS.anthropic[model] || { input: 0, output: 0 };
    return (usage.promptTokens * costs.input + usage.completionTokens * costs.output) / 1_000_000;
  }
}

class GroqProvider extends BaseProvider {
  constructor(config) {
    super({ ...config, name: 'groq' });
    this.client = new Groq({ apiKey: config.apiKey });
  }
  
  async chat(messages, config) {
    const startTime = Date.now();
    
    const openAIMessages = messages.map(m => ({
      role: m.role === 'tool' ? 'tool' : m.role,
      content: m.content,
      name: m.name,
      tool_call_id: m.tool_call_id,
      tool_calls: m.tool_calls
    }));
    
    const completion = await this.client.chat.completions.create({
      model: config.model,
      messages: openAIMessages,
      temperature: config.temperature ?? 0.7,
      max_tokens: config.maxTokens,
      top_p: config.topP,
      response_format: config.jsonMode ? { type: 'json_object' } : undefined,
      tools: config.tools,
      tool_choice: config.toolChoice
    });
    
    const choice = completion.choices[0];
    const usage = completion.usage;
    
    return {
      content: choice.message.content || '',
      toolCalls: choice.message.tool_calls,
      usage: {
        promptTokens: usage.prompt_tokens,
        completionTokens: usage.completion_tokens,
        totalTokens: usage.total_tokens
      },
      model: completion.model,
      provider: 'groq',
      latencyMs: Date.now() - startTime
    };
  }
  
  async *stream(messages, config) {
    // Simplified streaming
    const result = await this.chat(messages, config);
    const words = result.content.split(' ');
    
    for (let i = 0; i < words.length; i++) {
      yield { content: words[i] + (i < words.length - 1 ? ' ' : ''), done: i === words.length - 1 };
    }
  }
  
  estimateCost(usage, model) {
    const costs = MODEL_COSTS.groq[model] || { input: 0, output: 0 };
    return (usage.promptTokens * costs.input + usage.completionTokens * costs.output) / 1_000_000;
  }
}

class OpenRouterProvider extends BaseProvider {
  constructor(config) {
    super({ ...config, name: 'openrouter' });
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://openrouter.ai/api/v1';
  }
  
  async chat(messages, config) {
    const startTime = Date.now();
    
    const openAIMessages = messages.map(m => ({
      role: m.role === 'tool' ? 'tool' : m.role,
      content: m.content,
      name: m.name,
      tool_call_id: m.tool_call_id,
      tool_calls: m.tool_calls
    }));
    
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
        'HTTP-Referer': 'https://wootech.imob',
        'X-Title': 'WooTech Imob AI'
      },
      body: JSON.stringify({
        model: config.model,
        messages: openAIMessages,
        temperature: config.temperature ?? 0.7,
        max_tokens: config.maxTokens,
        top_p: config.topP,
        response_format: config.jsonMode ? { type: 'json_object' } : undefined,
        tools: config.tools,
        tool_choice: config.toolChoice
      })
    });
    
    if (!response.ok) {
      throw new Error(`OpenRouter API error: ${response.status} ${await response.text()}`);
    }
    
    const data = await response.json();
    const choice = data.choices[0];
    const usage = data.usage;
    
    return {
      content: choice.message.content || '',
      toolCalls: choice.message.tool_calls,
      usage: {
        promptTokens: usage.prompt_tokens,
        completionTokens: usage.completion_tokens,
        totalTokens: usage.total_tokens
      },
      model: data.model,
      provider: 'openrouter',
      latencyMs: Date.now() - startTime
    };
  }
  
  async *stream(messages, config) {
    // Simplified
    const result = await this.chat(messages, config);
    const words = result.content.split(' ');
    
    for (let i = 0; i < words.length; i++) {
      yield { content: words[i] + (i < words.length - 1 ? ' ' : ''), done: i === words.length - 1 };
    }
  }
  
  estimateCost(usage, model) {
    // OpenRouter costs vary by model - use approximation
    return (usage.totalTokens * 0.001) / 1_000_000; // Rough estimate
  }
}

// ============================================================
// LLM ORCHESTRATOR - Main Interface
// ============================================================

export class LLMOrchestrator {
  constructor() {
    this.providers = new Map();
    this.initialized = false;
    this.costTracker = new CostTracker();
  }
  
  async initialize() {
    if (this.initialized) return;
    
    const supabase = getSupabaseServer();
    let settings = null;
    try {
      const res = await supabase
        .from('saas_settings')
        .select('global_openai_key, global_anthropic_key, global_gemini_key, global_groq_key, global_openrouter_key')
        .single();
      settings = res.data;
    } catch (err) {
      // ignore
    }
    
    const keys = {
      openai: settings?.global_openai_key || process.env.OPENAI_API_KEY,
      anthropic: settings?.global_anthropic_key || process.env.ANTHROPIC_API_KEY,
      gemini: settings?.global_gemini_key || process.env.GEMINI_API_KEY,
      groq: settings?.global_groq_key || process.env.GROQ_API_KEY,
      openrouter: settings?.global_openrouter_key || process.env.OPENROUTER_API_KEY
    };
    
    if (keys.openai) this.providers.set('openai', new OpenAIProvider({ apiKey: keys.openai }));
    if (keys.anthropic) this.providers.set('anthropic', new AnthropicProvider({ apiKey: keys.anthropic }));
    if (keys.gemini) this.providers.set('gemini', new GeminiProvider({ apiKey: keys.gemini }));
    if (keys.groq) this.providers.set('groq', new GroqProvider({ apiKey: keys.groq }));
    if (keys.openrouter) this.providers.set('openrouter', new OpenRouterProvider({ apiKey: keys.openrouter }));
    
    this.initialized = true;
    logger.info('[LLMOrchestrator] Initialized', { providers: Array.from(this.providers.keys()) });
  }
  
  /**
   * Get provider for a task type (with fallback chain)
   */
  getProviderForTask(taskType) {
    const routing = MODEL_ROUTING[taskType] || MODEL_ROUTING.conversation;
    
    // Try primary
    const primary = routing.primary;
    if (this.providers.has(primary.provider)) {
      return {
        provider: this.providers.get(primary.provider),
        model: primary.model,
        taskType,
        isFallback: false
      };
    }
    
    // Try fallbacks
    for (const fallback of routing.fallback || []) {
      if (this.providers.has(fallback.provider)) {
        return {
          provider: this.providers.get(fallback.provider),
          model: fallback.model,
          taskType,
          isFallback: true
        };
      }
    }
    
    // Last resort - any available provider
    const available = this.providers.keys().next().value;
    if (available) {
      return {
        provider: this.providers.get(available),
        model: available === 'groq' ? 'llama-3.1-8b-instant' : 
               available === 'gemini' ? 'gemini-1.5-flash' :
               available === 'openai' ? 'gpt-4o-mini' :
               available === 'anthropic' ? 'claude-3-5-haiku-20241022' :
               'gpt-4o-mini',
        taskType,
        isFallback: true
      };
    }
    
    return null;
  }
  
  /**
   * Main chat method with automatic routing
   */
  async chat(messages, taskType = 'conversation', config = {}) {
    await this.initialize();
    
    const result = this.getProviderForTask(taskType);
    
    if (!result) {
      throw new Error('Nenhum provedor LLM configurado. Configure chaves de API (Gemini, OpenAI, Anthropic, Groq ou OpenRouter) no painel de configurações.');
    }
    
    const { provider, model, isFallback } = result;
    const finalConfig = { ...config, model };
    
    logger.info('[LLMOrchestrator] Chat request', { 
      taskType, 
      provider: provider.name, 
      model, 
      isFallback,
      messagesCount: messages.length 
    });
    
    try {
      const response = await provider.chat(messages, finalConfig);
      
      // Track cost
      const cost = provider.estimateCost(response.usage, model);
      await this.costTracker.record({
        taskType,
        provider: provider.name,
        model,
        usage: response.usage,
        cost,
        isFallback
      });
      
      return response;
    } catch (error) {
      logger.error('[LLMOrchestrator] Chat error', { 
        error: error.message, 
        taskType, 
        provider: provider.name 
      });
      
      // Try fallback if not already using fallback
      if (!isFallback) {
        const routing = MODEL_ROUTING[taskType] || MODEL_ROUTING.conversation;
        for (const fallback of routing.fallback || []) {
          if (this.providers.has(fallback.provider)) {
            logger.info('[LLMOrchestrator] Trying fallback', { 
              fallback: fallback.provider, 
              model: fallback.model 
            });
            
            try {
              const fallbackProvider = this.providers.get(fallback.provider);
              const response = await fallbackProvider.chat(messages, { ...finalConfig, model: fallback.model });
              
              const cost = fallbackProvider.estimateCost(response.usage, fallback.model);
              await this.costTracker.record({
                taskType,
                provider: fallbackProvider.name,
                model: fallback.model,
                usage: response.usage,
                cost,
                isFallback: true,
                fallbackFrom: provider.name
              });
              
              return response;
            } catch (fallbackError) {
              logger.error('[LLMOrchestrator] Fallback also failed', { 
                error: fallbackError.message 
              });
            }
          }
        }
      }
      
      throw error;
    }
  }
  
  /**
   * Streaming chat
   */
  async *stream(messages, taskType = 'conversation', config = {}) {
    await this.initialize();
    
    const { provider, model } = this.getProviderForTask(taskType);
    const finalConfig = { ...config, model };
    
    try {
      for await (const chunk of provider.stream(messages, finalConfig)) {
        yield chunk;
      }
    } catch (error) {
      logger.error('[LLMOrchestrator] Stream error', { error: error.message });
      throw error;
    }
  }
  
  /**
   * Get embeddings
   */
  async embeddings(texts, taskType = 'embeddings', config = {}) {
    await this.initialize();
    
    const { provider, model } = this.getProviderForTask(taskType);
    const finalConfig = { ...config, model };
    
    return await provider.embeddings(texts, finalConfig);
  }
  
  /**
   * Get cost tracking report
   */
  async getCostReport(organizationId, period = '24h') {
    return await this.costTracker.getReport(organizationId, period);
  }
  
  /**
   * Check available providers
   */
  getAvailableProviders() {
    return Array.from(this.providers.keys());
  }
}

// ============================================================
// COST TRACKER
// ============================================================

class CostTracker {
  constructor() {
    this.buffer = [];
    this.flushInterval = 30000; // 30 seconds
    this.startFlushTimer();
  }
  
  startFlushTimer() {
    const timer = setInterval(() => this.flush(), this.flushInterval);
    timer.unref?.();
  }
  
  async record(entry) {
    this.buffer.push({
      ...entry,
      timestamp: new Date().toISOString()
    });
    
    // Flush if buffer large
    if (this.buffer.length >= 100) {
      await this.flush();
    }
  }
  
  async flush() {
    if (this.buffer.length === 0) return;
    
    const entries = this.buffer.splice(0, this.buffer.length);
    
    try {
      const supabase = getSupabaseServer();
      await supabase.from('ai_llm_usage').insert(entries.map(e => ({
        organization_id: e.organizationId,
        task_type: e.taskType,
        provider: e.provider,
        model: e.model,
        prompt_tokens: e.usage.promptTokens,
        completion_tokens: e.usage.completionTokens,
        total_tokens: e.usage.totalTokens,
        cost_usd: e.cost,
        is_fallback: e.isFallback,
        fallback_from: e.fallbackFrom,
        created_at: e.timestamp
      })));
    } catch (error) {
      logger.error('[CostTracker] Failed to flush', { error: error.message });
      // Re-add to buffer for retry
      this.buffer.unshift(...entries);
    }
  }
  
  async getReport(organizationId, period) {
    const supabase = getSupabaseServer();
    
    const hours = period === '1h' ? 1 : period === '24h' ? 24 : period === '7d' ? 168 : 720;
    const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
    
    const { data } = await supabase
      .from('ai_llm_usage')
      .select('*')
      .eq('organization_id', organizationId)
      .gte('created_at', since)
      .order('created_at', { ascending: false });
    
    if (!data || data.length === 0) {
      return { totalCost: 0, totalTokens: 0, byProvider: {}, byTask: {}, byModel: {} };
    }
    
    const report = {
      totalCost: 0,
      totalTokens: 0,
      totalCalls: data.length,
      byProvider: {},
      byTask: {},
      byModel: {},
      timeline: []
    };
    
    for (const entry of data) {
      report.totalCost += entry.cost_usd || 0;
      report.totalTokens += entry.total_tokens || 0;
      
      // By provider
      if (!report.byProvider[entry.provider]) {
        report.byProvider[entry.provider] = { cost: 0, tokens: 0, calls: 0 };
      }
      report.byProvider[entry.provider].cost += entry.cost_usd || 0;
      report.byProvider[entry.provider].tokens += entry.total_tokens || 0;
      report.byProvider[entry.provider].calls++;
      
      // By task
      if (!report.byTask[entry.task_type]) {
        report.byTask[entry.task_type] = { cost: 0, tokens: 0, calls: 0 };
      }
      report.byTask[entry.task_type].cost += entry.cost_usd || 0;
      report.byTask[entry.task_type].tokens += entry.total_tokens || 0;
      report.byTask[entry.task_type].calls++;
      
      // By model
      if (!report.byModel[entry.model]) {
        report.byModel[entry.model] = { cost: 0, tokens: 0, calls: 0 };
      }
      report.byModel[entry.model].cost += entry.cost_usd || 0;
      report.byModel[entry.model].tokens += entry.total_tokens || 0;
      report.byModel[entry.model].calls++;
    }
    
    return report;
  }
}

// Singleton
let orchestratorInstance = null;

export function getLLMOrchestrator() {
  if (!orchestratorInstance) {
    orchestratorInstance = new LLMOrchestrator();
  }
  return orchestratorInstance;
}

export { MODEL_ROUTING, MODEL_COSTS };
export default LLMOrchestrator;
