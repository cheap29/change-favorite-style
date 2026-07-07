// DOM要素の取得
const styleToggle = document.getElementById("style-toggle");
const statusText = document.getElementById("status-text");
const settingsSection = document.getElementById("settings-section");
const fontFamily = document.getElementById("font-family");
const fontSize = document.getElementById("font-size");
const fontSizeValue = document.getElementById("font-size-value");
const fontWeight = document.getElementById("font-weight");
const customFontContainer = document.getElementById("custom-font-container");
const customFontName = document.getElementById("custom-font-name");
const presetSelect = document.getElementById("preset-select");
const lineHeight = document.getElementById("line-height");
const lineHeightValue = document.getElementById("line-height-value");
const letterSpacing = document.getElementById("letter-spacing");
const letterSpacingValue = document.getElementById("letter-spacing-value");
const siteHost = document.getElementById("site-host");
const siteDisabled = document.getElementById("site-disabled");

const FONT_FAMILY_OPTIONS = new Set([
  "inherit",
  "serif",
  "sans-serif",
  "monospace",
  "cursive",
  "fantasy",
  "custom",
]);

const FONT_WEIGHT_OPTIONS = new Set([
  "normal",
  "bold",
  "lighter",
  "100",
  "300",
  "500",
  "700",
  "900",
]);

const PRESETS = {
  balanced: {
    selectedFontFamily: "sans-serif",
    fontFamily: "sans-serif",
    fontSize: 18,
    fontWeight: "500",
    lineHeight: 1.7,
    letterSpacing: 0.3,
  },
  large: {
    selectedFontFamily: "sans-serif",
    fontFamily: "sans-serif",
    fontSize: 22,
    fontWeight: "500",
    lineHeight: 1.8,
    letterSpacing: 0.4,
  },
  bold: {
    selectedFontFamily: "sans-serif",
    fontFamily: "sans-serif",
    fontSize: 18,
    fontWeight: "700",
    lineHeight: 1.7,
    letterSpacing: 0.2,
  },
  mono: {
    selectedFontFamily: "monospace",
    fontFamily: "monospace",
    fontSize: 17,
    fontWeight: "500",
    lineHeight: 1.6,
    letterSpacing: 0.2,
  },
};

// デフォルト設定
const defaultSettings = {
  enabled: false,
  fontFamily: "inherit",
  fontSize: 16,
  fontWeight: "normal",
  lineHeight: 1.6,
  letterSpacing: 0,
  customFontName: "",
  selectedFontFamily: "inherit",
  preset: "custom",
  disabledHosts: [],
};

