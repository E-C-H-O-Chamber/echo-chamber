# 技術スタック詳細

## 主要フレームワーク・ライブラリ

- **Hono** (v4.7.11): 軽量Webフレームワーク（Cloudflare Workers最適化）
- **OpenAI SDK** (v5.10.1): GPT APIクライアント
- **Discord.js** (builders/rest): Discord API操作
- **Zod** (v4.0.5): スキーマバリデーション

## 開発環境

- **Node.js**: 22.16.0 (Volta管理)
- **TypeScript**: v5.5.2 (strict設定、ES2021ターゲット)
- **pnpm**: パッケージマネージャー
- **Wrangler**: Cloudflare Workers CLI

## インフラストラクチャ

- **Cloudflare Workers**: サーバーレス実行環境
- **Durable Objects**: 永続状態管理（SQLite利用可能）
- **KV Storage**: キーバリューストレージ
- **Workers Observability**: ロギング・監視

## Cloudflare Workers設定

- **Compatibility Date**: 2025-06-10
- **Main**: src/index.ts
- **Durable Objects**: Echo クラス（ECHO binding）
- **KV Namespace**: ECHO_KV binding
