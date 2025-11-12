import { GeminiApiError, getErrorType } from "./error-handler";
import type { FileSearchStore, FileSearchDocument, UploadOperation, GenerateContentResponse } from "@/types/gemini";

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta';

export async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeout: number
): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(id);
    return response;
  } catch (error: any) {
    clearTimeout(id);
    if (error.name === 'AbortError') {
      throw new GeminiApiError('タイムアウトしました', undefined, 'TIMEOUT_ERROR');
    }
    throw new GeminiApiError(
      'ネットワークエラーが発生しました',
      undefined,
      'NETWORK_ERROR',
      error
    );
  }
}

export async function handleApiResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let errorMessage = `APIエラー: ${response.status}`;
    let errorBody: any = null;
    
    try {
      errorBody = await response.json();
      errorMessage = errorBody.error?.message || errorMessage;
    } catch {
      // JSONパースに失敗した場合はデフォルトメッセージ
    }

    console.error('API Error Response:', {
      status: response.status,
      statusText: response.statusText,
      body: errorBody
    });

    throw new GeminiApiError(
      errorMessage,
      response.status,
      getErrorType(response.status),
      errorBody
    );
  }

  try {
    return await response.json();
  } catch (error) {
    console.error('JSON Parse Error:', error);
    throw new GeminiApiError(
      'レスポンスの解析に失敗しました',
      response.status,
      'PARSE_ERROR',
      error
    );
  }
}

export function getApiKey(): string {
  const apiKey = localStorage.getItem('gemini-api-key');
  if (!apiKey) {
    throw new GeminiApiError(
      'APIキーが設定されていません',
      undefined,
      'VALIDATION_ERROR'
    );
  }
  return apiKey;
}

export function validateApiKey(apiKey: string): void {
  if (!apiKey || apiKey.trim() === '') {
    throw new GeminiApiError(
      'APIキーを入力してください',
      undefined,
      'VALIDATION_ERROR'
    );
  }
  
  if (apiKey.length < 30) {
    throw new GeminiApiError(
      'APIキーの形式が正しくありません',
      undefined,
      'VALIDATION_ERROR'
    );
  }
}

