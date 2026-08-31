# 虚無ログ（void-log）

YouTube Shorts の視聴時間とスライド（次の動画へ送った）回数を自動計測し、日 / 週 / 月 / 累計で可視化するブラウザ拡張です。

- Chrome（最新安定版）と Firefox（140+）を Manifest V3 単一ソースで両対応
- 詳細な仕様は [SPEC.md](./SPEC.md) を参照してください

## 主な機能

- YouTube Shorts (`/shorts/*`) の視聴時間・スライド回数を自動計測
- ポップアップで 今日 / 今週 / 今月 / 累計 のサマリーと直近30日のバーチャートを表示
- 「懺悔する」ボタンから X（intent URL）/ Discord（Webhook）へ手動投稿
  - 投稿本文はプレースホルダ付きテンプレートで自由にカスタマイズ可能
- CSV エクスポート（Excel 向け UTF-8 BOM 付き）、JSON フルバックアップの出力・取り込み

## 技術スタック

| 領域 | 選定 |
|---|---|
| 言語 | TypeScript（strict） |
| ビルド | [WXT](https://wxt.dev/) |
| パッケージマネージャー | pnpm |
| browser API | [webextension-polyfill](https://github.com/mozilla/webextension-polyfill)（`browser.*`） |
| テスト | Vitest |

## セットアップ

```bash
pnpm install
```

## 開発

```bash
pnpm dev             # Chrome 向け開発ビルド（HMR）
pnpm dev:firefox     # Firefox 向け開発ビルド
```

`wxt` が起動時に開発用ビルドを `.output/` に出力します。詳細な拡張機能の読み込み手順は「拡張機能を読み込む」を参照してください。

## ビルド

```bash
pnpm build           # Chrome 向け本番ビルド → .output/chrome-mv3/
pnpm build:firefox   # Firefox 向け本番ビルド → .output/firefox-mv3/
```

## テスト・型チェック

```bash
pnpm test            # Vitest 単体テスト
pnpm test:watch      # Vitest（watch モード）
pnpm typecheck       # tsc --noEmit
```

## 拡張機能を読み込む

### Chrome

1. [Releases](https://github.com/ZakkyR/void-log/releases) から最新の `void-log-<version>-chrome.zip` をダウンロードして解凍
   （自分でビルドする場合は `pnpm build` を実行し `.output/chrome-mv3/` を使う）
2. `chrome://extensions` を開き、「デベロッパーモード」を有効化
3. 「パッケージ化されていない拡張機能を読み込む」から解凍したフォルダ（または `.output/chrome-mv3/`）を選択

### Firefox

1. [Releases](https://github.com/ZakkyR/void-log/releases) から最新の `void-log-<version>-firefox-signed.xpi` をダウンロード
2. Firefox でそのファイルを開く（ドラッグ＆ドロップ、または「ファイルを開く」）
3. 表示される権限確認ダイアログで「追加」を選択

Mozilla Add-ons（AMO）にunlisted（自己配布）として署名済みのため、恒久的にインストールされます。

開発中のビルドを試したい場合は、代わりに以下の手順で一時的に読み込めます（Firefox 再起動で消えます）。

1. `pnpm build:firefox` を実行
2. `about:debugging#/runtime/this-firefox` を開く
3. 「一時的なアドオンを読み込む」から `.output/firefox-mv3/manifest.json` を選択

Firefox の MV3 では `host_permissions` がインストール時に自動付与されないため、初回起動時にポップアップまたは設定画面で権限許可の案内が表示されます。

## ディレクトリ構成

```
entrypoints/
  background.ts     # storage 更新・Discord送信のディスパッチ
  content.ts         # PlatformAdapter を選択し計測エンジンを起動
  popup/              # ポップアップ UI（サマリー・投稿・エクスポート）
  options/            # 設定画面（表示名・テンプレート・Discord Webhook 等）
lib/
  adapters/           # プラットフォーム別アダプタ（YouTube Shorts 等）
  engine/             # プラットフォーム非依存の計測エンジン
  aggregation.ts      # 日次レコード→週/月/累計の集計
  storage.ts          # storage.local の読み書き
  template.ts         # 投稿テンプレートのプレースホルダ展開
  csv.ts              # CSV/JSON エクスポート・インポート
  time.ts             # 日付境界・週開始曜日を踏まえた日付計算
tests/                # Vitest 単体テスト
```

新しいプラットフォームを追加する際は、`lib/adapters/types.ts` の `PlatformAdapter` インターフェースを実装し、アダプタ配列に登録するだけで済むように設計されています。

## プライバシー

視聴コンテンツのタイトル・URL 等は保存しません。保存対象は日別の集計値（秒数・スライド回数・ユニーク視聴数）のみで、Discord Webhook URL を含む設定は `storage.local` にのみ保存され、`storage.sync` には保存されません。

## ライセンス

[MIT](./LICENSE)
