import { defineWorkersConfig } from '@cloudflare/vitest-pool-workers/config';
import { resolve } from 'path';
// import tsconfigPaths from 'vite-tsconfig-paths';

export default defineWorkersConfig({
  test: {
    // workerd環境でテストを実行
    poolOptions: {
      workers: {
        wrangler: {
          configPath: './wrangler.jsonc',
        },
        miniflare: {
          // discord-api-types の互換性問題を回避
          compatibilityFlags: ['nodejs_compat'],
        },
      },
    },
    // t-wada式TDDに最適な設定
    globals: true, // describe, it, expect をグローバルで使用
    watch: true, // ファイル変更を監視して自動テスト実行
    reporters: ['verbose', 'html'], // 詳細な出力とHTML レポート
    coverage: {
      provider: 'istanbul',
      reporter: ['text', 'html', 'lcov'],
      include: ['src/**/*.ts'],
      exclude: [
        'node_modules/**',
        'dist/**',
        '**/*.d.ts',
        'vitest.config.ts',
        '**/*.test.ts',
        '**/*.spec.ts',
        'src/discord/api.ts',
        'src/utils/logger.ts',
      ],
    },
    // テストのタイムアウト設定
    testTimeout: 10000,
    hookTimeout: 10000,
    // テストセットアップファイル
    setupFiles: './test/setup.ts',
  },
  // TypeScript設定
  esbuild: {
    target: 'esnext',
  },
});
