import { toast } from "sonner";
import type { ErrorType } from "@/types/gemini";

export class GeminiApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public errorType?: ErrorType,
    public originalError?: any
  ) {
    super(message);
    this.name = 'GeminiApiError';
  }
}

export const ERROR_MESSAGES: Record<ErrorType, string> = {
  NETWORK_ERROR: "ネットワーク接続に失敗しました。インターネット接続を確認してください。",
  AUTH_ERROR: "APIキーが無効です。正しいAPIキーを設定してください。",
  RATE_LIMIT_ERROR: "APIのレート制限に達しました。しばらく待ってから再試行してください。",
  VALIDATION_ERROR: "入力内容に誤りがあります。確認してください。",
  SERVER_ERROR: "サーバーエラーが発生しました。しばらくしてから再試行してください。",
  TIMEOUT_ERROR: "タイムアウトしました。もう一度お試しください。",
  PARSE_ERROR: "レスポンスの解析に失敗しました。",
  FILE_ERROR: "ファイル処理に失敗しました。",
  UNKNOWN_ERROR: "予期しないエラーが発生しました。"
};

export function getErrorType(statusCode: number): ErrorType {
  if (statusCode === 401 || statusCode === 403) return 'AUTH_ERROR';
  if (statusCode === 429) return 'RATE_LIMIT_ERROR';
  if (statusCode >= 500) return 'SERVER_ERROR';
  if (statusCode >= 400) return 'VALIDATION_ERROR';
  return 'UNKNOWN_ERROR';
}

export function handleError(error: unknown, customMessage?: string): void {
  console.error('Error occurred:', error);
  
  if (error instanceof GeminiApiError) {
    const message = customMessage || error.message;
    const errorTypeMessage = error.errorType ? ERROR_MESSAGES[error.errorType] : '';
    
    toast.error(message, {
      description: errorTypeMessage || `Status: ${error.statusCode || 'Unknown'}`,
      duration: 5000,
    });
    
    console.error('GeminiApiError details:', {
      message: error.message,
      statusCode: error.statusCode,
      errorType: error.errorType,
      originalError: error.originalError
    });
  } else if (error instanceof Error) {
    toast.error(customMessage || error.message, {
      description: ERROR_MESSAGES.UNKNOWN_ERROR,
      duration: 5000,
    });
    console.error('Error details:', error);
  } else {
    toast.error(customMessage || ERROR_MESSAGES.UNKNOWN_ERROR, {
      duration: 5000,
    });
    console.error('Unknown error:', error);
  }
}

export function showSuccess(message: string, description?: string): void {
  toast.success(message, {
    description,
    duration: 3000,
  });
}

export function showLoading(message: string): string | number {
  return toast.loading(message);
}

export function dismissToast(id: string | number): void {
  toast.dismiss(id);
}
