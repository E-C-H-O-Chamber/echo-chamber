import { z } from 'zod';

import { getErrorMessage } from '../../../utils/error';

import { Tool } from './index';

export const storeContextFunction = new Tool(
  'store_context',
  'Store the current situation or important information in context.',
  {
    context: z
      .string()
      .describe('The context to be stored. Maximum 200 characters.'),
  },
  async ({ context }, ctx) => {
    try {
      // 余裕を持たせて500文字を超えるとエラー
      if (context.length > 500) {
        return {
          success: false,
          error: 'Context exceeds maximum length of 200 characters',
        };
      }
      await ctx.storage.put('context', context);
      return {
        success: true,
      };
    } catch (error) {
      await ctx.logger.error(
        `Error storing context: ${getErrorMessage(error)}`
      );
      return {
        success: false,
        error: 'Failed to store context',
      };
    }
  }
);

export const recallContextFunction = new Tool(
  'recall_context',
  'Recall a previously recorded context.',
  {},
  async (_args, ctx) => {
    try {
      const context = (await ctx.storage.get<string>('context')) ?? '';
      return {
        success: true,
        context: context || 'no context.',
      };
    } catch (error) {
      await ctx.logger.error(
        `Error recalling context: ${getErrorMessage(error)}`
      );
      return {
        success: false,
        error: 'Failed to recall context',
      };
    }
  }
);
