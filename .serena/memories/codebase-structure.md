# コードベース構造

## ルートディレクトリ構造

```
echo-chamber/
├── src/                    # ソースコード
├── test/                   # テストファイル
├── docs/                   # ドキュメント
├── .serena/               # Serenaツール設定
├── .claude/               # Claude Code設定
├── .vscode/               # VS Code設定
├── package.json           # Node.js プロジェクト設定
├── wrangler.jsonc         # Cloudflare Workers設定
├── tsconfig.json          # TypeScript設定
├── eslint.config.js       # ESLint設定
├── vitest.config.ts       # Vitestテスト設定
├── CLAUDE.md              # Claude Code ガイド
└── worker-configuration.d.ts # 自動生成型定義
```

## src/ 詳細構造

```
src/
├── index.ts               # メインWorkerエントリーポイント
├── echo/
│   └── index.ts          # Echo Durable Object（核心ロジック）
├── llm/
│   ├── prompts/
│   │   └── system.ts     # システムプロンプト
│   └── openai/
│       ├── client.ts     # OpenAIクライアント
│       └── functions/    # OpenAI Function定義
├── discord/
│   ├── api.ts           # Discord API呼び出し
│   └── index.ts         # Discord ユーティリティ
├── utils/
│   ├── logger.ts        # ロガー実装
│   └── error.ts         # エラーハンドリング
└── types/
    └── logger.ts        # ロガー型定義
```

## test/ 構造

```
test/
├── unit/                # 単体テスト
│   ├── llm/openai/     # OpenAI関連テスト
│   └── discord/        # Discord関連テスト
├── integration/        # 結合テスト（計画中）
├── mocks/             # モック実装（計画中）
├── fixtures/          # テストデータ（計画中）
├── helpers/           # テストユーティリティ
├── setup.ts           # テストセットアップ
└── env.d.ts          # テスト環境型定義
```

## 重要な設計原則

- **単一責任**: 各ディレクトリは明確な役割を持つ
- **レイヤー分離**: Presentation/Business/Infrastructure の分離
- **テスト可能性**: 依存関係注入によるテスト容易性確保
