import { z } from 'zod';

import { getErrorMessage } from '../../../utils/error';

import { Tool } from './index';

import type { Knowledge } from '../../../echo/types';

const MAX_KNOWLEDGE_COUNT = 100;
const MAX_CONTENT_LENGTH = 1000;
const SEARCH_RESULT_LIMIT = 5;

const knowledgeCategorySchema = z.enum([
  'fact',
  'experience',
  'insight',
  'pattern',
  'rule',
  'preference',
  'other',
]);

export const storeKnowledgeFunction = new Tool(
  'store_knowledge',
  'Preserve valuable information from conversations for future reference and learning. Use this to store key facts, solutions to problems, user preferences, successful approaches, lessons learned, or important insights that should be remembered across conversations.',
  {
    knowledge: z
      .string()
      .min(1)
      .max(MAX_CONTENT_LENGTH)
      .trim()
      .describe(
        `The information to preserve for future reference. Write clear, self-contained content that will be useful when retrieved later. Include context and specifics. Maximum ${MAX_CONTENT_LENGTH} characters. Duplicate content will be rejected.`
      ),
    category: knowledgeCategorySchema
      .optional()
      .describe(
        'Classification of the knowledge type to aid future searching and organization. Choose the most appropriate: "fact" (objective information, specifications, data), "experience" (specific events, lessons from situations), "insight" (analysis, conclusions, understanding gained), "pattern" (recurring themes, observed trends), "rule" (guidelines, constraints, policies to follow), "preference" (user preferences, likes/dislikes, personal choices), "other" (general knowledge). Defaults to "other" if not specified.'
      ),
  },
  async ({ knowledge, category = 'other' }, ctx) => {
    try {
      const existingKnowledge =
        (await ctx.storage.get<Knowledge[]>('knowledge')) ?? [];

      // 重複チェック
      if (existingKnowledge.some((k) => k.content === knowledge)) {
        return {
          success: false,
          error: 'Knowledge already exists',
        };
      }

      // 記憶容量を超過する場合はLRUで削除
      if (existingKnowledge.length >= MAX_KNOWLEDGE_COUNT) {
        const lruKnowledge = existingKnowledge.reduce((acc, curr) => {
          if (new Date(curr.lastAccessedAt) < new Date(acc.lastAccessedAt)) {
            return curr;
          }
          return acc;
        });

        existingKnowledge.splice(existingKnowledge.indexOf(lruKnowledge), 1);
        await ctx.logger.info(
          `Knowledge capacity reached. Removed LRU knowledge: ${lruKnowledge.content}`
        );
      }

      const newKnowledge: Knowledge = {
        content: knowledge,
        category,
        tags: [],
        accessCount: 0,
        lastAccessedAt: new Date().toISOString(),
      };
      const updatedKnowledge = [...existingKnowledge, newKnowledge];
      await ctx.storage.put('knowledge', updatedKnowledge);

      return {
        success: true,
      };
    } catch (error) {
      await ctx.logger.error(
        `Error storing knowledge: ${getErrorMessage(error)}`
      );
      return {
        success: false,
        error: 'Failed to store knowledge',
      };
    }
  }
);

export const searchKnowledgeFunction = new Tool(
  'search_knowledge',
  'Retrieve previously stored knowledge, facts, experiences, and insights from past conversations. Use this when you need to recall specific information, solutions, or lessons learned. Searches by partial text matching (case-insensitive) and returns up to 5 most relevant results, ranked by access frequency and recency.',
  {
    query: z
      .string()
      .min(1)
      .max(MAX_CONTENT_LENGTH)
      .trim()
      .toLowerCase()
      .describe(
        'Keywords or phrases to search for within stored knowledge content. Use specific, descriptive terms for better results. Searches are case-insensitive and match partial content.'
      ),
    category: knowledgeCategorySchema
      .optional()
      .describe(
        'Optional filter by knowledge type. Available categories: "fact" (objective information), "experience" (past events/lessons), "insight" (conclusions/understanding), "pattern" (recurring themes), "rule" (guidelines/constraints), "preference" (user preferences), "other" (general knowledge). Use to narrow results to specific types of information.'
      ),
  },
  async ({ query, category }, ctx) => {
    try {
      const existingKnowledge = await ctx.storage.get<Knowledge[]>('knowledge');

      if (!existingKnowledge || existingKnowledge.length === 0) {
        return {
          success: true,
          results: [],
        };
      }

      // 検索とフィルタリング
      const knowledgeWithMatchCount = existingKnowledge.map((k) => {
        // クエリ検索（空白分割で一部単語でもマッチすればヒット、マッチ数をカウント）
        const queryKeywords = query.split(/\s+/);
        const contentLower = k.content.toLowerCase();
        const matchCount = queryKeywords.filter((keyword) =>
          contentLower.includes(keyword)
        ).length;

        // カテゴリフィルタ
        const matchesCategory = !category || k.category === category;

        return {
          ...k,
          matchCount,
          matchesFilters: matchCount > 0 && matchesCategory,
        };
      });

      // フィルタリング
      const filteredKnowledge = knowledgeWithMatchCount.filter(
        (k) => k.matchesFilters
      );

      // ソート: マッチ数（多い順）→アクセス回数（多い順）→最近アクセス日時（新しい順）
      filteredKnowledge.sort((a, b) => {
        if (a.matchCount !== b.matchCount) {
          return b.matchCount - a.matchCount;
        }
        if (a.accessCount !== b.accessCount) {
          return b.accessCount - a.accessCount;
        }
        return (
          new Date(b.lastAccessedAt).getTime() -
          new Date(a.lastAccessedAt).getTime()
        );
      });

      // 最大5件まで制限
      const results = filteredKnowledge.slice(0, SEARCH_RESULT_LIMIT);

      // ヒットした知識のaccessCountとlastAccessedAtを更新
      const lastAccessedAt = new Date().toISOString();
      if (results.length > 0) {
        const updatedKnowledge = existingKnowledge.map((k) => {
          const foundResult = results.find((r) => r.content === k.content);
          if (foundResult) {
            return {
              ...k,
              accessCount: k.accessCount + 1,
              lastAccessedAt,
            };
          }
          return k;
        });
        await ctx.storage.put('knowledge', updatedKnowledge);
      }

      return {
        success: true,
        results: results.map((r) => ({
          content: r.content,
          category: r.category,
          tags: r.tags,
        })),
      };
    } catch (error) {
      await ctx.logger.error(
        `Error searching knowledge: ${getErrorMessage(error)}`
      );
      return {
        success: false,
        error: 'Failed to search knowledge',
      };
    }
  }
);
