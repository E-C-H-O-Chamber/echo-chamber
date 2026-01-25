import { z } from 'zod';

import { getErrorMessage } from '../../../utils/error';

import { Tool } from './index';

const MAX_CONTENT_LENGTH = 500;
const MAX_QUERY_LENGTH = 500;

const emotionSchema = z.object({
  valence: z
    .number()
    .min(-1.0)
    .max(1.0)
    .describe('Emotional valence from -1.0 (negative) to 1.0 (positive)'),
  arousal: z
    .number()
    .min(0.0)
    .max(1.0)
    .describe('Emotional arousal from 0.0 (calm) to 1.0 (excited)'),
  labels: z
    .array(z.string())
    .describe(
      'Emotion labels (e.g., "joy", "sadness", "surprise", "intellectual-engagement")'
    ),
});

export const storeMemoryFunction = new Tool(
  'store_memory',
  'Store an episodic memory with emotional context for future semantic retrieval. Use this to preserve meaningful experiences, conversations, or moments that have emotional significance and should be remembered long-term.',
  {
    content: z
      .string()
      .min(1)
      .max(MAX_CONTENT_LENGTH)
      .trim()
      .describe(
        `The full content of the memory with all relevant details. Maximum ${MAX_CONTENT_LENGTH} characters.`
      ),
    emotion: emotionSchema.describe(
      'The emotional context associated with this memory.'
    ),
  },
  async ({ content, emotion }, ctx) => {
    try {
      await ctx.memorySystem.storeMemory(content, emotion);
      return { success: true };
    } catch (error) {
      await ctx.logger.error(`Error storing memory: ${getErrorMessage(error)}`);
      return {
        success: false,
        error: 'Failed to store memory',
      };
    }
  }
);

export const searchMemoryFunction = new Tool(
  'search_memory',
  'Search for relevant memories using semantic similarity. Use this to recall past experiences, find related memories, or retrieve memories that are semantically similar to a query.',
  {
    query: z
      .string()
      .min(1)
      .max(MAX_QUERY_LENGTH)
      .trim()
      .describe(
        'The search query. Will be embedded and compared against stored memories using cosine similarity.'
      ),
  },
  async ({ query }, ctx) => {
    try {
      const results = await ctx.memorySystem.searchMemory(query);
      return {
        success: true,
        results: results.map(({ content, emotion, createdAt }) => ({
          content,
          emotion,
          createdAt,
        })),
      };
    } catch (error) {
      await ctx.logger.error(
        `Error searching memory: ${getErrorMessage(error)}`
      );
      return {
        success: false,
        error: 'Failed to search memory',
      };
    }
  }
);
