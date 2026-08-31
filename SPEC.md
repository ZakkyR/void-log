# 虚無ログ（void-log）SPEC

## 1. 目的

YouTube Shorts の視聴時間とスライド（次の動画へ送った）回数を自動計測し、日 / 週 / 月 / 累計で可視化する。
数値を X および Discord へ手動で投稿し、「懺悔ログ」として外部に残すことを主目的とする。

視聴を**ブロックする機能は持たない**（可視化と自己申告のみ）。

将来的に TikTok および X のおすすめタブも同じ枠組みで計測できるよう、**計測対象をプラットフォーム単位で差し替えられる構造**とする（v0.1 の実装対象は YouTube Shorts のみ）。

## 2. 名称・対象環境

| 項目 | 内容 |
|---|---|
| 表示名（日本語） | 虚無ログ |
| プロジェクト名 / リポジトリ名 | `void-log` |
| Firefox 拡張 ID | `void-log@zakkyr.dev` |

### 動作環境

| 項目 | 内容 |
|---|---|
| ブラウザ | Google Chrome（最新安定版）、Mozilla Firefox（最低 115） |
| Manifest | Manifest V3（単一ソースから両ブラウザ向けにビルド） |
| 計測対象（v0.1） | `https://www.youtube.com/shorts/*` |
| 計測対象（将来） | TikTok（`https://www.tiktok.com/*` のフィード）、X のおすすめタブ（`https://x.com/home` の For You） |
| 想定利用者 | 開発者本人のみ（ストア公開は当面しない前提。ただし公開可能な作りにしておく） |

## 3. 用語定義

| 用語 | 定義 |
|---|---|
| プラットフォーム | 計測対象サービスの単位。`youtube_shorts` / `tiktok` / `x_for_you` |
| アイテム | 計測対象の 1 コンテンツ（Shorts 1 本、TikTok 1 本、X の投稿 1 件） |
| 視聴時間 | 「タブが可視」かつ「ウィンドウがフォーカス」かつ「対象ページを表示中」の実時間の累計（秒） |
| スライド回数 | 表示中のアイテムが別のアイテムに切り替わった回数。上方向（戻る）も 1 回としてカウント |
| 集計日 | ローカルタイムでの日付。日付境界は既定 00:00、設定で 0〜6 時にオフセット可能 |
| 週 | 月曜始まり（ISO 8601）。設定で日曜始まりに変更可能 |

## 4. 機能要件

### FR-1 視聴時間の計測
- `/shorts/` 配下にいる間のみ計測する。ホームのフィード内で自動再生される Shorts、埋め込みプレイヤーは対象外。
- 以下がすべて真のときのみ秒数を加算する。
  - `document.visibilityState === "visible"`
  - ウィンドウがフォーカスされている（`blur` / `focus` を監視）
  - `video.paused === false` かつ `video.readyState >= 2`
- 計測は 1 秒間隔の tick で行い、実時間ドリフトを避けるため `performance.now()` の差分で加算する。
- 複数タブで同時に対象ページを開いている場合、上記条件を満たすタブは実質 1 つに限られるため二重計上は発生しない。ただし念のため background 側で「最後に加算したタブ ID と時刻」を保持し、同一秒の重複加算を弾く。
- ブラウザが起動していない時間は当然計測されない。この仕様は許容とし、集計値は「ブラウザ上で計測できた範囲の下限値」と位置づける。

### FR-2 スライド回数の計測
- アクティブな Short は `ytd-reel-video-renderer[is-active]` から取得する。取得できない場合は `location.pathname` の videoId をフォールバックとする。
- アイテム ID が変化したときに +1。ただし以下はカウントしない。
  - 対象ページに**入った最初の 1 本**（0 スライドで開始する）
  - 同一動画のループ再生
  - ページリロード直後の初期表示
- YouTube の DOM 変更に備え、セレクタは 1 箇所（`selectors.ts` 等）に定数として集約する。

### FR-3 集計
- 日 / 週 / 月 / 累計の 4 単位で「視聴時間」「スライド回数」「視聴したアイテム数（ユニーク ID 数）」を提示する。
- 集計はプラットフォーム別に保持し、UI では「合計」と「プラットフォーム別内訳」の両方を出せるようにする（v0.1 は内訳が 1 件のみ）。
- 日別レコードのみを永続化し、週 / 月 / 累計は読み出し時に集計する（事前集計テーブルは持たない）。