let currentHost = "";
let latestSettings = defaultSettings;

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const sanitizeCustomFontName = (value) => {
  if (typeof value !== "string") {
    return "";
  }

  return value
    .split(",")
    .map((family) => family.trim().replace(/^["']|["']$/g, ""))
    .filter((family) => /^[\p{L}\p{N}\s._-]{1,64}$/u.test(family))
    .slice(0, 5)
    .join(", ");
};

const normalizeSettings = (settings = {}) => {
  const savedFontFamily = FONT_FAMILY_OPTIONS.has(settings.fontFamily)
    ? settings.fontFamily
    : defaultSettings.selectedFontFamily;
  const selectedFontFamily = FONT_FAMILY_OPTIONS.has(settings.selectedFontFamily)
    ? settings.selectedFontFamily
    : savedFontFamily;
  const fontSize = Number.parseInt(settings.fontSize, 10);
  const lineHeightValue = Number.parseFloat(settings.lineHeight);
  const letterSpacingValue = Number.parseFloat(settings.letterSpacing);
  const fontWeight = String(settings.fontWeight || defaultSettings.fontWeight);
  const customFont = sanitizeCustomFontName(settings.customFontName);
  const preset = PRESETS[settings.preset] ? settings.preset : "custom";
  const disabledHosts = Array.isArray(settings.disabledHosts)
    ? [...new Set(settings.disabledHosts.map(normalizeHost).filter(Boolean))]
    : [];

  return {
    ...defaultSettings,
    enabled: Boolean(settings.enabled),
    fontFamily:
      selectedFontFamily === "custom"
        ? customFont || defaultSettings.fontFamily
        : selectedFontFamily,
    fontSize: Number.isFinite(fontSize)
      ? clamp(fontSize, 10, 36)
      : defaultSettings.fontSize,
    fontWeight: FONT_WEIGHT_OPTIONS.has(fontWeight)
      ? fontWeight
      : defaultSettings.fontWeight,
    lineHeight: Number.isFinite(lineHeightValue)
      ? clamp(lineHeightValue, 1, 2.2)
      : defaultSettings.lineHeight,
    letterSpacing: Number.isFinite(letterSpacingValue)
      ? clamp(letterSpacingValue, 0, 3)
      : defaultSettings.letterSpacing,
    customFontName: customFont,
    selectedFontFamily,
    preset,
    disabledHosts,
  };
};

function normalizeHost(value) {
  if (typeof value !== "string") {
    return "";
  }

  return value.toLowerCase().replace(/^www\./, "").trim();
}

// 設定を読み込む
const loadSettings = async () => {
  try {
    const result = await chrome.storage.local.get(["styleSettings"]);
    const settings = normalizeSettings(result.styleSettings || defaultSettings);
    latestSettings = settings;

    // UIに設定を反映
    styleToggle.checked = settings.enabled;
    presetSelect.value = settings.preset;
    fontFamily.value = settings.selectedFontFamily || settings.fontFamily;
    fontSize.value = settings.fontSize;
    fontWeight.value = settings.fontWeight;
    lineHeight.value = settings.lineHeight;
    letterSpacing.value = settings.letterSpacing;
    customFontName.value = settings.customFontName || "";
    siteDisabled.checked =
      Boolean(currentHost) && settings.disabledHosts.includes(currentHost);

    updateUI(settings.enabled);
    updateFontSizeDisplay(settings.fontSize);
    updateLineHeightDisplay(settings.lineHeight);
    updateLetterSpacingDisplay(settings.letterSpacing);
    updateCustomFontVisibility(
      settings.selectedFontFamily || settings.fontFamily
    );
    updateSiteDisplay();

    return settings;
  } catch (error) {
    console.error("設定の読み込みに失敗しました:", error);
    return defaultSettings;
  }
};

// 設定を保存する
const saveSettings = async (settings) => {
  try {
    await chrome.storage.local.set({ styleSettings: settings });
    console.log("設定を保存しました:", settings);
  } catch (error) {
    console.error("設定の保存に失敗しました:", error);
  }
};

// UIの状態を更新
const updateUI = (enabled) => {
  const disabledOnThisSite = Boolean(currentHost) && siteDisabled.checked;

  statusText.textContent = disabledOnThisSite
    ? "このサイトは無効"
    : enabled
    ? "適用中"
    : "未適用";
  statusText.className = disabledOnThisSite
    ? "status-text paused"
    : enabled
    ? "status-text active"
    : "status-text";
  settingsSection.className = enabled
    ? "settings-section enabled"
    : "settings-section";
};

// フォントサイズ表示を更新
const updateFontSizeDisplay = (size) => {
  fontSizeValue.textContent = `${size}px`;
};

const updateLineHeightDisplay = (value) => {
  lineHeightValue.textContent = Number.parseFloat(value).toFixed(1);
};

const updateLetterSpacingDisplay = (value) => {
  letterSpacingValue.textContent = `${Number.parseFloat(value).toFixed(1)}px`;
};

const updateSiteDisplay = () => {
  if (currentHost) {
    siteHost.textContent = currentHost;
    siteDisabled.disabled = false;
  } else {
    siteHost.textContent = "このページではサイト別設定を使えません";
    siteDisabled.checked = false;
    siteDisabled.disabled = true;
  }
};

// カスタムフォント入力の表示/非表示を更新
const updateCustomFontVisibility = (fontFamilyValue) => {
  if (fontFamilyValue === "custom") {
    customFontContainer.style.display = "block";
  } else {
    customFontContainer.style.display = "none";
  }
};

// 実際に使用するフォント名を取得
const getEffectiveFontFamily = () => {
  if (fontFamily.value === "custom") {
    return sanitizeCustomFontName(customFontName.value) || "inherit";
  }
  return fontFamily.value;
};

const getDisabledHosts = () => {
  const disabledHosts = new Set(latestSettings.disabledHosts || []);

  if (currentHost) {
    if (siteDisabled.checked) {
      disabledHosts.add(currentHost);
    } else {
      disabledHosts.delete(currentHost);
    }
  }

  return [...disabledHosts].sort();
};

const getCurrentHost = async () => {
  try {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });

    if (!tab || !tab.url) {
      return "";
    }

    const url = new URL(tab.url);
    if (!["http:", "https:"].includes(url.protocol)) {
      return "";
    }

    return normalizeHost(url.hostname);
  } catch (error) {
    console.error("現在のサイト情報を取得できませんでした:", error);
    return "";
  }
};

const markCustomPreset = () => {
  if (presetSelect.value !== "custom") {
    presetSelect.value = "custom";
  }
};

const applyPresetToControls = (presetName) => {
  const preset = PRESETS[presetName];
  if (!preset) {
    return;
  }

  styleToggle.checked = true;
  fontFamily.value = preset.selectedFontFamily;
  fontSize.value = preset.fontSize;
  fontWeight.value = preset.fontWeight;
  lineHeight.value = preset.lineHeight;
  letterSpacing.value = preset.letterSpacing;
  customFontName.value = "";

  updateCustomFontVisibility(preset.selectedFontFamily);
  updateFontSizeDisplay(preset.fontSize);
  updateLineHeightDisplay(preset.lineHeight);
  updateLetterSpacingDisplay(preset.letterSpacing);
};

// アクティブタブにメッセージを送信
const sendMessageToTab = async (message) => {
  let tab = null;

  try {
    [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    if (tab && tab.id) {
      await chrome.tabs.sendMessage(tab.id, message);
    }
  } catch (error) {
    const canInject =
      tab &&
      tab.id &&
      message &&
      message.action === "applyStyle" &&
      /receiving end does not exist|could not establish connection/i.test(
        String(error && error.message)
      );

    if (!canInject) {
      console.error("タブへのメッセージ送信に失敗しました:", error);
      return;
    }

    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ["content.js"],
      });
      await chrome.tabs.sendMessage(tab.id, message);
    } catch (injectError) {
      console.error("content scriptの注入に失敗しました:", injectError);
    }
  }
};

