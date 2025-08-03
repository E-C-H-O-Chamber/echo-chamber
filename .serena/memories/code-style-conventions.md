# コードスタイル・規約

## TypeScript設定

- **Strict Mode**: 完全有効化
- **noUncheckedIndexedAccess**: true（配列・オブジェクトアクセスの型安全性）
- **explicit-function-return-type**: 必須（関数戻り値型の明示）
- **Type Import**: separate-type-imports強制

## ESLint重要ルール

### TypeScript固有

- `@typescript-eslint/consistent-type-imports`: type importの分離必須
- `@typescript-eslint/strict-boolean-expressions`: 厳密boolean式
- `@typescript-eslint/promise-function-async`: Promise返却関数はasync必須
- `@typescript-eslint/no-unused-vars`: 未使用変数エラー（\_プレフィックス例外）

### Workers環境制約

- `no-restricted-globals`: window, document, localStorage禁止
- `no-restricted-syntax`: setTimeout/setInterval禁止→scheduled events使用

### コード品質

- `complexity`: 循環的複雑度10以下警告
- `max-depth`: ネスト深度4以下
- `max-lines-per-function`: 120行以下警告
- `max-params`: パラメータ4個以下警告

## Import順序規則

1. Node.js built-in modules
2. External packages (npm)
3. Internal modules (src/\*)
4. Parent/sibling directories
5. Type-only imports

## Prettier設定

- **Print Width**: 80文字
- **Tab Width**: 2スペース
- **Single Quote**: true
- **Trailing Comma**: es5
- **Semicolon**: true