### FR-4 ポップアップ UI
- 起動時に「今日 / 今週 / 今月 / 累計」のカード 4 枚を表示。
- 直近 30 日の日別視聴時間を簡易バーチャートで表示（外部ライブラリ不使用、CSS + div で可）。
- ボタン構成
  - **「懺悔する（X）」** … FR-5
  - **「懺悔する（Discord）」** … FR-6
  - 「CSV エクスポート」… FR-9
  - 「設定」… FR-10
- 表示形式は `1時間23分45秒` のような日本語表記。
- 投稿対象期間（今日 / 今週 / 今月 / 累計）はポップアップ上のセレクタで選択し、その値が投稿本文に反映される。

### FR-5 X への投稿（懺悔する）
- **intent URL 方式**（API キー・OAuth 不使用）。
- `https://x.com/intent/post?text={URLエンコード済み本文}` を `browser.tabs.create()` で新規タブに開き、ユーザーが投稿ボタンを押して確定する。
- 本文は投稿テンプレート（FR-8）から生成し、280 文字を超える場合は末尾を切り詰めたうえで警告を出す。

### FR-6 Discord への投稿（懺悔する）
- Discord Webhook URL への `POST`。**必ず background（service worker / event page）から送信する**（content script からは CORS で失敗するため）。
- ペイロードは `embeds` 形式（タイトル、集計単位、各指標を fields に格納）。`content` のみのプレーンテキスト形式も設定で選択可能とする。
- 成功判定は HTTP 204。失敗時はポップアップ上にエラーを表示する。
- Webhook URL は `storage.local` に保存し、`storage.sync` には**保存しない**。設定画面ではマスク表示とする。

### FR-7 投稿トリガー（手動のみ）
- 投稿はポップアップの「懺悔する」ボタン押下時のみ実行する。
- **定時自動投稿は実装しない。** ブラウザが起動していない時間は計測できず、自動投稿された数値が実態の下限値でしかないため、投稿タイミングは利用者の意思に委ねる。
- このため `alarms` / `notifications` 権限は不要。将来しきい値通知などを追加する場合に改めて検討する。

### FR-8 投稿テンプレート
- 設定画面で自由編集可能。以下のプレースホルダを展開する。

| プレースホルダ | 内容 |
|---|---|
| `{period}` | 「今日」「今週」「今月」「累計」などポップアップの投稿対象期間セレクタのラベル |
| `{date}` | 「8/30」など当日の日付（月/日、0埋めなし） |
| `{duration}` | 1時間23分45秒 |
| `{minutes}` | 83（整数分） |
| `{slides}` | 412 |
| `{items}` | 268（ユニークアイテム数） |
| `{avgPerItem}` | 1本あたりの平均視聴秒数 |
| `{total_duration}` | 累計視聴時間 |
| `{breakdown}` | プラットフォーム別内訳（将来用。v0.1 では 1 行のみ） |
| `{name_line}` | 設定画面の表示名から生成する一人称の一文。表示名が設定されていれば「私、{表示名}は以下の虚無な時間を過ごしてしまいました。」、未設定なら「私は以下の虚無な時間を過ごしてしまいました。」 |

既定テンプレート（X 用）:

```
{name_line}
【懺悔】本日 ({date}) のショート視聴
視聴時間: {duration}
スライド回数: {slides}回
累計: {total_duration}
#ショート懺悔
```

既定テンプレート（Discord・プレーンテキスト形式用）:

```
{name_line}
【懺悔】本日 ({date}) のショート視聴
視聴時間: {duration}
スライド回数: {slides}回
視聴本数: {items}本
累計視聴時間: {total_duration}
```

Discord の埋め込み形式（既定の投稿形式）では、タイトルを `【懺悔】本日 ({date}) のショート視聴`、
description を `{name_line}` の内容とし、X 用テンプレートと見た目を揃える。

### FR-9 CSV エクスポート
- 期間指定（全期間 / 直近30日 / 年月指定）でダウンロード。
- Excel での文字化けを避けるため **UTF-8 BOM 付き**、改行 CRLF。
- カラム: `date,weekday,platform,seconds,duration_hhmmss,slides,unique_items`
- プラットフォーム別に 1 行ずつ出力する（v0.1 は 1 日 1 行）。
- 生成した Blob を `URL.createObjectURL` → `browser.downloads.download()` で保存。ファイル名は `void-log_YYYYMMDD-YYYYMMDD.csv`。
- 併せて JSON 形式のフルバックアップ出力・取り込みも用意する（拡張機能の再インストール対策）。

