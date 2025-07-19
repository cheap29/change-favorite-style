// DOM要素の取得
const styleToggle = document.getElementById("style-toggle");
const darkenToggle = document.getElementById("darken-toggle");
const statusText = document.getElementById("status-text");
const settingsSection = document.getElementById("settings-section");
const fontFamily = document.getElementById("font-family");
const fontSize = document.getElementById("font-size");
const fontSizeValue = document.getElementById("font-size-value");
const fontWeight = document.getElementById("font-weight");
const customFontContainer = document.getElementById("custom-font-container");
const customFontName = document.getElementById("custom-font-name");

// デフォルト設定
const defaultSettings = {
  enabled: false,
  darkenEnabled: false,
  fontFamily: "inherit",
  fontSize: 16,
  fontWeight: "normal",
  customFontName: "",
  selectedFontFamily: "inherit",
};

// 設定を読み込む
const loadSettings = async () => {
  try {
    const result = await chrome.storage.local.get(["styleSettings"]);
    const settings = result.styleSettings || defaultSettings;

    // UIに設定を反映
    styleToggle.checked = settings.enabled;
    darkenToggle.checked = settings.darkenEnabled;
    fontFamily.value = settings.selectedFontFamily || settings.fontFamily;
    fontSize.value = settings.fontSize;
    fontWeight.value = settings.fontWeight;
    customFontName.value = settings.customFontName || "";

    updateUI(settings.enabled);
    updateFontSizeDisplay(settings.fontSize);
    updateCustomFontVisibility(
      settings.selectedFontFamily || settings.fontFamily
    );

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
  statusText.textContent = enabled ? "適用中" : "未適用";
  statusText.className = enabled ? "status-text active" : "status-text";
  settingsSection.className = enabled
    ? "settings-section enabled"
    : "settings-section";
};

// フォントサイズ表示を更新
const updateFontSizeDisplay = (size) => {
  fontSizeValue.textContent = `${size}px`;
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
    return customFontName.value.trim() || "inherit";
  }
  return fontFamily.value;
};

// アクティブタブにメッセージを送信
const sendMessageToTab = async (message) => {
  try {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });

    if (!tab || !tab.id) {
      console.log("アクティブなタブが見つかりません");
      return;
    }

    // chrome:// や extension:// などの特殊なページではスキップ
    if (
      tab.url &&
      (tab.url.startsWith("chrome://") ||
        tab.url.startsWith("chrome-extension://") ||
        tab.url.startsWith("edge://") ||
        tab.url.startsWith("about:"))
    ) {
      console.log(
        "この種類のページではスタイル変更はサポートされていません:",
        tab.url
      );
      return;
    }

    try {
      // メッセージを送信
      await chrome.tabs.sendMessage(tab.id, message);
      console.log("メッセージを送信しました:", message);
    } catch (messageError) {
      // content script が存在しない場合は手動で注入
      if (messageError.message.includes("Could not establish connection")) {
        console.log("content scriptを注入します...");

        try {
          // content script を注入
          await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ["content.js"],
          });

          // 少し待ってから再度メッセージを送信
          setTimeout(async () => {
            try {
              await chrome.tabs.sendMessage(tab.id, message);
              console.log("注入後にメッセージを送信しました:", message);
            } catch (retryError) {
              console.error("再送信も失敗しました:", retryError);
            }
          }, 100);
        } catch (injectError) {
          console.error("content scriptの注入に失敗しました:", injectError);
        }
      } else {
        throw messageError;
      }
    }
  } catch (error) {
    console.error("タブへのメッセージ送信に失敗しました:", error);
  }
};

// 設定を適用
const applySettings = async () => {
  const settings = {
    enabled: styleToggle.checked,
    darkenEnabled: darkenToggle.checked,
    fontFamily: getEffectiveFontFamily(),
    fontSize: parseInt(fontSize.value),
    fontWeight: fontWeight.value,
    customFontName: customFontName.value.trim(),
    selectedFontFamily: fontFamily.value, // UIの状態も保存
  };

  await saveSettings(settings);
  updateUI(settings.enabled);

  // content scriptに設定を送信
  await sendMessageToTab({
    action: "applyStyle",
    settings: settings,
  });
};

// 背景を暗くする設定を即座に適用
const applyDarkenSettings = async () => {
  // 現在のUI状態から設定を作成
  const updatedSettings = {
    enabled: styleToggle.checked,
    darkenEnabled: darkenToggle.checked,
    fontFamily: getEffectiveFontFamily(),
    fontSize: parseInt(fontSize.value),
    fontWeight: fontWeight.value,
    customFontName: customFontName.value.trim(),
    selectedFontFamily: fontFamily.value,
  };

  await saveSettings(updatedSettings);

  // content scriptに背景設定を送信（即座に反映）
  await sendMessageToTab({
    action: "applyDarkenStyle",
    settings: updatedSettings,
  });
};

// イベントリスナーの設定
const setupEventListeners = () => {
  // ON/OFFスイッチ
  styleToggle.addEventListener("change", applySettings);

  // 背景を暗くするスイッチ（即座に反映）
  darkenToggle.addEventListener("change", applyDarkenSettings);

  // フォントファミリー
  fontFamily.addEventListener("change", () => {
    updateCustomFontVisibility(fontFamily.value);
    applySettings();
  });

  // カスタムフォント名
  customFontName.addEventListener("input", applySettings);

  // フォントサイズ
  fontSize.addEventListener("input", () => {
    updateFontSizeDisplay(fontSize.value);
  });

  fontSize.addEventListener("change", applySettings);

  // フォントウェイト
  fontWeight.addEventListener("change", applySettings);
};

// 初期化
const init = async () => {
  await loadSettings();
  setupEventListeners();

  // 現在のタブの設定状態を確認
  const settings = await loadSettings();
  if (settings.enabled) {
    await sendMessageToTab({
      action: "applyStyle",
      settings: settings,
    });
  }
};

// DOMContentLoadedイベントで初期化
document.addEventListener("DOMContentLoaded", init);
