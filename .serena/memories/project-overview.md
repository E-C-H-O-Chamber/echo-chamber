# Echo Chamber プロジェクト概要

## プロジェクト目的

Echo Chamberは、**Cloudflare Workers上で動作するDiscordボット**です。HonoフレームワークとDurable Objectsを使用して構築されており、OpenAI APIと連携してチャット機能を提供します。

## 核心的な機能

- **Discord API連携**: チャンネルメッセージの読み取り、送信、リアクション追加
- **OpenAI GPT統合**: チャット応答生成とFunction Calling
- **使用量管理**: OpenAI APIの動的トークン制限システム
- **永続化**: Durable ObjectsとKVストレージによる状態管理

## アーキテクチャ特徴

- **メインWorker** (`src/index.ts`): Honoアプリケーションのエントリーポイント
- **Echo Durable Object** (`src/echo/index.ts`): 核心ロジックとRPCメソッド提供
- **マイクロサービス設計**: Discord API、OpenAI Client、各種Function の分離

## 重要な制約事項

- **Cloudflare Workers環境**: Node.js固有機能は使用不可
- **セキュリティ重視**: ESLintでworkers環境の制約を強制
- **型安全性**: strict TypeScript設定とnoUncheckedIndexedAccess有効化