### FR-10 設定画面（options page）
- 日付境界オフセット、週の開始曜日
- 表示名（任意。投稿テンプレートの `{name_line}` に使用）
- Discord Webhook URL、投稿形式
- 投稿テンプレート（X 用 / Discord 用を個別に）
- 計測対象プラットフォームの ON/OFF（v0.1 は YouTube Shorts のみ表示）
- 全データ削除（確認ダイアログ付き）

## 5. 非機能要件

- **プライバシー**: 視聴したアイテムのタイトル・URL など個別コンテンツ情報は保存しない。保存するのは日別の集計値と、当日のユニーク数算出用のハッシュ済み ID セット（日付が変わったら破棄）のみ。外部送信はユーザーが明示的に設定した Discord Webhook と X の intent タブに限る。
- **性能**: content script の常駐処理は 1 秒間隔の tick と MutationObserver 1 個まで。対象ページ以外では計測ループを停止する。
- **データ量**: 1 日・1 プラットフォームあたり約 60 byte。10 年・3 プラットフォームでも 1MB 未満で `storage.local` の制限内。
- **耐障害性**: 計測中の秒数は 5 秒ごとに `storage.local` へフラッシュする。ブラウザのクラッシュ時の損失は最大 5 秒。

## 6. 技術設計方針

### 6.1 構成

```
content script（プラットフォーム別アダプタ）
  └ 計測・スライド検知 → 5秒ごとに runtime.sendMessage
background (service worker / event page)
  └ storage 更新、Discord 送信、CSV 生成
popup / options
  └ storage から読み出して表示・設定
```

