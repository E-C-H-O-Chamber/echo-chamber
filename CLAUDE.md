# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- `pnpm dev` - Start development server with type generation (combines `wrangler types && wrangler dev`)
- `pnpm start` - Alternative development server command
- `pnpm cf-typegen` - Generate TypeScript types from Wrangler configuration
- `pnpm deploy` - Deploy to Cloudflare Workers
- `pnpm test:run path/to/specific.test.ts` - Run a specific test file

## Quality Assurance Commands

**CRITICAL**: Always run these commands after code changes to ensure zero errors before task completion.

- `pnpm lint:check` - ESLint with zero warnings tolerance (strict mode)
- `pnpm typecheck` - TypeScript type checking
- `pnpm format:check` - Prettier format checking
- `pnpm lint` - ESLint with auto-fix (use for fixing, not checking)
- `pnpm format` - Prettier with auto-format (use for fixing, not checking)

### Quality Check Workflow

```bash
# After any code changes, run these in sequence:
pnpm lint:check
pnpm typecheck
pnpm format:check
```

**Never complete tasks with unresolved errors from these commands.**

## Environment Configuration

**Required Environment Variables:**

- `OPENAI_API_KEY` - OpenAI API key for GPT-5 access
- `DISCORD_BOT_TOKEN_RIN` - Discord bot token for Rin instance
- `ENVIRONMENT` - Environment flag (`local` for development features)

**Important**: Never commit secrets to repository. Use `wrangler secret put` for production deployment.

## Automated Testing Strategy

This project implements **t-wada式TDD (Test-Driven Development)** using the latest Cloudflare Workers testing environment.

### Testing Commands

**CRITICAL**: Always run tests after code changes to ensure functionality is preserved.

- `pnpm test` - Run all tests in watch mode (recommended for development)
- `pnpm test:run` - Run tests once and exit
- `pnpm test:ui` - Open Vitest UI for interactive testing
- `pnpm test:coverage` - Generate test coverage report
- `pnpm tdd` - **Recommended**: Watch mode with UI for t-wada式TDD

### Claude Code Testing Constraints

**IMPORTANT**: Claude Code should avoid interactive commands due to execution limitations.

**✅ Claude Code Should Use:**

- `pnpm test:run` - Single execution with clear pass/fail results
- `pnpm test:coverage` - Coverage measurement and reporting
- `pnpm lint:check` - Code quality verification
- `pnpm typecheck` - Type safety confirmation

**❌ Claude Code Should NOT Use:**

- `pnpm tdd` - Interactive UI requires human interaction
- `pnpm test:watch` - Watch mode not suitable for automated execution
- `pnpm test:ui` - Browser-based UI cannot be operated by Claude Code

**Recommended Claude Code Workflow:**

1. Write test code
2. Execute `pnpm test:run` immediately for verification
3. Fix any failing tests
4. Re-run `pnpm test:run` to confirm green state
5. Proceed to next test iteration

This approach ensures continuous quality verification while respecting Claude Code's execution constraints.

### Testing Architecture

**Technology Stack (2024 Best Practices):**

- **@cloudflare/vitest-pool-workers** - Executes tests in `workerd` runtime environment
- **Vitest** - Fast, modern test runner with TypeScript support
- **@vitest/ui** - Interactive testing interface for TDD workflows

**Key Benefits:**

- Tests run in actual Cloudflare Workers runtime (`workerd`), not Node.js emulation
- Automatic isolation of Durable Objects and KV storage between tests
- Real-time feedback for Red-Green-Refactor TDD cycles

### Test Structure

**Co-location Pattern:** Tests are co-located with source code using the `.test.ts` suffix. Each module's tests are placed alongside its implementation files within the `src/` directory.

**Discovery & Execution:**

- Use `Glob` tool with pattern `src/**/*.test.ts` to find all test files
- Run directory tests: `pnpm test:run src/path/to/module/`
- Run specific file: `pnpm test:run src/path/to/file.test.ts`
- Run all tests: `pnpm test:run`

**Key Benefits of Co-location:**

- Tests are immediately discoverable next to their implementation
- Module boundaries are clear and testable units are obvious
- Refactoring moves tests and code together naturally

### Testing Patterns

**Durable Objects Testing:**

- **Integration Tests**: Use `SELF.fetch()` to test HTTP endpoints and full request flows
- **Unit Tests**: Use `runInDurableObject()` helper for direct instance testing

**External Dependencies:**

- **Discord API**: Fully mocked with realistic response patterns
- **OpenAI API**: Comprehensive mock including usage tracking
- **Environment Variables**: Isolated test environment setup

### TDD Workflow

**CRITICAL**: このプロジェクトでは厳格なt-wada式TDDプロセスを遵守する。

#### TodoWriteツールによる強制管理

仕様変更・新機能開発時は**必ず**以下のタスクテンプレートをTodoWriteで設定：

```
- 🔴 Red: 失敗するテストを書く
- ✅ テスト実行して失敗確認 (pnpm test:run)
- 🟢 Green: 最小限実装でテストを通す
- ✅ テスト実行して成功確認 (pnpm test:run)
- 🔵 Refactor: 必要に応じてリファクタリング
```

#### 必須プロセス

1. **🔴 Red**: 失敗するテストを書く
   - 実装前に**必ずテスト実行**して赤を確認
   - 一度に一つの変更のみ

2. **🟢 Green**: 最小限の実装でテストを通す
   - テスト実行して緑を確認
   - 過度な実装は禁止（最小限で止める）

3. **🔵 Refactor**: コード品質向上（必要時のみ）
   - テストを壊さない範囲で改善
   - 品質チェック実行必須

#### 絶対禁止事項