// 設定を適用
const applySettings = async () => {
  const settings = normalizeSettings({
    enabled: styleToggle.checked,
    fontFamily: getEffectiveFontFamily(),
    fontSize: Number.parseInt(fontSize.value, 10),
    fontWeight: fontWeight.value,
    lineHeight: Number.parseFloat(lineHeight.value),
    letterSpacing: Number.parseFloat(letterSpacing.value),
    customFontName: customFontName.value.trim(),
    selectedFontFamily: fontFamily.value, // UIの状態も保存
    preset: presetSelect.value,
    disabledHosts: getDisabledHosts(),
  });

  await saveSettings(settings);
  latestSettings = settings;
  updateUI(settings.enabled);

  // content scriptに設定を送信
  await sendMessageToTab({
    action: "applyStyle",
    settings: settings,
  });
};

// イベントリスナーの設定
const setupEventListeners = () => {
  // ON/OFFスイッチ
  styleToggle.addEventListener("change", applySettings);

  // サイト別設定
  siteDisabled.addEventListener("change", applySettings);

  // プリセット
  presetSelect.addEventListener("change", () => {
    applyPresetToControls(presetSelect.value);
    applySettings();
  });

  // フォントファミリー
  fontFamily.addEventListener("change", () => {
    markCustomPreset();
    updateCustomFontVisibility(fontFamily.value);
    applySettings();
  });

  // カスタムフォント名
  customFontName.addEventListener("input", () => {
    markCustomPreset();
    applySettings();
  });

  // フォントサイズ
  fontSize.addEventListener("input", () => {
    markCustomPreset();
    updateFontSizeDisplay(fontSize.value);
    applySettings();
  });

  // フォントウェイト
  fontWeight.addEventListener("change", () => {
    markCustomPreset();
    applySettings();
  });

  // 行間
  lineHeight.addEventListener("input", () => {
    markCustomPreset();
    updateLineHeightDisplay(lineHeight.value);
    applySettings();
  });

  // 文字間隔
  letterSpacing.addEventListener("input", () => {
    markCustomPreset();
    updateLetterSpacingDisplay(letterSpacing.value);
    applySettings();
  });
};

// 初期化
const init = async () => {
  currentHost = await getCurrentHost();
  const settings = await loadSettings();
  setupEventListeners();

  // 現在のタブの設定状態を確認
  if (settings.enabled) {
    await sendMessageToTab({
      action: "applyStyle",
      settings: settings,
    });
  }
};

// DOMContentLoadedイベントで初期化
document.addEventListener("DOMContentLoaded", init);
