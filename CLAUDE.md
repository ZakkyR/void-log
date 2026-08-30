# void-log（虚無ログ）— CLAUDE.md

このファイルはこのリポジトリで作業する Claude Code 向けの開発ガイドです。
仕様の一次情報は **[SPEC.md](./SPEC.md)** にあります。実装判断で SPEC.md と矛盾する場合は SPEC.md を優先し、
SPEC.md 側の更新が必要と気づいたら先にその旨を確認してください。

## 1. プロジェクト概要

YouTube Shorts（将来 TikTok / X おすすめタブ）の視聴時間とスライド回数を自動計測し、
日 / 週 / 月 / 累計で可視化するブラウザ拡張。視聴をブロックする機能は持たず、
可視化と「懺悔ログ」としての手動 SNS 投稿（X intent URL / Discord Webhook）が主目的。

- 個人利用が前提（ストア公開はしない想定だが、公開可能な品質は維持する）
- Chrome（最新安定版）と Firefox（115+）を Manifest V3 単一ソースで両対応

## 2. 技術スタック

| 領域 | 選定 | 補足 |
|---|---|---|
| 言語 | TypeScript | strict モード |
| ビルド | [WXT](https://wxt.dev/) | `wxt build -b chrome` / `-b firefox` で両対応成果物を生成 |
| パッケージマネージャー | pnpm | `pnpm install` / `pnpm dev` / `pnpm build` |
| UI (popup / options) | Vanilla TypeScript + DOM API | 外部 UI フレームワーク不使用（SPEC の「外部ライブラリ不使用」方針に合わせる）。小規模 UI のため素の DOM 操作で十分 |
| browser API | [webextension-polyfill](https://github.com/mozilla/webextension-polyfill) | `browser.*` に統一し、Chrome/Firefox の API 差異を吸収する |
| テスト | Vitest | 集計ロジック・テンプレート展開・ストレージ操作など DOM に依存しない部分を単体テスト対象とする |

## 3. アーキテクチャ

SPEC.md 6章の設計方針に従う。責務は以下の 3 層に分離する。

```
content script（プラットフォーム別アダプタ経由）
  └ 計測・スライド検知 → 5秒ごとに runtime.sendMessage
background (service worker / event page)
  └ storage 更新、Discord 送信、CSV/JSON 生成
popup / options
  └ storage から読み出して表示・設定変更
```

### プラットフォームアダプタパターン（拡張性の要）

計測の共通エンジン（tick 加算、アイテム ID 変化検知）はプラットフォーム非依存で実装し、
サイト固有の DOM 知識は `PlatformAdapter` インターフェース（SPEC.md 6.2）の実装に閉じ込める。
新しいプラットフォームを追加するときは、既存の共通エンジンやメッセージング層を変更せず、
アダプタを 1 つ追加してアダプタ配列に登録するだけで済む状態を常に保つこと。

### ディレクトリ構成（WXT 規約に準拠）

```
entrypoints/
  background.ts          # storage 更新・Discord送信・CSV/JSON生成のディスパッチ
  content.ts              # PlatformAdapter を選択し共通計測エンジンを起動
  popup/
    index.html
    main.ts
  options/
    index.html
    main.ts
lib/
  adapters/
    types.ts              # PlatformAdapter インターフェース
    youtubeShorts.ts
    selectors.ts           # YouTube Shorts の DOM セレクタをここに集約（FR-2）
  engine/                  # プラットフォーム非依存の計測エンジン（tick加算・スライド検知）
  aggregation.ts           # 日次レコード→週/月/累計の読み出し時集計（FR-3）
  storage.ts               # storage.local の読み書き・schemaVersion マイグレーション
  template.ts               # 投稿テンプレートのプレースホルダ展開（FR-8）
  csv.ts                    # CSV/JSON エクスポート・インポート（FR-9）
  time.ts                    # 日付境界オフセット・週開始曜日を踏まえた集計日計算
tests/
  *.test.ts                 # Vitest。lib/ 配下のロジックを中心に単体テスト
wxt.config.ts
```

## 4. 開発フロー

```
pnpm install         # 依存関係インストール
pnpm dev             # Chrome 向け開発ビルド（HMR）
pnpm dev:firefox     # Firefox 向け開発ビルド
pnpm build           # Chrome 向け本番ビルド
pnpm build:firefox   # Firefox 向け本番ビルド
pnpm test            # Vitest 単体テスト
pnpm typecheck       # tsc --noEmit
```

（`package.json` の scripts は WXT セットアップ時に上記に合わせて定義する）

- ロジック（集計・テンプレート展開・ストレージ・CSV生成）は Vitest でテストしてから実装を進める。
  DOM/YouTube 依存のアダプタ部分は自動テストが困難なため、`PlatformAdapter` インターフェースの
  背後にモック実装を用意して共通エンジン側をテストする方針とする。
- 実ブラウザでの動作確認（Shorts 3本連続視聴でスライド2回になる、など SPEC.md 8章の受け入れ基準）は
  手動確認が必須。自動テストで代替できない項目として扱う。

## 5. 設計上の制約・決定事項（要点）

詳細は SPEC.md を参照。実装中に迷ったら以下を優先する。

- **ブロック機能は絶対に実装しない。** 可視化と自己申告が目的であり、視聴を止める機能を足さない。
- **定時自動投稿は実装しない。** 投稿は popup の「懺悔する」ボタン押下時のみ。`alarms` / `notifications` 権限は追加しない。
- **状態は background のメモリに保持しない。** MV3 service worker は途中で終了するため、永続化は必ず `storage.local`。
- **プライバシー**: 視聴コンテンツのタイトル・URL 等は保存しない。保存対象は日別集計値と、当日のユニーク数算出用ハッシュ済み ID セット（日付が変わったら破棄）のみ。
- **Discord Webhook 送信は必ず background から行う**（content script からは CORS で失敗する）。Webhook URL は `storage.local` のみに保存し、`storage.sync` には保存しない。
- **セレクタは `lib/adapters/selectors.ts` に集約**し、YouTube の DOM 変更への耐性を 1 箇所の修正で確保できるようにする。
- **日別レコードのみ永続化**し、週/月/累計は読み出し時に集計する（事前集計テーブルを持たない）。
- **CSV は UTF-8 BOM付き・CRLF改行**（Excel 文字化け対策）。

## 6. Firefox / Chrome 差分の注意点

- Firefox の MV3 では `host_permissions` がインストール時に自動付与されない。初回起動時に権限許可の案内 UI を出す。
- Firefox は service worker ではなく event page。トップレベルでリスナー登録すること（非同期処理内で登録しない）。
- 両ブラウザで同一の受け入れ基準（SPEC.md 8章）を満たすことをリリース前に確認する。

## 7. 保留事項（実装時に都度相談）

SPEC.md 7章に記載の以下は未決定。実装が必要になった時点でユーザーに確認すること。

- 「戻る」方向スワイプを別カウントにするか
- X おすすめタブの「スライド回数」の定義
- しきい値通知の要否（追加時のみ `notifications` 権限が必要）
- Chrome/Firefox 間のデータ統合方法（現状は JSON エクスポート/インポートの手動マージ）