- 状態は background のメモリに置かない（MV3 の service worker は数十秒で終了するため）。永続化はすべて `storage.local`。
- API 呼び出しは [webextension-polyfill](https://github.com/mozilla/webextension-polyfill) 経由で `browser.*` に統一する。
- ビルドは **WXT** を推奨（`wxt build -b chrome` / `-b firefox` で両対応の成果物を生成できる）。使わない場合は manifest を 2 種類用意し、共通ソースをコピーするスクリプトを組む。

### 6.2 プラットフォームアダプタ（拡張性の要）

計測ロジックの本体は共通化し、サイト固有部分だけをアダプタとして切り出す。

```ts
interface PlatformAdapter {
  id: "youtube_shorts" | "tiktok" | "x_for_you";
  label: string;                       // 表示名
  matches: string[];                   // content_scripts の matches
  isActivePage(): boolean;             // 今このURL/タブ状態が計測対象か
  getCurrentItemId(): string | null;   // 現在のアイテム識別子
  isPlaying(): boolean;                // 再生中か（動画を持たない場合は isActivePage と同義）
  subscribeNavigation(cb: () => void): () => void; // SPA遷移の購読・解除
}
```

- 共通エンジンは「tick で秒数加算」「`getCurrentItemId()` の変化でスライド +1」だけを行い、サイト固有の DOM 知識を持たない。
- v0.1 では `youtubeShortsAdapter` のみ実装し、アダプタ配列に追加するだけで対象を増やせる状態にしておく。
- 想定される将来アダプタの論点（実装時に再検討）
  - **TikTok**: Web 版のフィードは動画要素を持つため YouTube と同型で実装できる見込み。ログイン必須である点に注意。
  - **X のおすすめタブ**: 動画ではなくタイムラインのため、「再生中」の概念がない。視聴時間は「For You タブが選択された状態で表示中の時間」、スライド回数は「スクロールで通過した投稿数」に読み替える。指標の意味が変わるため、UI 上でラベルを出し分けられるようにしておく。

### 6.3 manifest.json（骨子）

```jsonc
{
  "manifest_version": 3,
  "name": "虚無ログ",
  "version": "0.1.0",
  "permissions": ["storage", "downloads"],
  "host_permissions": [
    "*://www.youtube.com/*",
    "https://discord.com/api/webhooks/*"
  ],
  "background": {
    // Chrome は service_worker を、Firefox は scripts を採用する。両方併記して1ファイルで共用する
    "service_worker": "background.js",
    "scripts": ["background.js"]
  },
  "content_scripts": [
    {
      "matches": ["*://www.youtube.com/*"],
      "js": ["content.js"],
      "run_at": "document_idle"
    }
  ],
  "action": { "default_popup": "popup.html" },
  "options_ui": { "page": "options.html", "open_in_tab": true },
  "browser_specific_settings": {
    "gecko": { "id": "void-log@zakkyr.dev", "strict_min_version": "115.0" }
  }
}
```

将来 TikTok / X を追加する際は `host_permissions` と `content_scripts.matches` に追記する。Chrome / Firefox いずれも権限追加は再許可を伴うため、`optional_host_permissions` にして設定画面から個別に許可を求める方式も検討する。

### 6.4 データモデル（storage.local）

```jsonc
{
  "schemaVersion": 1,
  "settings": {
    "dayBoundaryHour": 0,
    "weekStart": "monday",
    "displayName": "",
    "discordWebhookUrl": "",
    "discordFormat": "embed",
    "enabledPlatforms": ["youtube_shorts"],
    "templates": { "x": "...", "discord": "..." }
  },
  "daily": {
    // 日付 → プラットフォーム → 指標
    "2026-08-30": {
      "youtube_shorts": { "seconds": 4235, "slides": 412, "items": 268 }
    }
  },
  "runtime": {
    "todayItemIds": { "youtube_shorts": ["<hash>", "..."] }  // 日付が変わったらクリア
  }
}
```

プラットフォーム階層は v0.1 の時点から入れておく（後からのマイグレーションを避けるため）。`schemaVersion` を持たせ、将来の構造変更時に移行処理を書けるようにする。

### 6.5 SPA 遷移の検知（YouTube Shorts）

- `document.addEventListener("yt-navigate-finish", handler)` を主軸にする。
- 補助として `history.pushState` / `replaceState` のラップ、`popstate`、`ytd-reel-video-renderer` を対象とした MutationObserver を併用する。YouTube 側の実装変更に備え、いずれか 1 つが機能すれば計測が継続する構成にする。
- `/shorts/` から離脱したら計測ループを停止し、蓄積分をフラッシュする。

### 6.6 ブラウザ差分の注意点

- **Firefox の MV3 では `host_permissions` がインストール時に自動付与されない。** ユーザーがアドオン管理画面で権限を許可する必要があるため、初回起動時に案内を出す。`permissions.contains()` で状態を確認できる。
- Firefox は background に service worker を採用していない（event page）。トップレベルでリスナーを登録し、非同期処理の中でリスナーを追加しないこと。
- Firefox 版の常用インストールには AMO での署名が必要。Chrome は開発者モードで unpacked のまま使用可能。

## 7. 決定事項 / 保留事項

**決定済み**
- X は intent URL 方式（API 連携はしない）
- 定時自動投稿は実装しない。投稿は「懺悔する」ボタンによる手動のみ
- CSV エクスポートを標準機能として持つ
- データはローカル保存のみ、`storage.sync` は使わない
- 計測対象はプラットフォーム単位で追加できる構造とし、v0.1 は YouTube Shorts のみ実装する

**保留（実装時に判断）**
- 「戻る」方向のスワイプを別カウントとして分けて記録するか
- X のおすすめタブにおける「スライド回数」の定義（通過投稿数 / スクロール距離）
- しきい値超過時の通知を後日追加するか（追加時のみ `notifications` 権限が必要）
- Chrome / Firefox 間でのデータ統合（現状は JSON エクスポート/インポートによる手動マージで対応）

## 8. 受け入れ基準

1. Shorts を 3 本連続で視聴すると、スライド回数が 2 になる。
2. 動画を一時停止した状態、別タブに切り替えた状態では視聴時間が加算されない。
3. 同じ Short をループ再生してもスライド回数が増えない。
4. ブラウザを再起動しても当日の集計値が保持されている。
5. ポップアップの「今週」が、日別レコードの月曜〜日曜の合計と一致する。
6. 「懺悔する（Discord）」を押すと、指定チャンネルに埋め込みメッセージが届く。
7. 「懺悔する（X）」を押すと、本文が入力済みの投稿画面が新規タブで開く。
8. CSV を Excel で開いても文字化けしない。
9. アダプタを 1 つ追加するだけで新しいプラットフォームの計測が始められる（ダミーアダプタで確認）。
10. Chrome / Firefox の双方で 1〜9 が同一に動作する。

## 9. 参考

- MDN: `manifest.json` background キー（Chrome と Firefox の実装差）
- Firefox Extension Workshop: Manifest V3 migration guide
- Discord Developer Docs: Webhook Resource（成功時 204）
- X Docs: Web Intents（API 認証不要）
