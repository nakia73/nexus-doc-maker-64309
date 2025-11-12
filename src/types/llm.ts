export type LLMProvider = 'gemini' | 'openai' | 'claude' | 'grok';

export interface ModelOption {
  id: string;
  name: string;
  provider: LLMProvider;
  supportsWebSearch: boolean;
}

export interface WebSearchConfig {
  enabled: boolean;
  maxUses?: number;
  domains?: string[];
}

export interface LLMConfig {
  provider: LLMProvider;
  model: string;
  apiKey: string;
  webSearch?: WebSearchConfig;
}

export interface Citation {
  url: string;
  title?: string;
  snippet?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  citations?: Citation[];
}

export const MODEL_OPTIONS: ModelOption[] = [
  // Gemini
  { id: 'gemini-2.0-flash-exp', name: 'Gemini 2.0 Flash (Experimental)', provider: 'gemini', supportsWebSearch: true },
  { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', provider: 'gemini', supportsWebSearch: true },
  { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', provider: 'gemini', supportsWebSearch: true },
  
  // OpenAI
  { id: 'gpt-4o', name: 'GPT-4o', provider: 'openai', supportsWebSearch: true },
  { id: 'gpt-4o-mini', name: 'GPT-4o Mini', provider: 'openai', supportsWebSearch: true },
  { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', provider: 'openai', supportsWebSearch: true },
  
  // Claude
  { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet', provider: 'claude', supportsWebSearch: true },
  { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku', provider: 'claude', supportsWebSearch: true },
  
  // Grok
  { id: 'grok-beta', name: 'Grok Beta', provider: 'grok', supportsWebSearch: true },
  { id: 'grok-2-latest', name: 'Grok 2', provider: 'grok', supportsWebSearch: true },
];

export const PROVIDER_NAMES: Record<LLMProvider, string> = {
  gemini: 'Gemini',
  openai: 'OpenAI',
  claude: 'Claude',
  grok: 'Grok',
};
