import { cosineSimilarity } from '../../utils/vector';

import type { EmbeddingService } from '../../llm/openai/embedding';
import type { Logger } from '../../utils/logger';
import type { Emotion, Memory } from '../types';

const STORAGE_KEY = 'memories';
const MAX_MEMORY_COUNT = 100;
const SEARCH_RESULT_LIMIT = 5;
const SIMILARITY_THRESHOLD = 0.001;

/**
 * メモリ検索結果
 */
export interface MemorySearchResult {
  content: string;
  emotion: Emotion;
  createdAt: string;
  similarity: number;
}

/**
 * 記憶システム
 * エピソード記憶の保存とセマンティック検索を提供する。
 */
export class MemorySystem {
  private readonly storage: DurableObjectStorage;
  private readonly embeddingService: EmbeddingService;
  private readonly logger: Logger;

  constructor(options: {
    storage: DurableObjectStorage;
    embeddingService: EmbeddingService;
    logger: Logger;
  }) {
    this.storage = options.storage;
    this.embeddingService = options.embeddingService;
    this.logger = options.logger;
  }

  /**
   * エピソード記憶を保存する
   * 容量超過時は最古のメモリを自動削除する
   */
  async storeMemory(content: string, emotion: Emotion): Promise<void> {
    const embedding = await this.embeddingService.embed(content);

    const existingMemories = await this.getAllMemories();

    // 容量超過時は最古のメモリを削除
    if (existingMemories.length >= MAX_MEMORY_COUNT) {
      const oldestIndex = this.findOldestMemoryIndex(existingMemories);
      const oldest = existingMemories[oldestIndex];
      existingMemories.splice(oldestIndex, 1);
      await this.logger.info(
        `Memory capacity reached. Removed oldest memory: ${oldest?.content}`
      );
    }

    const now = new Date().toISOString();
    const newMemory: Memory = {
      content,
      embedding,
      emotion,
      createdAt: now,
      updatedAt: now,
    };

    const updatedMemories = [...existingMemories, newMemory];
    await this.storage.put(STORAGE_KEY, updatedMemories);
  }

  /**
   * セマンティック検索でメモリを取得する
   * @param query 検索クエリ
   * @returns 類似度順にソートされた検索結果（最大5件）
   */
  async searchMemory(query: string): Promise<MemorySearchResult[]> {
    const memories = await this.getAllMemories();

    if (memories.length === 0) {
      return [];
    }

    const queryEmbedding = await this.embeddingService.embed(query);

    // 類似度計算
    const memoriesWithSimilarity = memories.map((memory) => ({
      memory,
      similarity: cosineSimilarity(queryEmbedding, memory.embedding),
    }));

    // 閾値でフィルタ、類似度降順でソート、上位N件を取得
    const filteredMemories = memoriesWithSimilarity
      .filter((m) => m.similarity >= SIMILARITY_THRESHOLD)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, SEARCH_RESULT_LIMIT);

    await this.logger.info(
      `Found relevant memories with similarity: [${filteredMemories.map((m) => m.similarity.toFixed(4)).join(', ')}]`
    );

    return filteredMemories.map(({ memory, similarity }) => ({
      content: memory.content,
      emotion: memory.emotion,
      createdAt: memory.createdAt,
      similarity,
    }));
  }

  /**
   * 全メモリを取得する
   */
  private async getAllMemories(): Promise<Memory[]> {
    return (await this.storage.get<Memory[]>(STORAGE_KEY)) ?? [];
  }

  /**
   * 最古のメモリのインデックスを取得する
   */
  private findOldestMemoryIndex(memories: Memory[]): number {
    let oldestIndex = 0;
    let oldestTime = memories[0]?.updatedAt ?? '';

    for (let i = 1; i < memories.length; i++) {
      const currentTime = memories[i]?.updatedAt ?? '';
      if (currentTime < oldestTime) {
        oldestIndex = i;
        oldestTime = currentTime;
      }
    }

    return oldestIndex;
  }
}
