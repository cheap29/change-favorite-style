// スタイル要素のID
const STYLE_ID = "style-changer-custom-styles";

// 現在適用中の設定
let currentSettings = null;

// カスタムスタイルを作成
const createCustomStyle = (settings) => {
  if (!settings.enabled) {
    return "";
  }

  const { fontFamily, fontSize, fontWeight } = settings;

  return `
    * {
      font-family: ${fontFamily} !important;
      font-size: ${fontSize}px !important;
      font-weight: ${fontWeight} !important;
    }
    
    /* 特定の要素は除外 */
    input, button, select, textarea {
      font-size: ${Math.max(12, fontSize - 2)}px !important;
    }
    
    /* コードブロックなどは元のフォントファミリーを維持 */
    code, pre, .hljs, [class*="code"], [class*="highlight"] {
      font-family: monospace !important;
    }
  `;
};

// スタイルを適用
const applyStyle = (settings) => {
  // 既存のスタイル要素を削除
  const existingStyle = document.getElementById(STYLE_ID);
  if (existingStyle) {
    existingStyle.remove();
  }

  // 新しいスタイルを適用
  if (settings.enabled) {
    const styleElement = document.createElement("style");
    styleElement.id = STYLE_ID;
    styleElement.textContent = createCustomStyle(settings);
    document.head.appendChild(styleElement);

    console.log("スタイルを適用しました:", settings);
  } else {
    console.log("スタイルを無効にしました");
  }

  currentSettings = settings;
};

// 設定を読み込む
const loadSettings = async () => {
  try {
    const result = await chrome.storage.local.get(["styleSettings"]);
    const settings = result.styleSettings;

    if (settings) {
      applyStyle(settings);
    }
  } catch (error) {
    console.error("設定の読み込みに失敗しました:", error);
  }
};

// メッセージリスナー
const handleMessage = (message, sender, sendResponse) => {
  if (message.action === "applyStyle") {
    applyStyle(message.settings);
    sendResponse({ success: true });
  }

  return true; // 非同期レスポンスを示す
};

// ページの状態変化を監視（SPAサイト対応）
const observePageChanges = () => {
  const observer = new MutationObserver((mutations) => {
    // ページの大幅な変更が検出された場合、スタイルを再適用
    const hasSignificantChanges = mutations.some(
      (mutation) =>
        mutation.type === "childList" &&
        mutation.addedNodes.length > 0 &&
        Array.from(mutation.addedNodes).some(
          (node) =>
            node.nodeType === Node.ELEMENT_NODE &&
            (node.tagName === "HEAD" || node.tagName === "BODY")
        )
    );

    if (hasSignificantChanges && currentSettings && currentSettings.enabled) {
      // 少し遅延してスタイルを再適用
      setTimeout(() => applyStyle(currentSettings), 100);
    }
  });

  observer.observe(document, {
    childList: true,
    subtree: true,
  });
};

// ストレージの変更を監視
const handleStorageChange = (changes, areaName) => {
  if (areaName === "local" && changes.styleSettings) {
    const newSettings = changes.styleSettings.newValue;
    if (newSettings) {
      applyStyle(newSettings);
    }
  }
};

// 初期化
const init = () => {
  // ページ読み込み時に設定を適用
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", loadSettings);
  } else {
    loadSettings();
  }

  // メッセージリスナーを設定
  chrome.runtime.onMessage.addListener(handleMessage);

  // ストレージ変更リスナーを設定
  chrome.storage.onChanged.addListener(handleStorageChange);

  // ページ変化の監視を開始
  observePageChanges();
};

// 初期化実行
init();
