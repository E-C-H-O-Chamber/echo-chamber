# Technology Stack - E.C.H.O. Chamber

## アーキテクチャ概要

E.C.H.O. Chamberは、Cloudflare Workers プラットフォーム上に構築されたサーバーレス・エッジコンピューティング・アプリケーションです。Durable Objectsを中核とした永続性のある自律型システムとして設計されています。

## フロントエンド技術

### UI フレームワーク

- **Hono JSX**: `hono/jsx` - サーバーサイドレンダリング対応の軽量JSXランタイム
- **React-like Components**: Functional componentパターンによるUI構築

### スタイリング

- **Component-based CSS**: 各コンポーネント内でのスタイル定義
- **Responsive Design**: モバイル・デスクトップ両対応

## バックエンド・ランタイム技術

### コアプラットフォーム

- **Cloudflare Workers**: V8 isolates上でのJavaScript実行環境
- **Workerd Runtime**: Cloudflare独自のワーカーランタイム環境
- **Edge Computing**: 300+都市での分散実行

### アプリケーションフレームワーク

- **Hono**: `^4.7.11` - 高パフォーマンスなWeb API フレームワーク
  - ルーティング、ミドルウェア、コンテキスト管理
  - TypeScript ファーストの設計
  - Cloudflare Workers最適化

### 永続性・状態管理

- **Durable Objects**: `Echo` クラス - 強整合性を持つ永続オブジェクト
- **SQLite**: Durable Objects内での構造化データストレージ
- **KV Storage**: `ECHO_KV` - Key-Value分散ストレージ
- **Durable Object Storage**: アプリケーション状態の永続化

### 外部サービス統合

- **OpenAI API**: `^5.12.2`
  - GPT-5 モデルを使用
  - Function Calling サポート
  - Usage tracking と制限管理
  - Recursive function call 処理

- **Discord API**: `^0.38.16`, `@discordjs/rest ^2.5.1`, `@discordjs/builders ^1.11.2`
  - Bot API による Discord統合
  - リアルタイムメッセージ監視
  - 未読メッセージカウント機能

## プログラミング言語・ツール

### 言語

- **TypeScript**: `^5.5.2` - 静的型付けによる品質担保
- **JavaScript (ES2022)**: モジュールシステム (`"type": "module"`)

### バリデーション

- **Zod**: `^4.0.5` - ランタイム型安全性とスキーマバリデーション

## 開発環境・ツール

### パッケージマネージャ

- **pnpm**: 効率的な依存関係管理
- **Node.js**: `22.16.0` (Volta管理)

### ビルド・開発ツール

- **Wrangler**: `^4.26.0` - Cloudflare Workersデプロイメントツール
  - 型生成: `wrangler types`
  - 開発サーバー: `wrangler dev`
  - デプロイメント: `wrangler deploy`

### 品質管理ツール

#### ESLint設定

- **@eslint/js**: `^9.29.0`
- **@typescript-eslint/eslint-plugin**: `^8.34.0`
- **@typescript-eslint/parser**: `^8.34.0`
- **eslint-config-prettier**: `^10.1.5` - Prettierとの競合回避
- **eslint-plugin-import**: `^2.31.0` - import文の品質管理

#### Prettier設定

- **Prettier**: `^3.5.3` - コードフォーマッティング
- 対象: `"**/*.{js,ts,jsx,tsx,json,md}"`

#### TypeScript設定

- **Target**: `es2021`
- **Module**: `es2022` with `bundler` resolution
- **JSX**: `react-jsx` with `hono/jsx` import source
- **Strict Mode**: 全ての厳密チェック有効
- **noUncheckedIndexedAccess**: `true` - 配列アクセス安全性
- **isolatedModules**: `true` - バンドラー対応

## テスティング・アーキテクチャ

### テストフレームワーク

