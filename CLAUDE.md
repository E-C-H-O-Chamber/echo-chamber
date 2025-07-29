# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- `pnpm dev` - Start development server with type generation (combines `wrangler types && wrangler dev`)
- `pnpm start` - Alternative development server command
- `pnpm cf-typegen` - Generate TypeScript types from Wrangler configuration

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

```
test/
├── unit/           # Pure function and component tests
├── integration/    # End-to-end workflow tests using SELF.fetch()
├── mocks/          # External API mocks (Discord, OpenAI)
├── fixtures/       # Shared test data and constants
└── helpers/        # Common test utilities and setup
```

### Testing Patterns

**Durable Objects Testing:**

- **Integration Tests**: Use `SELF.fetch()` to test HTTP endpoints and full request flows
- **Unit Tests**: Use `runInDurableObject()` helper for direct instance testing

**External Dependencies:**

- **Discord API**: Fully mocked with realistic response patterns
- **OpenAI API**: Comprehensive mock including usage tracking
- **Environment Variables**: Isolated test environment setup

### TDD Workflow

1. **Red**: Write failing test first (`pnpm tdd` provides real-time feedback)
2. **Green**: Write minimal code to pass the test
3. **Refactor**: Improve code while maintaining test coverage

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

### Cloudflare Resources

- **Durable Object**: `Echo` class bound as `ECHO` - provides persistent state and RPC capabilities
- **KV Namespace**: `ECHO_KV` - key-value storage for the application
- **SQLite**: Configured for the Echo Durable Object via migrations

### Key Patterns

- The main worker routes requests to Durable Object instances using `c.env.ECHO.idFromName()`
- Durable Objects expose RPC methods that can be called directly from the worker
- Type definitions are auto-generated by Wrangler and stored in `worker-configuration.d.ts`

### Entry Points

- Root path `/` returns a simple status message
- All paths under `/rin/*` are routed to an Echo Durable Object instance named "Rin"

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
