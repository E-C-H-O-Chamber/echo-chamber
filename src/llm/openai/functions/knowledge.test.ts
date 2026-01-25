import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import { mockStorage, mockToolContext } from '../../../../test/mocks/tool';
import { calculateForgottenAt } from '../../../utils/memory';

import { storeKnowledgeFunction, searchKnowledgeFunction } from './knowledge';

import type { Knowledge } from '../../../echo/types';

beforeAll(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2025-08-04T08:00:00.000Z'));
});

afterAll(() => {
  vi.useRealTimers();
});

beforeEach(() => {
  vi.resetAllMocks();
});

// テスト用のヘルパー関数
const createMockKnowledge = (overrides?: Partial<Knowledge>): Knowledge => {
  const category = overrides?.category ?? ('other' as const);
  const accessCount = overrides?.accessCount ?? 0;
  const lastAccessedAt = overrides?.lastAccessedAt ?? new Date().toISOString();
  return {
    content: 'Test knowledge content',
    category,
    tags: [],
    accessCount,
    lastAccessedAt,
    forgottenAt: calculateForgottenAt(lastAccessedAt, accessCount, category),
    ...overrides,
  };
};

describe('Knowledge Functions', () => {
  describe('storeKnowledgeFunction', () => {
    it('name', () => {
      expect(storeKnowledgeFunction.name).toBe('store_knowledge');
    });

    it('description', () => {
      expect(storeKnowledgeFunction.description).toBeDefined();
    });

    it('parameters', () => {
      const { parameters } = storeKnowledgeFunction;
      expect(parameters).toBeDefined();

      expect(parameters).toHaveProperty('knowledge');
      expect(parameters.knowledge.def.type).toBe('string');
      expect(parameters.knowledge.minLength).toBe(1);
      expect(parameters.knowledge.maxLength).toBe(1000);
      expect(parameters.knowledge.description).toBeDefined();

      expect(parameters).toHaveProperty('category');
      expect(parameters.category.unwrap().def.type).toBe('enum');
      expect(parameters.category.unwrap().enum).toEqual({
        fact: 'fact',
        experience: 'experience',
        insight: 'insight',
        pattern: 'pattern',
        rule: 'rule',
        preference: 'preference',
        other: 'other',
      });
      expect(parameters.category.def.type).toBe('optional');
      expect(parameters.category.description).toBeDefined();
    });

    describe('handler', () => {
      it('正常な知識を保存する（forgottenAt含む）', async () => {
        const args = {
          knowledge: 'Important fact about AI',
          category: 'fact' as const,
        };

        const result = await storeKnowledgeFunction.handler(
          args,
          mockToolContext
        );

        expect(mockStorage.get).toHaveBeenCalledWith('knowledge');
        expect(mockStorage.put).toHaveBeenCalledWith(
          'knowledge',
          expect.arrayContaining([
            {
              content: 'Important fact about AI',
              category: 'fact',
              tags: [],
              accessCount: 0,
              lastAccessedAt: new Date().toISOString(),
              forgottenAt: '2025-08-05T08:00:00.000Z', // 1日後（2^0 * 1）
            },
          ])
        );
        expect(result).toEqual({ success: true });
      });

      it('デフォルト値で知識を保存する（forgottenAt含む）', async () => {
        const args = {
          knowledge: 'Simple knowledge without category or tags',
        };

        const result = await storeKnowledgeFunction.handler(
          args,
          mockToolContext
        );

        expect(mockStorage.put).toHaveBeenCalledWith(
          'knowledge',
          expect.arrayContaining([
            {
              content: 'Simple knowledge without category or tags',
              category: 'other',
              tags: [],
              accessCount: 0,
              lastAccessedAt: new Date().toISOString(),
              forgottenAt: '2025-08-05T08:00:00.000Z', // 1日後（2^0 * 1）
            },
          ])
        );
        expect(result).toEqual({ success: true });
      });

      it('ruleカテゴリーはforgottenAtが5倍長い', async () => {
        const args = {
          knowledge: 'Important rule to follow',
          category: 'rule' as const,
        };

        const result = await storeKnowledgeFunction.handler(
          args,
          mockToolContext
        );

        expect(mockStorage.put).toHaveBeenCalledWith(
          'knowledge',
          expect.arrayContaining([
            expect.objectContaining({
              content: 'Important rule to follow',
              category: 'rule',
              forgottenAt: '2025-08-09T08:00:00.000Z', // 5日後（2^0 * 5）
            }),
          ])
        );
        expect(result).toEqual({ success: true });
      });

      it('preferenceカテゴリーはforgottenAtが2倍長い', async () => {
        const args = {
          knowledge: 'User prefers dark mode',
          category: 'preference' as const,
        };

        const result = await storeKnowledgeFunction.handler(
          args,
          mockToolContext
        );

        expect(mockStorage.put).toHaveBeenCalledWith(
          'knowledge',
          expect.arrayContaining([
            expect.objectContaining({
              content: 'User prefers dark mode',
              category: 'preference',
              forgottenAt: '2025-08-06T08:00:00.000Z', // 2日後（2^0 * 2）
            }),
          ])
        );
        expect(result).toEqual({ success: true });
      });

      it('重複する知識は保存を拒否する', async () => {
        const existingKnowledge = [
          createMockKnowledge({
            content: 'Duplicate knowledge',
          }),
        ];
        mockStorage.get.mockResolvedValue(existingKnowledge);

        const args = {
          knowledge: 'Duplicate knowledge',
          category: 'fact' as const,
        };

        const result = await storeKnowledgeFunction.handler(
          args,
          mockToolContext
        );

        expect(result).toEqual({
          success: false,
          error: 'Knowledge already exists',
        });
        expect(mockStorage.put).not.toHaveBeenCalled();
      });

      it('知識の最大数を超えた場合、forgottenAtが最も早いものを削除する（昇順ケース）', async () => {
        // forgottenAtが昇順になるように設定
        // Knowledge 1のforgottenAtが最も早い（最初に忘却される）
        const existingKnowledge = Array.from({ length: 100 }, (_, i) =>
          createMockKnowledge({
            content: `Knowledge ${i + 1}`,
            lastAccessedAt: new Date(2025, 0, i + 1).toISOString(),
          })
        );
        mockStorage.get.mockResolvedValue(existingKnowledge);

        const args = {
          knowledge: 'New knowledge that triggers deletion',
          category: 'other' as const,
        };

        const result = await storeKnowledgeFunction.handler(
          args,
          mockToolContext
        );

        expect(mockStorage.put).toHaveBeenCalledWith(
          'knowledge',
          expect.not.arrayContaining([
            expect.objectContaining({
              content: 'Knowledge 1', // forgottenAtが最も早いものが削除される
            }),
          ])
        );
        expect(mockStorage.put).toHaveBeenCalledWith(
          'knowledge',
          expect.arrayContaining([
            expect.objectContaining({
              content: 'New knowledge that triggers deletion',
              category: 'other',
              tags: [],
            }),
          ])
        );
        expect(result).toEqual({ success: true });
      });

      it('知識の最大数を超えた場合、forgottenAtが最も早いものを削除する（降順ケース）', async () => {
        // forgottenAtが降順になるように設定
        // Knowledge 100のforgottenAtが最も早い（最初に忘却される）
        const existingKnowledge = Array.from({ length: 100 }, (_, i) =>
          createMockKnowledge({
            content: `Knowledge ${i + 1}`,
            lastAccessedAt: new Date(2025, 0, 100 - i).toISOString(),
          })
        );
        mockStorage.get.mockResolvedValue(existingKnowledge);

        const args = {
          knowledge: 'New knowledge that triggers deletion',
          category: 'other' as const,
        };

        const result = await storeKnowledgeFunction.handler(
          args,
          mockToolContext
        );

        expect(mockStorage.put).toHaveBeenCalledWith(
          'knowledge',
          expect.not.arrayContaining([
            expect.objectContaining({
              content: 'Knowledge 100', // forgottenAtが最も早いものが削除される
            }),
          ])
        );
        expect(mockStorage.put).toHaveBeenCalledWith(
          'knowledge',
          expect.arrayContaining([
            expect.objectContaining({
              content: 'New knowledge that triggers deletion',
              category: 'other',
              tags: [],
            }),
          ])
        );
        expect(result).toEqual({ success: true });
      });

      it('カテゴリー補正によりruleカテゴリーは削除されにくい', async () => {
        // 99個のotherカテゴリー（forgottenAt = lastAccessedAt + 1日）
        // 1個のruleカテゴリー（forgottenAt = lastAccessedAt + 5日）
        // ruleは同じlastAccessedAtでもforgottenAtが遅いので削除されにくい
        const existingKnowledge = [
          createMockKnowledge({
            content: 'Rule knowledge',
            category: 'rule',
            lastAccessedAt: '2025-01-01T00:00:00.000Z',
          }),
          ...Array.from({ length: 99 }, (_, i) =>
            createMockKnowledge({
              content: `Other knowledge ${i + 1}`,
              category: 'other',
              lastAccessedAt: '2025-01-01T00:00:00.000Z',
            })
          ),
        ];
        mockStorage.get.mockResolvedValue(existingKnowledge);

        const args = {
          knowledge: 'New knowledge',
          category: 'other' as const,
        };

        const result = await storeKnowledgeFunction.handler(
          args,
          mockToolContext
        );

        // otherカテゴリーの知識が削除され、ruleは残る
        expect(mockStorage.put).toHaveBeenCalledWith(
          'knowledge',
          expect.arrayContaining([
            expect.objectContaining({
              content: 'Rule knowledge',
              category: 'rule',
            }),
          ])
        );
        expect(result).toEqual({ success: true });
      });

      it('storage.getでエラーが発生した場合はエラーを返す', async () => {
        mockStorage.get.mockRejectedValue(new Error('Storage get error'));

        const args = {
          knowledge: 'Knowledge that fails to store',
          category: 'fact' as const,
        };

        const result = await storeKnowledgeFunction.handler(
          args,
          mockToolContext
        );

        expect(result).toEqual({
          success: false,
          error: 'Failed to store knowledge',
        });
        expect(mockStorage.put).not.toHaveBeenCalled();
      });

      it('storage.putでエラーが発生した場合はエラーを返す', async () => {
        mockStorage.put.mockRejectedValue(new Error('Storage put error'));

        const args = {
          knowledge: 'Knowledge that fails to store',
          category: 'insight' as const,
        };

        const result = await storeKnowledgeFunction.handler(
          args,
          mockToolContext
        );

        expect(result).toEqual({
          success: false,
          error: 'Failed to store knowledge',
        });
      });
    });
  });

  describe('searchKnowledgeFunction', () => {
    it('name', () => {
      expect(searchKnowledgeFunction.name).toBe('search_knowledge');
    });

    it('description', () => {
      expect(searchKnowledgeFunction.description).toBeDefined();
    });

    it('parameters', () => {
      const { parameters } = searchKnowledgeFunction;
      expect(parameters).toBeDefined();

      expect(parameters).toHaveProperty('query');
      expect(parameters.query.def.type).toBe('string');
      expect(parameters.query.minLength).toBe(1);
      expect(parameters.query.maxLength).toBe(1000);
      expect(parameters.query.description).toBeDefined();

      expect(parameters).toHaveProperty('category');
      expect(parameters.category.unwrap().def.type).toBe('enum');
      expect(parameters.category.unwrap().enum).toEqual({
        fact: 'fact',
        experience: 'experience',
        insight: 'insight',
        pattern: 'pattern',
        rule: 'rule',
        preference: 'preference',
        other: 'other',
      });
      expect(parameters.category.def.type).toBe('optional');
      expect(parameters.category.description).toBeDefined();
    });

    describe('handler', () => {
      it('タグとカテゴリでフィルタリングせずに知識を検索する', async () => {
        const existingKnowledge = [
          createMockKnowledge({
            content: 'AI is transforming the world',
            tags: ['technology'],
            accessCount: 5,
            lastAccessedAt: '2025-01-20T00:00:00.000Z',
          }),
          createMockKnowledge({
            content: 'The sky is blue due to Rayleigh scattering',
            tags: ['science'],
            accessCount: 2,
            lastAccessedAt: '2025-01-18T00:00:00.000Z',
          }),
          createMockKnowledge({
            content: 'I had a great experience at the new restaurant',
            category: 'experience',
            tags: ['food'],
            accessCount: 1,
            lastAccessedAt: '2025-01-15T00:00:00.000Z',
          }),
        ];
        mockStorage.get.mockResolvedValue(existingKnowledge);

        const args = {
          query: 'sky',
        };

        const result = await searchKnowledgeFunction.handler(
          args,
          mockToolContext
        );

        expect(result).toEqual({
          success: true,
          results: [
            {
              content: 'The sky is blue due to Rayleigh scattering',
              category: 'other',
              tags: ['science'],
            },
          ],
        });
      });

      it('クエリは正規化して検索される', async () => {
        const existingKnowledge = [
          createMockKnowledge({
            content: 'Machine learning is a subset of artificial intelligence',
            tags: ['technology'],
          }),
        ];
        mockStorage.get.mockResolvedValue(existingKnowledge);

        const args = {
          query: 'machine learning',
        };

        const result = await searchKnowledgeFunction.handler(
          args,
          mockToolContext
        );

        expect(result).toEqual({
          success: true,
          results: [
            {
              content:
                'Machine learning is a subset of artificial intelligence',
              category: 'other',
              tags: ['technology'],
            },
          ],
        });
      });

      it('クエリは空白文字で分割して全単語が含まれる知識を検索される', async () => {
        const existingKnowledge = [
          createMockKnowledge({
            content: 'Deep learning advances machine intelligence',
            tags: ['technology'],
          }),
        ];
        mockStorage.get.mockResolvedValue(existingKnowledge);

        const args = {
          query: 'machine learning',
        };

        const result = await searchKnowledgeFunction.handler(
          args,
          mockToolContext
        );

        expect(result).toEqual({
          success: true,
          results: [
            {
              content: 'Deep learning advances machine intelligence',
              category: 'other',
              tags: ['technology'],
            },
          ],
        });
      });

      it('クエリの単語の一部でもマッチすれば検索結果に含まれる（部分マッチ）', async () => {
        const existingKnowledge = [
          createMockKnowledge({
            content: 'Machine learning is popular',
            tags: ['technology'],
            accessCount: 1,
            lastAccessedAt: '2025-01-20T00:00:00.000Z',
          }),
          createMockKnowledge({
            content: 'Artificial intelligence applications',
            tags: ['technology'],
            accessCount: 1,
            lastAccessedAt: '2025-01-20T00:00:00.000Z',
          }),
          createMockKnowledge({
            content: 'Deep networks are complex',
            tags: ['technology'],
            accessCount: 1,
            lastAccessedAt: '2025-01-20T00:00:00.000Z',
          }),
        ];
        mockStorage.get.mockResolvedValue(existingKnowledge);

        const args = {
          query: 'machine networks deep',
        };

        const result = await searchKnowledgeFunction.handler(
          args,
          mockToolContext
        );

        expect(result).toEqual({
          success: true,
          results: [
            {
              content: 'Deep networks are complex',
              category: 'other',
              tags: ['technology'],
            },
            {
              content: 'Machine learning is popular',
              category: 'other',
              tags: ['technology'],
            },
          ],
        });
      });

      it('マッチした単語数が多いほど上位に表示される（スコアリング優先度）', async () => {
        const existingKnowledge = [
          createMockKnowledge({
            content: 'Machine learning algorithms',
            accessCount: 10,
            lastAccessedAt: '2025-01-20T00:00:00.000Z',
          }),
          createMockKnowledge({
            content: 'Deep machine learning with neural networks',
            accessCount: 5,
            lastAccessedAt: '2025-01-18T00:00:00.000Z',
          }),
          createMockKnowledge({
            content: 'Artificial intelligence systems',
            accessCount: 15,
            lastAccessedAt: '2025-01-22T00:00:00.000Z',
          }),
          createMockKnowledge({
            content: 'Advanced machine learning and deep networks',
            accessCount: 3,
            lastAccessedAt: '2025-01-15T00:00:00.000Z',
          }),
        ];
        mockStorage.get.mockResolvedValue(existingKnowledge);

        const args = {
          query: 'machine learning deep networks',
        };

        const result = await searchKnowledgeFunction.handler(
          args,
          mockToolContext
        );

        expect(result).toEqual({
          success: true,
          results: [
            {
              content: 'Deep machine learning with neural networks',
              category: 'other',
              tags: [],
            },
            {
              content: 'Advanced machine learning and deep networks',
              category: 'other',
              tags: [],
            },
            {
              content: 'Machine learning algorithms',
              category: 'other',
              tags: [],
            },
          ],
        });
      });

      it('同じマッチ数の場合はアクセス回数と日時で優先順位が決まる', async () => {
        const existingKnowledge = [
          createMockKnowledge({
            content: 'Machine learning basics',
            accessCount: 5,
            lastAccessedAt: '2025-01-20T00:00:00.000Z',
          }),
          createMockKnowledge({
            content: 'Machine learning advanced',
            accessCount: 10,
            lastAccessedAt: '2025-01-18T00:00:00.000Z',
          }),
          createMockKnowledge({
            content: 'Machine learning fundamentals',
            accessCount: 5,
            lastAccessedAt: '2025-01-22T00:00:00.000Z',
          }),
        ];
        mockStorage.get.mockResolvedValue(existingKnowledge);

        const args = {
          query: 'machine learning',
        };

        const result = await searchKnowledgeFunction.handler(
          args,
          mockToolContext
        );

        expect(result).toEqual({
          success: true,
          results: [
            {
              content: 'Machine learning advanced',
              category: 'other',
              tags: [],
            },
            {
              content: 'Machine learning fundamentals',
              category: 'other',
              tags: [],
            },
            {
              content: 'Machine learning basics',
              category: 'other',
              tags: [],
            },
          ],
        });
      });

      it('クエリに含まれる余分な空白文字を正しく処理する', async () => {
        const existingKnowledge = [
          createMockKnowledge({
            content: 'Python is a programming language',
            tags: ['programming'],
          }),
        ];
        mockStorage.get.mockResolvedValue(existingKnowledge);

        const args = {
          query: '  python   programming  ',
        };

        const result = await searchKnowledgeFunction.handler(
          args,
          mockToolContext
        );

        expect(result).toEqual({
          success: true,
          results: [
            {
              content: 'Python is a programming language',
              category: 'other',
              tags: ['programming'],
            },
          ],
        });
      });

      it('カテゴリでフィルタリングして知識を検索する', async () => {
        const existingKnowledge = [
          createMockKnowledge({
            content: 'AI is transforming the world',
            category: 'fact',
            tags: ['technology'],
          }),
          createMockKnowledge({
            content: 'I had a great experience at the new restaurant',
            category: 'experience',
            tags: ['food'],
          }),
        ];
        mockStorage.get.mockResolvedValue(existingKnowledge);

        const args = {
          query: 'the',
          category: 'experience' as const,
        };

        const result = await searchKnowledgeFunction.handler(
          args,
          mockToolContext
        );

        expect(result).toEqual({
          success: true,
          results: [
            {
              content: 'I had a great experience at the new restaurant',
              category: 'experience',
              tags: ['food'],
            },
          ],
        });
      });

      it('最大5件までの検索結果を (アクセス回数, 最近アクセス日時) の順に返す', async () => {
        const existingKnowledge = Array.from({ length: 10 }, (_, i) =>
          createMockKnowledge({
            content: `Common knowledge ${i + 1}`,
            accessCount: Math.floor(i / 2), // アクセス数が多い順にソートされるように
            lastAccessedAt: new Date(2025, 0, -i).toISOString(), // 同じアクセス数の場合は最近アクセスされた順
          })
        );
        mockStorage.get.mockResolvedValue(existingKnowledge);

        const args = {
          query: 'common',
        };

        const result = await searchKnowledgeFunction.handler(
          args,
          mockToolContext
        );

        expect(result).toEqual({
          success: true,
          results: [
            {
              content: 'Common knowledge 9',
              category: 'other',
              tags: [],
            },
            {
              content: 'Common knowledge 10',
              category: 'other',
              tags: [],
            },
            {
              content: 'Common knowledge 7',
              category: 'other',
              tags: [],
            },
            {
              content: 'Common knowledge 8',
              category: 'other',
              tags: [],
            },
            {
              content: 'Common knowledge 5',
              category: 'other',
              tags: [],
            },
          ],
        });
      });

      it('ヒットした知識のaccessCount、lastAccessedAt、forgottenAtが更新される', async () => {
        const existingKnowledge = [
          createMockKnowledge({
            content: 'AI is transforming the world',
            accessCount: 3,
            lastAccessedAt: '2025-01-20T00:00:00.000Z',
          }),
        ];
        mockStorage.get.mockResolvedValue(existingKnowledge);

        const args = {
          query: 'ai',
        };

        const result = await searchKnowledgeFunction.handler(
          args,
          mockToolContext
        );

        expect(result).toEqual({
          success: true,
          results: [
            {
              content: 'AI is transforming the world',
              category: 'other',
              tags: [],
            },
          ],
        });

        // accessCount: 3 → 4
        // lastAccessedAt: 2025-08-04T08:00:00.000Z（テスト時刻）
        // forgottenAt: 2025-08-04 + 2^4日 * 1(other) = 2025-08-04 + 16日 = 2025-08-20
        expect(mockStorage.put).toHaveBeenCalledWith(
          'knowledge',
          expect.arrayContaining([
            expect.objectContaining({
              content: 'AI is transforming the world',
              accessCount: 4,
              lastAccessedAt: new Date().toISOString(),
              forgottenAt: '2025-08-20T08:00:00.000Z',
            }),
          ])
        );
      });

      it('検索ヒット時にカテゴリー補正が適用されたforgottenAtが計算される', async () => {
        const existingKnowledge = [
          createMockKnowledge({
            content: 'Important rule to remember',
            category: 'rule',
            accessCount: 1,
            lastAccessedAt: '2025-01-20T00:00:00.000Z',
          }),
        ];
        mockStorage.get.mockResolvedValue(existingKnowledge);

        const args = {
          query: 'rule',
        };

        await searchKnowledgeFunction.handler(args, mockToolContext);

        // accessCount: 1 → 2
        // forgottenAt: 2025-08-04 + 2^2日 * 5(rule) = 2025-08-04 + 20日 = 2025-08-24
        expect(mockStorage.put).toHaveBeenCalledWith(
          'knowledge',
          expect.arrayContaining([
            expect.objectContaining({
              content: 'Important rule to remember',
              category: 'rule',
              accessCount: 2,
              forgottenAt: '2025-08-24T08:00:00.000Z',
            }),
          ])
        );
      });

      it('検索結果がない場合は空配列を返す', async () => {
        const existingKnowledge = [
          createMockKnowledge({
            content: 'Unrelated content',
          }),
        ];
        mockStorage.get.mockResolvedValue(existingKnowledge);

        const args = {
          query: 'nonexistent query',
        };

        const result = await searchKnowledgeFunction.handler(
          args,
          mockToolContext
        );

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.results).toEqual([]);
        }
      });

      it('知識が存在しない場合は空配列を返す', async () => {
        mockStorage.get.mockResolvedValue(undefined);

        const args = {
          query: 'any query',
        };

        const result = await searchKnowledgeFunction.handler(
          args,
          mockToolContext
        );

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.results).toEqual([]);
        }
      });

      it('storage.getでエラーが発生した場合はエラーを返す', async () => {
        mockStorage.get.mockRejectedValue(new Error('Storage get error'));

        const args = {
          query: 'query that fails',
        };

        const result = await searchKnowledgeFunction.handler(
          args,
          mockToolContext
        );

        expect(result).toEqual({
          success: false,
          error: 'Failed to search knowledge',
        });
        expect(mockStorage.put).not.toHaveBeenCalled();
      });

      it('storage.putでエラーが発生した場合はエラーを返す', async () => {
        mockStorage.put.mockRejectedValue(new Error('Storage put error'));

        const existingKnowledge = [
          createMockKnowledge({
            content: 'AI is transforming the world',
          }),
        ];
        mockStorage.get.mockResolvedValue(existingKnowledge);

        const args = {
          query: 'ai',
        };

        const result = await searchKnowledgeFunction.handler(
          args,
          mockToolContext
        );

        expect(result).toEqual({
          success: false,
          error: 'Failed to search knowledge',
        });
      });
    });
  });
});
