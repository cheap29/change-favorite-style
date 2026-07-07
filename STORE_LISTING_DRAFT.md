# Chrome Web Store Listing Draft

## Extension Name

Style Changer

## Short Description

Webページの文字を、読みやすいフォント・サイズ・太さにすばやく変更できます。

## Detailed Description

Style Changer は、Webサイトごとに異なる文字スタイルを、自分にとって読みやすい表示へ近づけるための Chrome 拡張機能です。

拡張機能アイコンからポップアップを開き、フォント、文字サイズ、太さを選ぶだけで、現在のページにスタイルを適用できます。設定はブラウザに保存され、次に開くページにも反映されます。

主な機能:

- フォント種類の変更
- カスタムフォント名の指定
- 文字サイズの調整
- 文字の太さの調整
- 行間の調整
- 文字間隔の調整
- 読みやすさプリセット
- ON/OFF のすばやい切り替え
- サイト別の無効化
- 設定のローカル保存

この拡張機能は、閲覧履歴、ページ本文、フォーム入力、個人情報を収集または送信しません。表示設定と、ユーザーが無効化したサイトのホスト名のみをブラウザ内に保存します。

## Permission Justification

`storage`:
フォント、文字サイズ、太さ、行間、文字間隔、ON/OFF状態、サイト別無効化設定をユーザーのブラウザ内に保存するために使用します。

`activeTab`:
ユーザーがポップアップを開いた現在のタブへ設定をすぐ反映し、そのサイトを無効化対象にするか判定するために使用します。

`scripting`:
拡張機能の読み込み前から開いていたページにも、ページをリロードせずにフォント設定を適用するために使用します。

`<all_urls>`:
ユーザーが開くさまざまなWebサイトで、同じ読みやすさ設定を自動的に適用するために使用します。ページ内容の収集や外部送信には使用しません。

## Privacy Practices

Recommended disclosure:

- Personally identifiable information: Not collected
- Health information: Not collected
- Financial and payment information: Not collected
- Authentication information: Not collected
- Personal communications: Not collected
- Location: Not collected
- Web history: Not collected
- User activity: Not collected
- Website content: Not collected

## Screenshot Plan

- Popup with style disabled
- Popup with style enabled and selected settings
- Popup showing readability presets
- Popup showing per-site disable switch
- Before/after comparison on a normal article page
- Example using larger text and bolder font

## Wording To Avoid

- Claims that the extension treats or cures a medical condition
- Claims that every website will remain visually perfect after applying styles
- Broad claims about accessibility compliance unless separately audited