export async function testApiConnection(apiKey: string): Promise<void> {
  const url = `${GEMINI_API_BASE}/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
  
  const response = await fetchWithTimeout(
    url,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: 'Hello' }] }]
      })
    },
    10000
  );

  await handleApiResponse(response);
}

export async function createFileSearchStore(storeName: string): Promise<FileSearchStore> {
  if (!storeName || storeName.trim() === '') {
    throw new GeminiApiError(
      'ストア名を入力してください',
      undefined,
      'VALIDATION_ERROR'
    );
  }

  const apiKey = getApiKey();
  const url = `${GEMINI_API_BASE}/fileSearchStores?key=${apiKey}`;

  const response = await fetchWithTimeout(
    url,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        displayName: storeName
      })
    },
    30000
  );

  return handleApiResponse<FileSearchStore>(response);
}

export async function uploadAndImportFile(
  file: File,
  storeName: string
): Promise<UploadOperation> {
  // ファイルバリデーション
  if (!file) {
    throw new GeminiApiError(
      'ファイルを選択してください',
      undefined,
      'FILE_ERROR'
    );
  }

  const maxSize = 10 * 1024 * 1024; // 10MB
  if (file.size > maxSize) {
    throw new GeminiApiError(
      'ファイルサイズが大きすぎます（最大10MB）',
      undefined,
      'FILE_ERROR'
    );
  }

  const allowedTypes = ['text/plain', 'application/pdf', 'text/markdown'];
  const allowedExtensions = ['.txt', '.pdf', '.md'];
  const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
  
  if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(fileExtension)) {
    throw new GeminiApiError(
      'サポートされていないファイル形式です（TXT, PDF, MDのみ）',
      undefined,
      'FILE_ERROR'
    );
  }

  if (!storeName) {
    throw new GeminiApiError(
      'ストアが選択されていません',
      undefined,
      'VALIDATION_ERROR'
    );
  }

  const apiKey = getApiKey();
  
  // Step 1: Upload file using Files API (resumable upload protocol)
  const numBytes = file.size;
  const mimeType = file.type || 'application/octet-stream';
  
  console.log('Starting file upload:', { fileName: file.name, size: numBytes, mimeType });
  
  const initialUrl = `https://generativelanguage.googleapis.com/upload/v1beta/files?key=${apiKey}`;
  
  const initialResponse = await fetchWithTimeout(
    initialUrl,
    {
      method: 'POST',
      headers: {
        'X-Goog-Upload-Protocol': 'resumable',
        'X-Goog-Upload-Command': 'start',
        'X-Goog-Upload-Header-Content-Length': numBytes.toString(),
        'X-Goog-Upload-Header-Content-Type': mimeType,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        file: {
          display_name: file.name  // Use snake_case as per Google API convention
        }
      })
    },
    30000
  );

  console.log('Initial response status:', initialResponse.status);

  if (!initialResponse.ok) {
    let errorDetails = '';
    try {
      const errorText = await initialResponse.text();
      errorDetails = errorText;
      console.error('Initial upload error response:', errorText);
    } catch (e) {
      console.error('Could not read error response');
    }
    
    throw new GeminiApiError(
      `アップロード初期化に失敗しました: ${initialResponse.status} ${errorDetails}`,
      initialResponse.status,
      getErrorType(initialResponse.status)
    );
  }

  // Get upload URL from response headers
  const uploadUrl = initialResponse.headers.get('x-goog-upload-url');
  if (!uploadUrl) {
    console.error('Upload URL not found in headers:', Array.from(initialResponse.headers.entries()));
    throw new GeminiApiError(
      'アップロードURLの取得に失敗しました',
      undefined,
      'PARSE_ERROR'
    );
  }

  console.log('Got upload URL, uploading file bytes...');

  // Step 2: Upload actual file bytes
  const fileBuffer = await file.arrayBuffer();
  
  const uploadResponse = await fetchWithTimeout(
    uploadUrl,
    {
      method: 'POST',
      headers: {
        'Content-Length': numBytes.toString(),
        'X-Goog-Upload-Offset': '0',
        'X-Goog-Upload-Command': 'upload, finalize',
      },
      body: fileBuffer
    },
    60000
  );

  console.log('Upload response status:', uploadResponse.status);

  const uploadedFile = await handleApiResponse<{ file: { name: string } }>(uploadResponse);
  const fileName = uploadedFile.file.name;

  console.log('File uploaded successfully:', fileName);

  // Step 3: Import file to File Search store
  const importUrl = `${GEMINI_API_BASE}/${storeName}:importFile?key=${apiKey}`;
  
  console.log('Importing file to store:', storeName);
  
  const importResponse = await fetchWithTimeout(
    importUrl,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fileName: fileName
      })
    },
    30000
  );

  const operation = await handleApiResponse<UploadOperation>(importResponse);

  console.log('Import operation started:', operation.name);

  // Step 4: Poll for operation completion
  return await pollOperation(operation.name);
}

async function pollOperation(operationName: string): Promise<UploadOperation> {
  const apiKey = getApiKey();
  const maxAttempts = 30; // 5 minutes (10 seconds * 30)
  let attempts = 0;

  while (attempts < maxAttempts) {
    const url = `${GEMINI_API_BASE}/${operationName}?key=${apiKey}`;
    
    const response = await fetchWithTimeout(url, { method: 'GET' }, 10000);
    const operation = await handleApiResponse<UploadOperation>(response);

    if (operation.done) {
      if (operation.error) {
        throw new GeminiApiError(
          `インポートに失敗しました: ${operation.error.message}`,
          operation.error.code,
          'FILE_ERROR',
          operation.error
        );
      }
      return operation;
    }

    attempts++;
    await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds
  }

  throw new GeminiApiError(
    'インポート処理がタイムアウトしました',
    undefined,
    'TIMEOUT_ERROR'
  );
}

