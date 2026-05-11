# Style Changer - Chrome 拡張機能

> 訪問するすべての Web ページのフォント（種類・サイズ・太さ）を、自分好みの設定に自動で上書きします。

サイトごとにバラバラなフォントを、自分が読みやすい1つの設定に統一できます。設定はブラウザを閉じても保持され、次に開いたページにも即座に適用されます。

---

## 何をどう変えるか

content script が全ページに `* { font-family / font-size / font-weight !important }` を注入し、サイト側のスタイルを上書きします。

| 変更できるもの | 内容 |
|---|---|
| フォント種類 | 明朝・ゴシック・等幅など、またはPC にインストール済みの任意フォント |
| フォントサイズ | 10px〜36px |
| フォントウェイト | 100（細字）〜800（太字）の8段階 |

**上書きしない要素:**
- `code / pre` などコードブロック → monospace を維持
- `input / button / textarea` → サイズを2px小さく調整

**SPA対応:** MutationObserver でページの DOM 変化を検知し、React・Vue などのページ遷移後も設定を再適用します。

---

## 使い方

1. 拡張機能アイコンをクリックしてポップアップを開く
2. 「スタイル適用」スイッチを ON にする
3. フォント・サイズ・太さを調整 → 即座にページに反映

### カスタムフォントの指定

フォント選択で「カスタム」を選び、フォント名を直接入力します。

```
例: "Yu Gothic UI"
例: "Noto Sans JP", sans-serif
```

PC にインストール済みであれば任意のフォントが使用できます。

---

## インストール方法

1. Chrome で `chrome://extensions/` を開く
2. 右上の「デベロッパーモード」を ON にする
3. 「パッケージ化されていない拡張機能を読み込む」をクリック
4. このプロジェクトフォルダを選択

アイコン画像が必要な場合は `convert-icons.html` をブラウザで開き、各サイズ（16/32/48/128px）をダウンロードしてフォルダに配置してください。

---

## 技術仕様

| 項目 | 内容 |
|---|---|
| Manifest Version | 3 |
| スタイル適用 | content script から `<style>` 要素を `document.head` に挿入 |
| 設定の永続化 | `chrome.storage.local` |
| SPA対応 | MutationObserver で HEAD/BODY の追加を検知して再適用 |
| 言語 | HTML5 / CSS3 / Vanilla JavaScript (ES6+) |

---

## ファイル構成

```
change-favorite-style/
├── manifest.json      # Chrome拡張設定（MV3）
├── popup.html/css/js  # ポップアップUI・設定操作
├── content.js         # スタイル注入・MutationObserver
├── icon*.png          # 各サイズのアイコン
└── convert-icons.html # アイコン生成ツール（SVG→PNG変換）
```

---

MIT License