- **Vitest**: `^3.2.4` - 高速で現代的なテストランナー
- **@vitest/ui**: `^3.2.4` - インタラクティブテストUI
- **@vitest/coverage-v8**: `3.2.4` / **@vitest/coverage-istanbul**: `3.2.4`

### Cloudflare Workers特化テスト

- **@cloudflare/vitest-pool-workers**: `^0.8.57`
  - 実際の `workerd` ランタイムでのテスト実行
  - Durable Objects の分離テスト環境
  - KV ストレージの自動クリーンアップ

### テストパターン

- **t-wada式TDD**: 厳格なRed-Green-Refactor サイクル
- **Co-location**: `*.test.ts` による実装ファイル隣接配置
- **Integration Tests**: `SELF.fetch()` による HTTP エンドポイントテスト
- **Unit Tests**: `runInDurableObject()` による直接インスタンステスト
- **Characterization Tests**: レガシーコードの動作保証

### モック戦略

- **Discord API**: 完全モック化
- **OpenAI API**: Usage tracking含む包括的モック
- **Environment Variables**: テスト専用環境

## 開発コマンド

### 基本開発

```bash
pnpm dev              # wrangler types && wrangler dev
pnpm start           # wrangler dev
pnpm cf-typegen      # wrangler types
```

### 品質保証（必須）

```bash
pnpm check           # lint && format && typecheck
pnpm lint:check      # ESLint（警告0許容）
pnpm format:check    # Prettier チェック
pnpm typecheck       # TypeScript型チェック
pnpm lint            # ESLint 自動修正
pnpm format          # Prettier 自動フォーマット
```

### テスト実行

```bash
pnpm test:run        # 単発テスト実行
pnpm test:coverage   # カバレッジ レポート
pnpm tdd             # インタラクティブ TDD モード
```

### デプロイメント

```bash
pnpm run deploy          # wrangler deploy
```

## 環境変数・設定

### Wrangler設定 (`wrangler.jsonc`)

```json
{
  "name": "echo-chamber",
  "main": "src/index.ts",
  "compatibility_date": "2025-06-10",
  "durable_objects": {
    "bindings": [{ "class_name": "Echo", "name": "ECHO" }]
  },
  "kv_namespaces": [{ "binding": "ECHO_KV" }],
  "assets": { "directory": "./public/", "binding": "ASSETS" },
  "observability": { "enabled": true }
}
```

### 主要な秘密情報

- `DISCORD_BOT_TOKEN_RIN`: Discord Bot認証トークン
- `OPENAI_API_KEY`: OpenAI API キー
- `ENVIRONMENT`: 実行環境識別子

### KV ストレージキー

- `name_${id}`: Echo インスタンス名
- `chat_channel_discord_${id}`: Discord チャンネルID

## アーキテクチャパターン

### Durable Objects設計

- **Single Instance per ID**: `idFromName()` による一意インスタンス
- **RPC Style**: Durable Object methodsへの直接呼び出し
- **Alarm-based Execution**: 1分間隔の自動実行
- **State Persistence**: `storage` APIによる永続化

### エラーハンドリング

- **Structured Logging**: レベル別ログ出力
- **Graceful Degradation**: 外部API障害時の代替処理
- **Usage Limits**: Token制限による自動制御

### スケーラビリティ

- **Horizontal Scaling**: Durable Objects の分散配置
- **Edge Caching**: 静的アセットの配信最適化
- **Lazy Loading**: 必要時のみのリソース読み込み

## パフォーマンス最適化

### Bundle最適化

- **Tree Shaking**: 未使用コードの自動除去
- **Code Splitting**: 動的import による分割読み込み
- **Minification**: 本番ビルドでの圧縮

### Runtime最適化

- **V8 Isolates**: 高速起動とメモリ効率
- **Smart Placement**: リクエスト元に近いエッジでの実行
- **Connection Pooling**: HTTP接続の再利用

---

**最終更新**: 2025-09-11
**バージョン**: 1.0
**ステータス**: Always Included - 全コード生成において参照必須
