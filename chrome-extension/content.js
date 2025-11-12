// ページからテキストとメタデータを抽出
function extractPageContent() {
  // メインコンテンツを探す
  const mainSelectors = [
    'article',
    'main',
    '[role="main"]',
    '.main-content',
    '#main-content',
    '.post-content',
    '.article-content'
  ];

  let mainElement = null;
  for (const selector of mainSelectors) {
    const element = document.querySelector(selector);
    if (element) {
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
    'nav',
    'header',
    'footer',
    'aside',
    '.advertisement',
    '.ads',
    '.sidebar',
    '.comments'
  ];

  excludeSelectors.forEach(selector => {
    const elements = clone.querySelectorAll(selector);
    elements.forEach(el => el.remove());
  });

  // テキストを抽出してクリーニング
  let text = clone.innerText || clone.textContent || '';
  text = text.replace(/\s+/g, ' ').trim();

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
