import { beforeEach, describe, expect, it, vi } from 'vitest';

import { MemorySystem } from './index';

import type { EmbeddingService } from '../../llm/openai/embedding';
import type { Logger } from '../../utils/logger';
import type { Emotion, Memory } from '../types';

const mockStorage = {
  get: vi.fn(),
  put: vi.fn(),
};

const mockEmbeddingService: EmbeddingService = {
  embed: vi.fn().mockResolvedValue(new Array<number>(1536).fill(0)),
};

const mockLogger: Logger = {
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
} as unknown as Logger;

const createMockMemory = (overrides?: Partial<Memory>): Memory => {
  return {
    content: 'Test memory content',
    embedding: new Array<number>(1536).fill(0),
    emotion: {
      valence: 0.5,
      arousal: 0.3,
      labels: ['neutral'],
    } as Emotion,
    createdAt: '2025-01-25T10:00:00.000Z',
    updatedAt: '2025-01-25T10:00:00.000Z',
    ...overrides,
  };
};

describe('MemorySystem', () => {
  let memorySystem: MemorySystem;

  beforeEach(() => {
    vi.resetAllMocks();
    memorySystem = new MemorySystem({
      storage: mockStorage as unknown as DurableObjectStorage,
      embeddingService: mockEmbeddingService,
      logger: mockLogger,
    });
  });

  describe('getLatestMemory', () => {
    it('メモリが存在しない場合はnullを返す', async () => {
      mockStorage.get.mockResolvedValue(null);

      const result = await memorySystem.getLatestMemory();

      expect(result).toBeNull();
    });

    it('メモリが空配列の場合はnullを返す', async () => {
      mockStorage.get.mockResolvedValue([]);

      const result = await memorySystem.getLatestMemory();

      expect(result).toBeNull();
    });

    it('最も新しいメモリを返す（createdAtで判定）', async () => {
      const olderMemory = createMockMemory({
        content: 'Older memory',
        createdAt: '2025-01-24T10:00:00.000Z',
        updatedAt: '2025-01-24T10:00:00.000Z',
      });
      const newerMemory = createMockMemory({
        content: 'Newer memory',
        createdAt: '2025-01-25T15:00:00.000Z',
        updatedAt: '2025-01-25T15:00:00.000Z',
      });
      const middleMemory = createMockMemory({
        content: 'Middle memory',
        createdAt: '2025-01-25T10:00:00.000Z',
        updatedAt: '2025-01-25T10:00:00.000Z',
      });

      mockStorage.get.mockResolvedValue([
        olderMemory,
        newerMemory,
        middleMemory,
      ]);

      const result = await memorySystem.getLatestMemory();

      expect(result).toEqual({
        content: 'Newer memory',
        emotion: newerMemory.emotion,
        createdAt: '2025-01-25T15:00:00.000Z',
      });
    });

    it('embeddingを含まない結果を返す', async () => {
      const memory = createMockMemory({
        content: 'Test memory',
        embedding: new Array<number>(1536).fill(0.1),
      });

      mockStorage.get.mockResolvedValue([memory]);

      const result = await memorySystem.getLatestMemory();

      expect(result).not.toHaveProperty('embedding');
      expect(result).toHaveProperty('content');
      expect(result).toHaveProperty('emotion');
      expect(result).toHaveProperty('createdAt');
    });
  });
});