❌ **テストと実装の同時変更**  
❌ **Redフェーズのスキップ**  
❌ **テスト実行せずに次ステップへ進む**  
❌ **一度に複数の変更**

### Characterization Tests

For existing legacy code, we use **Characterization Tests** to:

- Document current behavior before refactoring
- Prevent regressions during code improvements
- Enable safe architectural changes

**Next Steps:**

- Create Characterization Tests for core Echo Durable Object logic
- Expand integration test coverage for Discord/OpenAI interactions
- Establish CI/CD pipeline with automated testing

## Architecture Overview

This is a Cloudflare Workers application built with Hono framework and TypeScript. The architecture consists of:

### Core Components

- **Main Worker** (`src/index.ts`) - Hono application serving as the entry point with basic routing
- **Echo Durable Object** (`src/echo/index.ts`) - Implements the core Echo functionality as a Durable Object with RPC methods
- **OpenAI Client** (`src/llm/openai/client.ts`) - GPT-5 Responses API client with usage tracking and recursive function call handling
- **Discord Integration** (`src/discord/`) - Discord API wrapper for chat functionality
- **Tool System** (`src/llm/openai/functions/`) - OpenAI function calling tools for chat, tasks, context, and deep thinking

### Cloudflare Resources

- **Durable Object**: `Echo` class bound as `ECHO` - provides persistent state and RPC capabilities
- **KV Namespace**: `ECHO_KV` - key-value storage for the application
- **SQLite**: Configured for the Echo Durable Object via migrations

### Key Patterns

- The main worker routes requests to Durable Object instances using `c.env.ECHO.idFromName()`
- Durable Objects expose RPC methods that can be called directly from the worker
- Type definitions are auto-generated by Wrangler and stored in `worker-configuration.d.ts`
- **Usage Management**: OpenAI API calls are tracked with dynamic hourly limits and daily caps
- **Function Calling**: Extensive use of OpenAI's function calling for Discord interactions, task management, and context storage
- **Alarm-based Scheduling**: Durable Objects use alarms for periodic execution (1-minute intervals)

### Entry Points

- Root path `/` returns a simple status message
- All paths under `/rin/*` are routed to an Echo Durable Object instance named "Rin"

**Debug Endpoints** (local only):

- `POST /rin/wake` - Wake up Echo instance
- `POST /rin/sleep` - Put Echo to sleep
- `POST /rin/run` - Force execution cycle
- `POST /rin/reset` - Clear context and tasks
- `GET /rin/usage/today` - Today's token usage
- `GET /rin/usage/:date` - Usage for specific date (YYYY-MM-DD format)

Always run `wrangler types` when making changes to `wrangler.jsonc` to keep TypeScript definitions up to date.

## OpenAI Usage Management

This application includes comprehensive OpenAI API usage tracking and management to prevent unexpected token consumption.

### Architecture

**OpenAIClient** (`src/llm/openai/client.ts`)

- `call()` method returns cumulative `ResponseUsage` across all recursive function calls
- Automatically logs warning when API response lacks usage information

**Echo Durable Object** (`src/echo/index.ts`)

- Accumulates daily usage statistics in Durable Object storage
- Implements dynamic token limits based on time-proportional allocation
- Stores usage data by date: `{ "2025-07-28": ResponseUsage, ... }`

### Dynamic Token Limiting

**Algorithm:**

```typescript
// Base settings
DAILY_TOKEN_LIMIT = 1,000,000 tokens
USAGE_BUFFER_FACTOR = 1.5x

// Dynamic calculation
idealUsage = DAILY_TOKEN_LIMIT × (currentHour / 24)
dynamicLimit = min(idealUsage × BUFFER_FACTOR, DAILY_TOKEN_LIMIT)
```

**Examples:**

- 06:00 → 375,000 tokens allowed (250k × 1.5)
- 12:00 → 750,000 tokens allowed (500k × 1.5)
- 18:00 → 1,000,000 tokens allowed (750k × 1.5, capped at daily limit)

### HTTP Endpoints

**Usage Statistics:**

- `GET /rin/` - Returns Echo status including `allUsage` field
- `GET /rin/usage` - Full usage history
- `GET /rin/usage/today` - Today's usage
- `GET /rin/usage/:date` - Specific date usage (format: YYYY-MM-DD, e.g., 2025-07-28)

### Operational Notes

**Threshold Monitoring:**

- Pre-execution check prevents API calls when dynamic limit exceeded
- Detailed violation logs include current time, limit, actual usage, and daily cap
- Early termination preserves remaining daily quota for later hours

**Usage Data Structure:**

```typescript
ResponseUsage {
  input_tokens: number
  input_tokens_details: { cached_tokens: number }
  output_tokens: number
  output_tokens_details: { reasoning_tokens: number }
  total_tokens: number
}
```

**Configuration Adjustment:**
Monitor violation logs and daily surplus patterns to optimize `USAGE_BUFFER_FACTOR` (currently 1.5x). Consider time-of-day specific multipliers if usage patterns show consistent trends.

## Key Technologies

**OpenAI Integration:**

- Uses GPT-5 model (`gpt-5-2025-08-07`) with Responses API
- Implements comprehensive usage tracking with `ResponseUsage` accumulation
- Supports recursive function calling with parallel execution
- Custom timeout and retry logic for reliability

**Discord Integration:**

- Built on `@discordjs/rest` and `discord-api-types`
- Fully mocked for testing with realistic response patterns
- Supports message reading, sending, and reaction management

**Validation:**

- Extensive use of Zod schemas for runtime type validation
- All function parameters and API responses are validated
- Type-safe configuration constants in `src/echo/constants.ts`
