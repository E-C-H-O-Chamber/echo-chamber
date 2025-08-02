import { env } from 'cloudflare:test';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import {
  Tool,
  type ToolResult,
} from '../../../../../src/llm/openai/functions/index';

describe('Tool', () => {
  const mockName = 'test_tool';
  const mockDescription = 'A test tool for testing purposes';
  const mockParameters = {
    message: z.string().describe('The message to process'),
    count: z.number().min(1).describe('Number of times to process'),
  };
  const mockHandler = vi.fn();

  describe('definition', () => {
    it('正しいFunctionTool形式のオブジェクトを返す', () => {
      const tool = new Tool(
        mockName,
        mockDescription,
        mockParameters,
        mockHandler
      );
      const { type, name, description, parameters, strict } = tool.definition;

      expect(type).toBe('function');
      expect(name).toBe(mockName);
      expect(description).toBe(mockDescription);
      expect(parameters).toEqual(z.toJSONSchema(z.object(mockParameters)));
      expect(strict).toBe(true);
    });

    it('空のparametersでも正しく動作する', () => {
      const emptyParameters = {};
      const tool = new Tool(
        mockName,
        mockDescription,
        emptyParameters,
        mockHandler
      );
      const { type, name, description, parameters, strict } = tool.definition;

      expect(type).toBe('function');
      expect(name).toBe(mockName);
      expect(description).toBe(mockDescription);
      expect(parameters).toEqual(z.toJSONSchema(z.object(emptyParameters)));
      expect(strict).toBe(true);
    });
  });

  describe('execute', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    describe('成功ケース', () => {
      it('正常なJSON文字列でhandlerが実行される', () => {
        const successResult: ToolResult = { success: true };
        mockHandler.mockReturnValue(successResult);

        const tool = new Tool(
          mockName,
          mockDescription,
          mockParameters,
          mockHandler
        );
        const args = JSON.stringify({ message: 'test', count: 1 });
        const result = tool.execute(args, env);

        expect(mockHandler).toHaveBeenCalledWith(
          { message: 'test', count: 1 },
          env
        );
        expect(result).toBe(successResult);
      });

      it('async handlerが正しく動作する', async () => {
        const successResult: ToolResult = { success: true };
        const asyncHandler = vi.fn().mockResolvedValue(successResult);

        const tool = new Tool(
          mockName,
          mockDescription,
          mockParameters,
          asyncHandler
        );
        const args = JSON.stringify({ message: 'test', count: 1 });
        const result = await tool.execute(args, env);

        expect(asyncHandler).toHaveBeenCalledWith(
          { message: 'test', count: 1 },
          env
        );
        expect(result).toBe(successResult);
      });

      it('handlerのエラー結果が正しく返される', () => {
        const errorResult: ToolResult = {
          success: false,
          error: 'Handler error',
        };
        mockHandler.mockReturnValue(errorResult);

        const tool = new Tool(
          mockName,
          mockDescription,
          mockParameters,
          mockHandler
        );
        const args = JSON.stringify({ message: 'test', count: 1 });
        const result = tool.execute(args, env);

        expect(mockHandler).toHaveBeenCalledWith(
          { message: 'test', count: 1 },
          env
        );
        expect(result).toBe(errorResult);
      });
    });

    describe('失敗ケース', () => {
      it('不正なJSON文字列でエラーが発生する', () => {
        const tool = new Tool(
          mockName,
          mockDescription,
          mockParameters,
          mockHandler
        );
        const invalidArgs = '{"message": "test", "count":}';

        expect(() => tool.execute(invalidArgs, env)).toThrow();
        expect(mockHandler).not.toHaveBeenCalled();
      });

      it('パラメータバリデーション失敗でエラーが発生する', () => {
        const tool = new Tool(
          mockName,
          mockDescription,
          mockParameters,
          mockHandler
        );
        const invalidArgs = JSON.stringify({
          message: 'test',
          count: 'invalid',
        });

        expect(() => tool.execute(invalidArgs, env)).toThrow();
        expect(mockHandler).not.toHaveBeenCalled();
      });

      it('必須パラメータが不足している場合エラーが発生する', () => {
        const tool = new Tool(
          mockName,
          mockDescription,
          mockParameters,
          mockHandler
        );
        const incompleteArgs = JSON.stringify({ message: 'test' });

        expect(() => tool.execute(incompleteArgs, env)).toThrow();
        expect(mockHandler).not.toHaveBeenCalled();
      });

      it('handler内で例外が発生した場合、例外が再スローされる', () => {
        const error = new Error('Handler exception');
        mockHandler.mockImplementation(() => {
          throw error;
        });

        const tool = new Tool(
          mockName,
          mockDescription,
          mockParameters,
          mockHandler
        );
        const args = JSON.stringify({ message: 'test', count: 1 });

        expect(() => tool.execute(args, env)).toThrow(error);
      });

      it('async handler内で例外が発生した場合、Promise rejectされる', async () => {
        const error = new Error('Async handler exception');
        const asyncHandler = vi.fn().mockRejectedValue(error);

        const tool = new Tool(
          mockName,
          mockDescription,
          mockParameters,
          asyncHandler
        );
        const args = JSON.stringify({ message: 'test', count: 1 });

        await expect(tool.execute(args, env)).rejects.toThrow(error);
      });
    });

    describe('エッジケース', () => {
      it('空のオブジェクトパラメータで正しく動作する', () => {
        const emptyParameters = {};
        const successResult: ToolResult = { success: true };
        const handler = vi.fn().mockReturnValue(successResult);

        const tool = new Tool(
          mockName,
          mockDescription,
          emptyParameters,
          handler
        );
        const args = JSON.stringify({});
        const result = tool.execute(args, env);

        expect(handler).toHaveBeenCalledWith({}, env);
        expect(result).toBe(successResult);
      });

      it('オプショナルパラメータが省略された場合でも動作する', () => {
        const parametersWithOptional = {
          message: z.string().describe('Required message'),
          count: z.number().optional().describe('Optional count'),
        };
        const successResult: ToolResult = { success: true };
        const handler = vi.fn().mockReturnValue(successResult);

        const tool = new Tool(
          mockName,
          mockDescription,
          parametersWithOptional,
          handler
        );
        const args = JSON.stringify({ message: 'test' });
        const result = tool.execute(args, env);

        expect(handler).toHaveBeenCalledWith({ message: 'test' }, env);
        expect(result).toBe(successResult);
      });

      it('デフォルト値が設定されたパラメータで動作する', () => {
        const parametersWithDefault = {
          message: z.string().describe('Required message'),
          count: z
            .number()
            .optional()
            .default(1)
            .describe('Count with default value'),
        };
        const successResult: ToolResult = { success: true };
        const handler = vi.fn().mockReturnValue(successResult);

        const tool = new Tool(
          mockName,
          mockDescription,
          parametersWithDefault,
          handler
        );
        const args = JSON.stringify({ message: 'test' });
        const result = tool.execute(args, env);

        expect(handler).toHaveBeenCalledWith(
          { message: 'test', count: 1 },
          env
        );
        expect(result).toBe(successResult);
      });
    });
  });
});
