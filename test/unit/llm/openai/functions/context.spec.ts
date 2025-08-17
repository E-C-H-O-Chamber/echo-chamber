import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  storeContextFunction,
  recallContextFunction,
} from '../../../../../src/llm/openai/functions/context';
import { mockToolContext } from '../../../../mocks/tool';

describe('Context Functions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('storeContextFunction', () => {
    it('name', () => {
      expect(storeContextFunction.name).toBe('store_context');
    });

    it('description', () => {
      expect(storeContextFunction.description).toBeDefined();
    });

    it('parameters', () => {
      const { parameters } = storeContextFunction;
      expect(parameters).toBeDefined();
      expect(parameters).toHaveProperty('context');
      expect(parameters.context.def.type).toBe('string');
      expect(parameters.context.description).toBeDefined();
    });

    describe('handler', () => {
      it('正常なcontextでコンテキストを保存する', async () => {
        const args = { context: 'test context content' };
        const result = await storeContextFunction.handler(
          args,
          mockToolContext
        );

        expect(mockToolContext.storage.put).toHaveBeenCalledWith(
          'context',
          'test context content'
        );
        expect(result).toEqual({ success: true });
      });

      it('500文字制限でバリデーションエラーが発生する', async () => {
        const args = { context: 'a'.repeat(501) };
        const result = await storeContextFunction.handler(
          args,
          mockToolContext
        );
        expect(result).toEqual({
          success: false,
          error: 'Context exceeds maximum length of 200 characters',
        });
      });

      it('空文字列は許可される', async () => {
        const args = { context: '' };
        const result = await storeContextFunction.handler(
          args,
          mockToolContext
        );

        expect(mockToolContext.storage.put).toHaveBeenCalledWith('context', '');
        expect(result).toEqual({ success: true });
      });

      it('storage.putでエラーが発生した場合はエラーを返す', async () => {
        mockToolContext.storage.put.mockRejectedValue(
          new Error('Storage error')
        );

        const args = { context: 'test content' };
        const result = await storeContextFunction.handler(
          args,
          mockToolContext
        );

        expect(result).toEqual({
          success: false,
          error: 'Failed to store context',
        });
      });
    });
  });

  describe('recallContextFunction', () => {
    it('name', () => {
      expect(recallContextFunction.name).toBe('recall_context');
    });

    it('description', () => {
      expect(recallContextFunction.description).toBeDefined();
    });

    it('parameters', () => {
      const { parameters } = recallContextFunction;
      expect(parameters).toBeDefined();
      expect(parameters).toEqual({});
    });

    describe('handler', () => {
      it('保存されたコンテキストを読み出す', async () => {
        mockToolContext.storage.get.mockResolvedValue('saved context content');

        const args = {};
        const result = await recallContextFunction.handler(
          args,
          mockToolContext
        );

        expect(mockToolContext.storage.get).toHaveBeenCalledWith('context');
        expect(result).toEqual({
          success: true,
          context: 'saved context content',
        });
      });

      it('コンテキストが空の場合は "no context." を返す', async () => {
        mockToolContext.storage.get.mockResolvedValue('');

        const args = {};
        const result = await recallContextFunction.handler(
          args,
          mockToolContext
        );

        expect(mockToolContext.storage.get).toHaveBeenCalledWith('context');
        expect(result).toEqual({
          success: true,
          context: 'no context.',
        });
      });

      it('コンテキストが存在しない場合は "no context." を返す', async () => {
        mockToolContext.storage.get.mockResolvedValue(undefined);

        const args = {};
        const result = await recallContextFunction.handler(
          args,
          mockToolContext
        );

        expect(mockToolContext.storage.get).toHaveBeenCalledWith('context');
        expect(result).toEqual({
          success: true,
          context: 'no context.',
        });
      });

      it('storage.getでエラーが発生した場合はエラーを返す', async () => {
        mockToolContext.storage.get.mockRejectedValue(
          new Error('Storage error')
        );

        const args = {};
        const result = await recallContextFunction.handler(
          args,
          mockToolContext
        );

        expect(result).toEqual({
          success: false,
          error: 'Failed to recall context',
        });
      });
    });
  });
});
