// ページからテキストとメタデータを抽出
function extractPageContent() {
  // noteなど特定サイトのセレクタを追加
  const mainSelectors = [
    // note.com用
    '.note-common-styles__textnote-body',
    '.o-noteContentText',
    'article .note-common-styles__textnote-body',
    // 汎用セレクタ
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
    if (element && element.innerText && element.innerText.length > 100) {
      mainElement = element;
      break;
    }
  }

  // メイン要素が見つからない場合はbodyを使用
  if (!mainElement) {
    mainElement = document.body;
  }

  // 不要な要素を除外してテキストを抽出
  const clone = mainElement.cloneNode(true);
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

  excludeSelectors.forEach(selector => {
    const elements = clone.querySelectorAll(selector);
    elements.forEach(el => el.remove());
  });

  // 段落ごとにテキストを抽出（改行を保持）
  const paragraphs = [];
  const textElements = clone.querySelectorAll('p, h1, h2, h3, h4, h5, h6, li, div[class*="text"]');
  
  if (textElements.length > 0) {
    textElements.forEach(el => {
      const text = el.innerText?.trim();
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
    text = clone.innerText || clone.textContent || '';
  }
  
  // 連続する空白を整理（改行は保持）
  text = text.replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();

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

// メッセージリスナー
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'extractContent') {
    try {
      const data = extractPageContent();
      sendResponse({ success: true, data: data });
    } catch (error) {
      sendResponse({ success: false, error: error.message });
    }
  }
  return true; // 非同期レスポンスを許可
});
