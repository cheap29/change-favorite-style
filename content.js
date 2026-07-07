(() => {
if (globalThis.__styleChangerInitialized) {
  return;
}

globalThis.__styleChangerInitialized = true;

// スタイル要素のID
const STYLE_ID = "style-changer-custom-styles";

const DEFAULT_SETTINGS = {
  enabled: false,
  fontFamily: "inherit",
  fontSize: 16,
  fontWeight: "normal",
  lineHeight: 1.6,
  letterSpacing: 0,
  disabledHosts: [],
};

const GENERIC_FONT_FAMILIES = new Set([
  "inherit",
  "serif",
  "sans-serif",
  "monospace",
  "cursive",
  "fantasy",
  "system-ui",
  "ui-serif",
  "ui-sans-serif",
  "ui-monospace",
]);

const ALLOWED_FONT_WEIGHTS = new Set([
  "normal",
  "bold",
  "lighter",
  "100",
  "200",
  "300",
  "400",
  "500",
  "600",
  "700",
  "800",
  "900",
]);

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const normalizeHost = (value) => {
  if (typeof value !== "string") {
    return "";
  }

  return value.toLowerCase().replace(/^www\./, "").trim();
};

const normalizeFontFamily = (value) => {
  if (typeof value !== "string") {
    return DEFAULT_SETTINGS.fontFamily;
  }

  const families = value
    .split(",")
    .map((family) => family.trim().replace(/^["']|["']$/g, ""))
    .filter(Boolean)
    .slice(0, 5);

  const normalizedFamilies = families
    .map((family) => {
      const lowerFamily = family.toLowerCase();
      if (GENERIC_FONT_FAMILIES.has(lowerFamily)) {
        return lowerFamily;
      }

      if (/^[\p{L}\p{N}\s._-]{1,64}$/u.test(family)) {
        return `"${family}"`;
      }

      return null;
    })
    .filter(Boolean);

  return normalizedFamilies.length
    ? normalizedFamilies.join(", ")
    : DEFAULT_SETTINGS.fontFamily;
};

const normalizeSettings = (settings = {}) => {
  const fontSize = Number.parseInt(settings.fontSize, 10);
  const lineHeight = Number.parseFloat(settings.lineHeight);
  const letterSpacing = Number.parseFloat(settings.letterSpacing);
  const fontWeight = String(settings.fontWeight || DEFAULT_SETTINGS.fontWeight);
  const disabledHosts = Array.isArray(settings.disabledHosts)
    ? [...new Set(settings.disabledHosts.map(normalizeHost).filter(Boolean))]
    : [];

  return {
    enabled: Boolean(settings.enabled),
    fontFamily: normalizeFontFamily(settings.fontFamily),
    fontSize: Number.isFinite(fontSize)
      ? clamp(fontSize, 10, 36)
      : DEFAULT_SETTINGS.fontSize,
    fontWeight: ALLOWED_FONT_WEIGHTS.has(fontWeight)
      ? fontWeight
      : DEFAULT_SETTINGS.fontWeight,
    lineHeight: Number.isFinite(lineHeight)
      ? clamp(lineHeight, 1, 2.2)
      : DEFAULT_SETTINGS.lineHeight,
    letterSpacing: Number.isFinite(letterSpacing)
      ? clamp(letterSpacing, 0, 3)
      : DEFAULT_SETTINGS.letterSpacing,
    disabledHosts,
  };
};

const isDisabledForCurrentSite = (settings) => {
  const currentHost = normalizeHost(window.location.hostname);
  return Boolean(currentHost) && settings.disabledHosts.includes(currentHost);
};

// 現在適用中の設定
let currentSettings = null;

// カスタムスタイルを作成
const createCustomStyle = (settings) => {
  if (!settings.enabled) {
    return "";
  }

  const safeSettings = normalizeSettings(settings);
  const { fontFamily, fontSize, fontWeight, lineHeight, letterSpacing } =
    safeSettings;

  return `
    *:not(code):not(pre):not(.hljs):not([class*="code"]):not([class*="highlight"]):not([class*="material-icons"]):not([class*="material-symbols"]):not(.fa):not(.fas):not(.far):not(.fab) {
      font-family: ${fontFamily} !important;
      font-size: ${fontSize}px !important;
      font-weight: ${fontWeight} !important;
      line-height: ${lineHeight} !important;
      letter-spacing: ${letterSpacing}px !important;
    }
    
    /* 特定の要素は除外 */
    input, button, select, textarea {
      font-size: ${Math.max(12, fontSize - 2)}px !important;
      line-height: ${Math.max(1.2, lineHeight - 0.1)} !important;
    }
    
    /* コードブロックなどは元のフォントファミリーを維持 */
    code, pre, .hljs, [class*="code"], [class*="highlight"] {
      font-family: monospace !important;
    }
  `;
};

// スタイルを適用
const applyStyle = (settings) => {
  const safeSettings = normalizeSettings(settings);

  // 既存のスタイル要素を削除
  const existingStyle = document.getElementById(STYLE_ID);
  if (existingStyle) {
    existingStyle.remove();
  }

  // 新しいスタイルを適用
  if (safeSettings.enabled && !isDisabledForCurrentSite(safeSettings)) {
    const styleElement = document.createElement("style");
    styleElement.id = STYLE_ID;
    styleElement.textContent = createCustomStyle(safeSettings);
    (document.head || document.documentElement).appendChild(styleElement);

    console.log("スタイルを適用しました:", safeSettings);
  } else {
    console.log("スタイルを無効にしました");
  }

  currentSettings = safeSettings;
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
  if (message && message.action === "applyStyle") {
    applyStyle(message.settings);
    sendResponse({ success: true });
  }

  return false;
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
    applyStyle(changes.styleSettings.newValue || DEFAULT_SETTINGS);
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
})();
