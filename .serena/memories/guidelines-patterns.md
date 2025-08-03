# 開発ガイドライン・パターン

## 重要な開発原則

### セキュリティ最優先

- **絶対禁止**: secrets、keysの露出・ログ出力・リポジトリコミット
- **Workers制約遵守**: setTimeout/setInterval禁止→scheduled events使用
- **型安全性**: strict TypeScript + noUncheckedIndexedAccess

### ライブラリ使用原則

**重要**: 既知ライブラリでも必ず事前確認。package.json, 近隣ファイル, 既存インポートを確認してから使用。

### コンポーネント作成指針

1. **既存コンポーネント調査**: 既存パターン・命名・型定義を確認
2. **フレームワーク選択**: プロジェクト内統一性を重視
3. **命名規約遵守**: PascalCase（コンポーネント）、camelCase（変数・関数）

### エラーハンドリングパターン

- **ZodSchema**: 入力値バリデーション必須
- **Type Guards**: 実行時型チェック活用
- **Error Boundaries**: エラー境界の明確化

## OpenAI使用量管理パターン

### 動的制限アルゴリズム

```typescript
dynamicLimit = min(
  DAILY_LIMIT × (currentHour / 24) × BUFFER_FACTOR,
  DAILY_LIMIT
)
```

### 設定値

- **DAILY_TOKEN_LIMIT**: 1,000,000 tokens
- **USAGE_BUFFER_FACTOR**: 1.5倍
- **時間比例配分**: 現在時刻に基づく動的制限

### 使用量監視

- **事前チェック**: API呼び出し前の制限確認
- **詳細ログ**: 制限違反時の状況記録
- **早期終了**: 制限超過時のクォータ保護

## Durable Objectsパターン

- **RPCメソッド**: インスタンス直接呼び出し
- **状態管理**: SQLite + 永続ストレージ
- **命名規約**: 意味的ID使用（例：'rin'）

## Function Callingパターン

- **Tool基底クラス**: 統一的なFunction定義
- **Zodスキーマ**: パラメータバリデーション
- **型安全実行**: execute()メソッドによる実行
