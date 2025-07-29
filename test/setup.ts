import { vi } from 'vitest';

// Discord 関連の依存関係をグローバルにモック
vi.mock('../src/discord', () => ({
  addReactionToMessage: vi.fn(),
  getChannelMessages: vi.fn(),
  getUnreadMessageCount: vi.fn(),
  sendChannelMessage: vi.fn(),
  getCurrentUser: vi.fn(),
}));

// Logger をグローバルにモック
vi.mock('../src/utils/logger', () => {
  const mockLogger = {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  };

  return {
    Logger: vi.fn(() => mockLogger),
    createLogger: vi.fn(() => mockLogger),
  };
});
