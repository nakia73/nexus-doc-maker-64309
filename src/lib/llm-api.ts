import { LLMConfig, Citation } from '@/types/llm';
import { GeminiApiError } from './error-handler';
import { chatWithGemini } from './gemini-api';

const REQUEST_TIMEOUT = 60000;

async function fetchWithTimeout(url: string, options: RequestInit, timeout: number = REQUEST_TIMEOUT): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new GeminiApiError(
        'リクエストがタイムアウトしました',
        undefined,
        'TIMEOUT_ERROR'
      );
    }
    throw error;
  }
}

async function chatWithOpenAI(
  config: LLMConfig,
  message: string,
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>,
): Promise<{ content: string; citations?: Citation[] }> {
  try {
    const messages = [
      ...(conversationHistory?.map(msg => ({
        role: msg.role,
        content: msg.content
      })) || []),
      { role: 'user' as const, content: message }
    ];

    const tools = config.webSearch?.enabled 
      ? [{ type: "web_search_preview" }] 
      : undefined;

    const response = await fetchWithTimeout('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: config.model,
        messages,
        tools,
      }),
    }, REQUEST_TIMEOUT);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: { message: 'Unknown error' } }));
      const errorType = response.status === 401 ? 'AUTH_ERROR' : 
                       response.status === 429 ? 'RATE_LIMIT_ERROR' : 'SERVER_ERROR';
      throw new GeminiApiError(
        errorData.error?.message || `OpenAI API error: ${response.status}`,
        response.status,
        errorType
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    
    const citations: Citation[] = [];
    if (data.choices?.[0]?.message?.tool_calls) {
      data.choices[0].message.tool_calls.forEach((tool: any) => {
        if (tool.type === 'web_search_preview' && tool.citations) {
          tool.citations.forEach((c: any) => {
            citations.push({
              url: c.url,
              title: c.title,
              snippet: c.snippet,
            });
          });
        }
      });
    }

    return {
      content,
      citations: citations.length > 0 ? citations : undefined,
    };
  } catch (error) {
    if (error instanceof GeminiApiError) {
      throw error;
    }
    throw new GeminiApiError(
      error instanceof Error ? error.message : 'Unknown error',
      undefined,
      'UNKNOWN_ERROR'
    );
  }
}

async function chatWithClaude(
  config: LLMConfig,
  message: string,
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>,
): Promise<{ content: string; citations?: Citation[] }> {
  try {
    const messages = [
      ...(conversationHistory?.map(msg => ({
        role: msg.role,
        content: msg.content
      })) || []),
      { role: 'user' as const, content: message }
    ];

    const tools = config.webSearch?.enabled 
      ? [{
          type: "computer_20241022",
          name: "web_search",
          max_uses: config.webSearch.maxUses || 5,
          ...(config.webSearch.domains && { 
            allowed_domains: config.webSearch.domains 
          })
        }] 
      : undefined;

    const response = await fetchWithTimeout('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': config.apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: config.model,
        max_tokens: 4096,
        tools,
        messages,
      }),
    }, REQUEST_TIMEOUT);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: { message: 'Unknown error' } }));
      const errorType = response.status === 401 ? 'AUTH_ERROR' : 
                       response.status === 429 ? 'RATE_LIMIT_ERROR' : 'SERVER_ERROR';
      throw new GeminiApiError(
        errorData.error?.message || `Claude API error: ${response.status}`,
        response.status,
        errorType
      );
    }

    const data = await response.json();
    
    const citations: Citation[] = [];
    let content = '';
    
    if (data.content) {
      data.content.forEach((block: any) => {
        if (block.type === 'text') {
          content += block.text;
        } else if (block.type === 'tool_use' && block.name === 'web_search') {
          if (block.citations) {
            block.citations.forEach((c: any) => {
              citations.push({
                url: c.url,
                title: c.title,
                snippet: c.snippet,
              });
            });
          }
        }
      });
    }

    return {
      content,
      citations: citations.length > 0 ? citations : undefined,
    };
  } catch (error) {
    if (error instanceof GeminiApiError) {
      throw error;
    }
    throw new GeminiApiError(
      error instanceof Error ? error.message : 'Unknown error',
      undefined,
      'UNKNOWN_ERROR'
    );
  }
}

async function chatWithGrok(
  config: LLMConfig,
  message: string,
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>,
): Promise<{ content: string; citations?: Citation[] }> {
  try {
    const messages = [
      ...(conversationHistory?.map(msg => ({
        role: msg.role,
        content: msg.content
      })) || []),
      { role: 'user' as const, content: message }
    ];

    const tools = config.webSearch?.enabled 
      ? [{ type: "web_search" }] 
      : undefined;

    const response = await fetchWithTimeout('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: config.model,
        messages,
        tools,
      }),
    }, REQUEST_TIMEOUT);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: { message: 'Unknown error' } }));
      const errorType = response.status === 401 ? 'AUTH_ERROR' : 
                       response.status === 429 ? 'RATE_LIMIT_ERROR' : 'SERVER_ERROR';
      throw new GeminiApiError(
        errorData.error?.message || `Grok API error: ${response.status}`,
        response.status,
        errorType
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    
    const citations: Citation[] = [];
    if (data.choices?.[0]?.message?.tool_calls) {
      data.choices[0].message.tool_calls.forEach((tool: any) => {
        if (tool.function?.name === 'web_search' && tool.citations) {
          tool.citations.forEach((c: any) => {
            citations.push({
              url: c.url,
              title: c.title,
            });
          });
        }
      });
    }

    return {
      content,
      citations: citations.length > 0 ? citations : undefined,
    };
  } catch (error) {
    if (error instanceof GeminiApiError) {
      throw error;
    }
    throw new GeminiApiError(
      error instanceof Error ? error.message : 'Unknown error',
      undefined,
      'UNKNOWN_ERROR'
    );
  }
}

export async function chatWithLLM(
  config: LLMConfig,
  message: string,
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>,
): Promise<{ content: string; citations?: Citation[] }> {
  if (!config.apiKey) {
    throw new GeminiApiError(
      `${config.provider} APIキーが設定されていません`,
      undefined,
      'VALIDATION_ERROR'
    );
  }

  switch (config.provider) {
    case 'gemini':
      return chatWithGemini(message, conversationHistory, config.webSearch?.enabled);
    case 'openai':
      return chatWithOpenAI(config, message, conversationHistory);
    case 'claude':
      return chatWithClaude(config, message, conversationHistory);
    case 'grok':
      return chatWithGrok(config, message, conversationHistory);
    default:
      throw new GeminiApiError(
        `未対応のプロバイダー: ${config.provider}`,
        undefined,
        'VALIDATION_ERROR'
      );
  }
}
