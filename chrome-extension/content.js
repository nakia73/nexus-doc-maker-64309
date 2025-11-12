// 動的コンテンツの読み込みを待機
async function waitForContent(selector, timeout = 3000) {
  const startTime = Date.now();
  while (Date.now() - startTime < timeout) {
    const element = document.querySelector(selector);
    if (element && element.innerText && element.innerText.length > 50) {
      console.log(`[Content] コンテンツ検出: ${selector} (${element.innerText.length}文字)`);
      return element;
    }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  console.log(`[Content] タイムアウト: ${selector}`);
  return null;
}

// ページからテキストとメタデータを抽出
async function extractPageContent() {
  const hostname = window.location.hostname;
  console.log(`[Content] コンテンツ抽出開始: ${hostname}`);
  
  // Note.com専用の処理
  if (hostname.includes('note.com')) {
    console.log('[Content] Note.com専用モードで抽出');
    return await extractNoteComContent();
  }
  
  // 一般的なサイトの処理
  return await extractGenericContent();
}

// Note.com専用の抽出ロジック
async function extractNoteComContent() {
  const noteSelectors = [
    '.note-common-styles__textnote-body',
    'article[data-article-id]',
    '.p-article__body',
    '.o-noteContentText',
    'article'
  ];
  
  let mainElement = null;
  
  // 動的コンテンツの読み込みを待機
  for (const selector of noteSelectors) {
    mainElement = await waitForContent(selector, 3000);
    if (mainElement) {
      console.log(`[Content] Note.comメイン要素検出: ${selector}`);
      break;
    }
  }
  
  if (!mainElement) {
    console.log('[Content] Note.com専用セレクタで見つからず、汎用処理へフォールバック');
    return await extractGenericContent();
  }
  
  const clone = mainElement.cloneNode(true);
  
  // Note.com専用の除外セレクタ
  const excludeSelectors = [
    'script',
    'style',
    'noscript',
    'iframe',
    '.o-headerNav',
    '.o-footer',
    '.m-articleSidebar',
    '.c-socialButtonList',
    '.p-comments',
    '.advertisement',
    '.ads',
    'button',
    'form'
  ];
  
  excludeSelectors.forEach(selector => {
    const elements = clone.querySelectorAll(selector);
    elements.forEach(el => el.remove());
  });
  
  // テキストを抽出
  let text = extractTextFromElement(clone);
  
  console.log(`[Content] Note.com抽出完了: ${text.length}文字`);
  
  return buildMetadata(text);
}

// 汎用的なコンテンツ抽出
async function extractGenericContent() {
  const mainSelectors = [
    'article',
    'main',
    '[role="main"]',
    '.main-content',
    '#main-content',
    '.post-content',
    '.article-content',
    '.entry-content',
    '.post',
    '.content'
  ];

  let mainElement = null;
  for (const selector of mainSelectors) {
    const element = document.querySelector(selector);
    if (element && element.innerText && element.innerText.length > 20) {
      mainElement = element;
      console.log(`[Content] メイン要素検出: ${selector} (${element.innerText.length}文字)`);
      break;
    }
  }

  // メイン要素が見つからない場合はbodyを使用
  if (!mainElement) {
    console.log('[Content] メイン要素が見つからず、bodyを使用');
    mainElement = document.body;
  }

  const clone = mainElement.cloneNode(true);
  
  // 汎用の除外セレクタ
  const excludeSelectors = [
    'script',
    'style',
    'noscript',
    'iframe',
    'nav',
    'header',
    'footer',
    'aside',
    '.advertisement',
    '.ads',
    '.sidebar',
    '.comments',
    '.social-share',
    '.related-posts',
    'button',
    'form'
  ];

  let excludedCount = 0;
  excludeSelectors.forEach(selector => {
    const elements = clone.querySelectorAll(selector);
    excludedCount += elements.length;
    elements.forEach(el => el.remove());
  });
  
  console.log(`[Content] 除外要素数: ${excludedCount}`);

  // テキストを抽出
  let text = extractTextFromElement(clone);
  
  console.log(`[Content] 汎用抽出完了: ${text.length}文字`);
  
  return buildMetadata(text);
}

// 要素からテキストを抽出
function extractTextFromElement(element) {
  // 段落ごとにテキストを抽出（改行を保持）
  const paragraphs = [];
  const textElements = element.querySelectorAll('p, h1, h2, h3, h4, h5, h6, li, div[class*="text"], div[class*="content"]');
  
  if (textElements.length > 0) {
    textElements.forEach(el => {
      const text = (el.innerText || el.textContent)?.trim();
      if (text && text.length > 0) {
        paragraphs.push(text);
      }
    });
  }

  // 段落が取得できなかった場合はinnerTextを使用
  let text = '';
  if (paragraphs.length > 0) {
    text = paragraphs.join('\n\n');
  } else {
    text = element.innerText || element.textContent || '';
  }
  
  // 連続する空白を整理（改行は保持）
  text = text.replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
  
  return text;
}

// メタデータを構築
function buildMetadata(text) {

  // メタデータを取得
  const metadata = {
    title: document.title,
    url: window.location.href,
    description: getMetaContent('description') || getMetaContent('og:description') || '',
    publishedDate: getPublishedDate(),
    extractedAt: new Date().toISOString(),
    wordCount: text.split(/\s+/).length
  };

  return {
    content: text,
    metadata: metadata
  };
}

// メタタグから内容を取得
function getMetaContent(name) {
  const meta = document.querySelector(`meta[name="${name}"], meta[property="${name}"]`);
  return meta ? meta.getAttribute('content') : null;
}

// 公開日時を取得
function getPublishedDate() {
  // <time>タグから
  const timeElement = document.querySelector('time[datetime]');
  if (timeElement) {
    return timeElement.getAttribute('datetime');
  }

  // メタタグから
  const dateSelectors = [
    'article:published_time',
    'datePublished',
    'publishedDate',
    'date'
  ];

  for (const selector of dateSelectors) {
    const content = getMetaContent(selector);
    if (content) return content;
  }

  return null;
}

// メッセージリスナー（非同期対応）
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'extractContent') {
    extractPageContent()
      .then(data => {
        console.log('[Content] 抽出成功、データ送信');
        sendResponse({ success: true, data: data });
      })
      .catch(error => {
        console.error('[Content] 抽出エラー:', error);
        sendResponse({ success: false, error: error.message });
      });
    return true; // 非同期レスポンスを許可
  }
});
