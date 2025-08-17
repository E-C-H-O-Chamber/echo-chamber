import { env } from 'cloudflare:test';
import { vi } from 'vitest';

import { createLogger } from '../../src/utils/logger';

const mockStore = {
  get: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
  list: vi.fn(),
  getWithMetadata: vi.fn(),
};

const mockStorage = {
  get: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
  list: vi.fn(),
  deleteAll: vi.fn(),
  getAlarm: vi.fn(),
  setAlarm: vi.fn(),
  deleteAlarm: vi.fn(),
  sync: vi.fn(),
  transaction: vi.fn(),
  sql: {
    exec: vi.fn(),
    databaseSize: 0,
    Cursor: vi.fn(),
    Statement: vi.fn(),
  },
  transactionSync: vi.fn(),
  getCurrentBookmark: vi.fn(),
  getBookmarkForTime: vi.fn(),
  onNextSessionRestoreBookmark: vi.fn(),
};

const mockLogger = createLogger(env);
vi.spyOn(mockLogger, 'debug').mockImplementation(vi.fn());
vi.spyOn(mockLogger, 'info').mockImplementation(vi.fn());
vi.spyOn(mockLogger, 'warn').mockImplementation(vi.fn());
vi.spyOn(mockLogger, 'error').mockImplementation(vi.fn());

export const mockToolContext = {
  echoId: 'mock-echo-id',
  store: mockStore,
  storage: mockStorage,
  discordBotToken: 'mock-discord-token',
  logger: mockLogger,
};
