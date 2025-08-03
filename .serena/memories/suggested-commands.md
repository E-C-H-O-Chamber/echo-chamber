# 開発で必要なコマンド一覧

## 開発サーバー

```bash
pnpm dev        # 開発サーバー起動（型生成+wrangler dev）
pnpm start      # 代替開発サーバーコマンド
pnpm cf-typegen # TypeScript型定義生成
```

## 品質チェック（必須）

```bash
pnpm lint:check   # ESLint（警告0個の厳格モード）
pnpm typecheck    # TypeScript型チェック
pnpm format:check # Prettier フォーマットチェック
```

## 品質修正

```bash
pnpm lint         # ESLint自動修正
pnpm format       # Prettier自動フォーマット
```

## テスト実行

```bash
pnpm test:run     # テスト1回実行（Claude Code推奨）
pnpm test:coverage # カバレッジレポート生成
pnpm test         # ウォッチモード
pnpm test:ui      # Vitest UI（人間用）
pnpm tdd          # TDD ワークフロー（人間用）
```

## デプロイメント

```bash
wrangler deploy   # 本番デプロイ
```

## システムコマンド（macOS）

```bash
ls -la           # ファイル一覧表示
find . -name "pattern" # ファイル検索
grep -r "text" . # テキスト検索
git status       # Git状態確認
git add .        # ステージング
git commit -m "msg" # コミット
```

## 品質チェックワークフロー

**コード変更後は必ず以下を順次実行：**

1. `pnpm lint:check`
2. `pnpm typecheck`
3. `pnpm format:check`
4. `pnpm test:run`

**エラーがある場合は修正コマンド実行後に再チェック必須**
