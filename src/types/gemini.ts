export interface FileSearchStore {
  name: string;
  displayName?: string;
  createTime?: string;
}

export interface FileSearchDocument {
  name: string;
  displayName?: string;
  createTime?: string;
  state?: 'STATE_UNSPECIFIED' | 'PROCESSING' | 'FAILED' | 'SUCCEEDED';
  error?: {
    code: number;
    message: string;
  };
}

export interface UploadOperation {
  name: string;
  done: boolean;
  error?: {
    code: number;
    message: string;
  };
  response?: FileSearchDocument;
}

export interface GenerateContentResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
    groundingMetadata?: {
      searchEntryPoint?: {
        renderedContent?: string;
      };
      groundingChunks?: Array<{
        web?: {
          uri?: string;
          title?: string;
        };
      }>;
    };
  }>;
  error?: {
    code: number;
    message: string;
  };
}

export type ErrorType = 
  | 'NETWORK_ERROR'
  | 'AUTH_ERROR'
  | 'RATE_LIMIT_ERROR'
  | 'VALIDATION_ERROR'
  | 'SERVER_ERROR'
  | 'TIMEOUT_ERROR'
  | 'PARSE_ERROR'
  | 'FILE_ERROR'
  | 'UNKNOWN_ERROR';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  citations?: {
    url: string;
    title?: string;
  }[];
}
