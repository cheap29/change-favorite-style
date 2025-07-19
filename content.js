// スタイル要素のID
const STYLE_ID = "style-changer-custom-styles";
const DARKEN_STYLE_ID = "style-changer-darken-background";

// 現在適用中の設定
let currentSettings = null;

// 背景色を暗くする処理
const darkenBackgroundColor = () => {
  const body = document.body;
  const computedStyle = window.getComputedStyle(body);
  let currentBgColor = computedStyle.backgroundColor;

  // 背景色が透明または未設定の場合は白を基準にする
  if (
    currentBgColor === "rgba(0, 0, 0, 0)" ||
    currentBgColor === "transparent" ||
    !currentBgColor
  ) {
    currentBgColor = "rgb(255, 255, 255)";
  }

  // RGB値を抽出
  const rgbMatch = currentBgColor.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
  if (rgbMatch) {
    const r = Math.max(0, parseInt(rgbMatch[1]) - 16); // 16減らす（#ff → #ef）
    const g = Math.max(0, parseInt(rgbMatch[2]) - 16);
    const b = Math.max(0, parseInt(rgbMatch[3]) - 16);
    return `rgb(${r}, ${g}, ${b})`;
  }

  // HEX形式の場合の処理も追加
  if (currentBgColor.startsWith("#")) {
    const hex = currentBgColor.slice(1);
    if (hex.length === 6) {
      const r = Math.max(0, parseInt(hex.slice(0, 2), 16) - 16);
      const g = Math.max(0, parseInt(hex.slice(2, 4), 16) - 16);
      const b = Math.max(0, parseInt(hex.slice(4, 6), 16) - 16);
      return `rgb(${r}, ${g}, ${b})`;
    }
  }

  // フォールバック: うすいグレー
  return "#efefef";
};

// フォントスタイルを作成
const createFontStyle = (settings) => {
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

// 背景を暗くするスタイルを作成
const createDarkenStyle = (settings) => {
  if (!settings.darkenEnabled) {
    return "";
  }

  const darkenedColor = darkenBackgroundColor();
  console.log("darkenedColor", darkenedColor);
  return `
    body {
      background-color: ${darkenedColor} !important;
    }
  `;
};

// フォントスタイルを適用
const applyFontStyle = (settings) => {
  // 既存のフォントスタイル要素を削除
  const existingStyle = document.getElementById(STYLE_ID);
  if (existingStyle) {
    existingStyle.remove();
  }

  // 新しいフォントスタイルを適用
  if (settings.enabled) {
    const styleElement = document.createElement("style");
    styleElement.id = STYLE_ID;
    styleElement.textContent = createFontStyle(settings);
    document.head.appendChild(styleElement);
    console.log("フォントスタイルを適用しました:", settings);
  } else {
    console.log("フォントスタイルを無効にしました");
  }
};

// 背景を暗くするスタイルを適用
const applyDarkenStyle = (settings) => {
  // 既存の背景スタイル要素を削除
  const existingDarkenStyle = document.getElementById(DARKEN_STYLE_ID);
  if (existingDarkenStyle) {
    existingDarkenStyle.remove();
  }

  // 新しい背景スタイルを適用
  if (settings.darkenEnabled) {
    const darkenStyleElement = document.createElement("style");
    darkenStyleElement.id = DARKEN_STYLE_ID;
    darkenStyleElement.textContent = createDarkenStyle(settings);
    document.head.appendChild(darkenStyleElement);
    console.log("背景を暗くしました");
  } else {
    console.log("背景の暗化を無効にしました");
  }
};

// 全てのスタイルを適用
const applyAllStyles = (settings) => {
  applyFontStyle(settings);
  applyDarkenStyle(settings);
  currentSettings = settings;
};

// 設定を読み込む
const loadSettings = async () => {
  try {
    const result = await chrome.storage.local.get(["styleSettings"]);
    const settings = result.styleSettings;

    if (settings) {
      applyAllStyles(settings);
    }
  } catch (error) {
    console.error("設定の読み込みに失敗しました:", error);
  }
};

// メッセージリスナー
const handleMessage = (message, sender, sendResponse) => {
  if (message.action === "applyStyle") {
    applyAllStyles(message.settings);
    sendResponse({ success: true });
  } else if (message.action === "applyFontStyle") {
    applyFontStyle(message.settings);
    sendResponse({ success: true });
  } else if (message.action === "applyDarkenStyle") {
    applyDarkenStyle(message.settings);
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

    if (
      hasSignificantChanges &&
      currentSettings &&
      (currentSettings.enabled || currentSettings.darkenEnabled)
    ) {
      // 少し遅延してスタイルを再適用
      setTimeout(() => applyAllStyles(currentSettings), 100);
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
      applyAllStyles(newSettings);
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
