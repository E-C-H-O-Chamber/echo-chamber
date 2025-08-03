# テストアーキテクチャ

## t-wada式TDD採用方針

厳格なRed-Green-Refactorサイクルを強制実行。新機能・仕様変更は**必ずTDDで開発**。

## テスト技術スタック

- **@cloudflare/vitest-pool-workers**: workerd環境でのテスト実行
- **Vitest**: 高速テストランナー（Jest互換API）
- **@vitest/ui**: TDDサイクル支援UI
- **Mocking**: vi.mock() による外部依存モック

## テスト環境設定

- **Real Runtime**: Node.jsではなくworkerd環境でテスト実行
- **自動分離**: Durable Objects、KVストレージのテスト間分離
- **Coverage**: Istanbul provider使用
- **Global Setup**: describe, it, expect をglobal利用

## Claude Code用制約

✅ **使用可能コマンド:**

- `pnpm test:run` - 1回実行、明確なpass/fail結果
- `pnpm test:coverage` - カバレッジ測定・レポート

❌ **使用禁止コマンド:**

- `pnpm tdd` - インタラクティブUI（人間用）
- `pnpm test:watch` - ウォッチモード（自動実行に不適）
- `pnpm test:ui` - ブラウザベースUI

## TDDワークフロー（Claude Code用）

1. テストコード記述
2. `pnpm test:run` 即座実行で確認
3. 失敗テスト修正
4. `pnpm test:run` 再実行で緑状態確認
5. 次イテレーション

## 既存コード保護戦略

- **Characterization Tests**: 既存Echo Durable Object動作保護
- **Integration Tests**: SELF.fetch()によるエンドツーエンドテスト
- **Mock戦略**: Discord API、OpenAI APIの完全モック化

## テスト品質基準

- **90%以上のコードカバレッジ**
- **エッジケースの網羅的テスト**
- **テスト間の完全分離**