export async function queryWithFileSearch(
  question: string,
  storeName: string
): Promise<string> {
  if (!question || question.trim() === '') {
    throw new GeminiApiError(
      '質問を入力してください',
      undefined,
      'VALIDATION_ERROR'
    );
  }

  if (!storeName) {
    throw new GeminiApiError(
      'ストアが作成されていません',
      undefined,
      'VALIDATION_ERROR'
    );
  }

  const apiKey = getApiKey();
  const url = `${GEMINI_API_BASE}/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

  const response = await fetchWithTimeout(
    url,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: question }]
        }],
        tools: [{
          fileSearch: {
            fileSearchStoreNames: [storeName]
          }
        }]
      })
    },
    60000
  );

  const result = await handleApiResponse<GenerateContentResponse>(response);

  if (!result.candidates || result.candidates.length === 0) {
    throw new GeminiApiError(
      'レスポンスが取得できませんでした',
      undefined,
      'PARSE_ERROR'
    );
  }

  const text = result.candidates[0]?.content?.parts?.[0]?.text;
  
  if (!text) {
    throw new GeminiApiError(
      'テキストレスポンスが見つかりませんでした',
      undefined,
      'PARSE_ERROR'
    );
  }

  return text;
}

export async function listDocuments(storeName: string): Promise<FileSearchDocument[]> {
  const apiKey = getApiKey();
  const url = `${GEMINI_API_BASE}/${storeName}/documents?key=${apiKey}`;
  
  try {
    const response = await fetchWithTimeout(url, { method: 'GET' }, 30000);
    const data = await handleApiResponse<{ documents?: FileSearchDocument[] }>(response);
    
    return data.documents || [];
  } catch (error) {
    if (error instanceof GeminiApiError && error.statusCode === 404) {
      return [];
    }
    throw error;
  }
}

/**
 * すべてのFile Search Storeの一覧を取得
 * エラーハンドリング: APIリクエスト、レスポンス解析、404処理を詳細にログ出力
 */
export async function listFileSearchStores(): Promise<FileSearchStore[]> {
  console.log('[listFileSearchStores] Step 1: APIキーの取得を開始');
  
  try {
    const apiKey = getApiKey();
    console.log('[listFileSearchStores] Step 2: APIキー取得成功');
    
    const url = `${GEMINI_API_BASE}/fileSearchStores?key=${apiKey}`;
    console.log('[listFileSearchStores] Step 3: APIリクエストURL:', url);
    
    console.log('[listFileSearchStores] Step 4: HTTPリクエストを送信中...');
    const response = await fetchWithTimeout(url, { method: 'GET' }, 30000);
    
    console.log('[listFileSearchStores] Step 5: HTTPレスポンス受信', {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries())
    });
    
    if (response.status === 404) {
      console.log('[listFileSearchStores] Step 6: 404エラー - ストアが存在しないか、エンドポイントが無効');
      // ストアが存在しない、またはエンドポイントが存在しない
      return [];
    }
    
    console.log('[listFileSearchStores] Step 7: レスポンスボディの解析を開始');
    const data = await handleApiResponse<{ fileSearchStores?: FileSearchStore[] }>(response);
    
    console.log('[listFileSearchStores] Step 8: レスポンスデータ:', data);
    
    const stores = data.fileSearchStores || [];
    console.log('[listFileSearchStores] Step 9: 取得成功 - ストア数:', stores.length);
    
    return stores;
  } catch (error) {
    console.error('[listFileSearchStores] エラー発生:', error);
    
    if (error instanceof GeminiApiError) {
      // エラーの詳細情報をログ出力
      console.error('[listFileSearchStores] GeminiApiError詳細:', {
        message: error.message,
        statusCode: error.statusCode,
        errorType: error.errorType,
        originalError: error.originalError
      });
      
      // 404の場合は空配列を返す（ストアが存在しない場合）
      if (error.statusCode === 404) {
        console.log('[listFileSearchStores] 404エラーのため空配列を返します');
        return [];
      }
      
      // その他のエラーは再スロー
      throw new GeminiApiError(
        `ストア一覧の取得に失敗しました: ${error.message}`,
        error.statusCode,
        error.errorType,
        error.originalError
      );
    }
    
    // 予期しないエラー
    console.error('[listFileSearchStores] 予期しないエラー:', error);
    throw new GeminiApiError(
      'ストア一覧の取得中に予期しないエラーが発生しました',
      undefined,
      'UNKNOWN_ERROR',
      error
    );
  }
}

/**
 * 特定のFile Search Storeの詳細を取得
 * エラーハンドリング: ストア名のバリデーション、APIリクエスト、レスポンス解析を詳細にログ出力
 */
export async function getFileSearchStore(storeName: string): Promise<FileSearchStore> {
  console.log('[getFileSearchStore] Step 1: ストア詳細取得開始 - ストア名:', storeName);
  
  if (!storeName || storeName.trim() === '') {
    console.error('[getFileSearchStore] エラー: ストア名が空です');
    throw new GeminiApiError(
      'ストア名が指定されていません',
      undefined,
      'VALIDATION_ERROR'
    );
  }
  
  console.log('[getFileSearchStore] Step 2: ストア名バリデーション成功');
  
  try {
    console.log('[getFileSearchStore] Step 3: APIキーの取得を開始');
    const apiKey = getApiKey();
    console.log('[getFileSearchStore] Step 4: APIキー取得成功');
    
    const url = `${GEMINI_API_BASE}/${storeName}?key=${apiKey}`;
    console.log('[getFileSearchStore] Step 5: APIリクエストURL:', url);
    
    console.log('[getFileSearchStore] Step 6: HTTPリクエストを送信中...');
    const response = await fetchWithTimeout(url, { method: 'GET' }, 30000);
    
    console.log('[getFileSearchStore] Step 7: HTTPレスポンス受信', {
      status: response.status,
      statusText: response.statusText
    });
    
    console.log('[getFileSearchStore] Step 8: レスポンスボディの解析を開始');
    const store = await handleApiResponse<FileSearchStore>(response);
    
    console.log('[getFileSearchStore] Step 9: ストア詳細取得成功:', store);
    
    return store;
  } catch (error) {
    console.error('[getFileSearchStore] エラー発生:', error);
    
    if (error instanceof GeminiApiError) {
      console.error('[getFileSearchStore] GeminiApiError詳細:', {
        message: error.message,
        statusCode: error.statusCode,
        errorType: error.errorType,
        originalError: error.originalError
      });
      
      throw new GeminiApiError(
        `ストア詳細の取得に失敗しました: ${error.message}`,
        error.statusCode,
        error.errorType,
        error.originalError
      );
    }
    
    console.error('[getFileSearchStore] 予期しないエラー:', error);
    throw new GeminiApiError(
      'ストア詳細の取得中に予期しないエラーが発生しました',
      undefined,
      'UNKNOWN_ERROR',
      error
    );
  }
}

export async function chatWithGemini(
  message: string,
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> = [],
  useWebSearch: boolean = false
): Promise<{ content: string; citations?: { url: string; title?: string }[] }> {
  const apiKey = getApiKey();
  const modelName = 'gemini-2.5-flash';
  const url = `${GEMINI_API_BASE}/models/${modelName}:generateContent?key=${apiKey}`;
  
  const contents = [
    ...conversationHistory.map(msg => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }]
    })),
    {
      role: 'user',
      parts: [{ text: message }]
    }
  ];
  
  const requestBody: any = {
    contents
  };

  // Web検索が有効な場合のみtoolsを追加
  if (useWebSearch) {
    requestBody.tools = [{
      google_search: {}
    }];
  }
  
  const response = await fetchWithTimeout(
    url,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    },
    60000
  );
  
  const data = await handleApiResponse<GenerateContentResponse>(response);
  
  if (data.error) {
    throw new GeminiApiError(
      data.error.message,
      data.error.code,
      getErrorType(data.error.code)
    );
  }
  
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  
  if (!text) {
    throw new GeminiApiError(
      'レスポンスにテキストが含まれていません',
      undefined,
      'PARSE_ERROR'
    );
  }
  
  // 引用情報を抽出
  const citations: { url: string; title?: string }[] = [];
  const groundingChunks = data.candidates?.[0]?.groundingMetadata?.groundingChunks;
  if (groundingChunks) {
    groundingChunks.forEach(chunk => {
      if (chunk.web?.uri) {
        citations.push({
          url: chunk.web.uri,
          title: chunk.web.title
        });
      }
    });
  }
  
  return { content: text, citations: citations.length > 0 ? citations : undefined };
}
