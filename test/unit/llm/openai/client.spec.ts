import { describe, expect, it } from 'vitest';
import {
  accumulateUsage,
  formatInputItem,
  formatOutputItem,
  formatMessage,
  formatBlock,
  formatFunctionCall,
} from '../../../../src/llm/openai/client';

import type {
  ResponseUsage,
  ResponseInputItem,
  ResponseOutputItem,
  EasyInputMessage,
  ResponseOutputMessage,
  ResponseFunctionToolCall,
} from 'openai/resources/responses/responses';

describe('accumulateUsage', () => {
  describe('基本的な累積', () => {
    it('2つのUsageオブジェクトを正しく累積する', () => {
      const total: ResponseUsage = {
        input_tokens: 100,
        input_tokens_details: { cached_tokens: 10 },
        output_tokens: 50,
        output_tokens_details: { reasoning_tokens: 5 },
        total_tokens: 150,
      };

      const additional: ResponseUsage = {
        input_tokens: 200,
        input_tokens_details: { cached_tokens: 20 },
        output_tokens: 75,
        output_tokens_details: { reasoning_tokens: 15 },
        total_tokens: 275,
      };

      const result = accumulateUsage(total, additional);

      expect(result).toEqual({
        input_tokens: 300,
        input_tokens_details: { cached_tokens: 30 },
        output_tokens: 125,
        output_tokens_details: { reasoning_tokens: 20 },
        total_tokens: 425,
      });
    });

    it('一方がゼロ値の場合でも正しく動作する', () => {
      const total: ResponseUsage = {
        input_tokens: 100,
        input_tokens_details: { cached_tokens: 10 },
        output_tokens: 50,
        output_tokens_details: { reasoning_tokens: 5 },
        total_tokens: 150,
      };

      const zero: ResponseUsage = {
        input_tokens: 0,
        input_tokens_details: { cached_tokens: 0 },
        output_tokens: 0,
        output_tokens_details: { reasoning_tokens: 0 },
        total_tokens: 0,
      };

      const result = accumulateUsage(total, zero);

      expect(result).toEqual(total);
    });

    it('両方ゼロ値の場合でもエラーにならない', () => {
      const zero: ResponseUsage = {
        input_tokens: 0,
        input_tokens_details: { cached_tokens: 0 },
        output_tokens: 0,
        output_tokens_details: { reasoning_tokens: 0 },
        total_tokens: 0,
      };

      const result = accumulateUsage(zero, zero);

      expect(result).toEqual(zero);
    });

    it('大きな数値でも正しく累積される', () => {
      const large1: ResponseUsage = {
        input_tokens: 999999,
        input_tokens_details: { cached_tokens: 123456 },
        output_tokens: 888888,
        output_tokens_details: { reasoning_tokens: 654321 },
        total_tokens: 1888887,
      };

      const large2: ResponseUsage = {
        input_tokens: 111111,
        input_tokens_details: { cached_tokens: 22222 },
        output_tokens: 333333,
        output_tokens_details: { reasoning_tokens: 44444 },
        total_tokens: 444444,
      };

      const result = accumulateUsage(large1, large2);

      expect(result).toEqual({
        input_tokens: 1111110,
        input_tokens_details: { cached_tokens: 145678 },
        output_tokens: 1222221,
        output_tokens_details: { reasoning_tokens: 698765 },
        total_tokens: 2333331,
      });
    });
  });
});

describe('formatBlock', () => {
  it('roleとcontentを正しいブロック形式でフォーマットする', () => {
    const result = formatBlock('user', 'Hello, world!');
    expect(result).toBe('[user]:\nHello, world!');
  });

  it('空のcontentでも正しく動作する', () => {
    const result = formatBlock('assistant', '');
    expect(result).toBe('[assistant]:\n');
  });

  it('複数行のcontentを正しく処理する', () => {
    const multilineContent = 'First line\nSecond line\nThird line';
    const result = formatBlock('system', multilineContent);
    expect(result).toBe('[system]:\nFirst line\nSecond line\nThird line');
  });
});

describe('formatFunctionCall', () => {
  it('Function callを正しくフォーマットする', () => {
    const functionCall: ResponseFunctionToolCall = {
      type: 'function_call',
      call_id: 'call_123',
      name: 'test_function',
      arguments: '{"param": "value"}',
      status: 'completed',
    };

    const result = formatFunctionCall(functionCall);
    expect(result).toBe(
      '[function call] call_123 (completed)\ntest_function({"param": "value"})'
    );
  });

  it('異なるstatusでも正しく動作する', () => {
    const functionCall: ResponseFunctionToolCall = {
      type: 'function_call',
      call_id: 'call_456',
      name: 'another_function',
      arguments: '{}',
      status: 'in_progress',
    };

    const result = formatFunctionCall(functionCall);
    expect(result).toBe(
      '[function call] call_456 (in_progress)\nanother_function({})'
    );
  });
});

describe('formatMessage', () => {
  describe('文字列content', () => {
    it('文字列contentのメッセージを正しくフォーマットする', () => {
      const message: EasyInputMessage = {
        role: 'user',
        content: 'Hello, how are you?',
      };

      const result = formatMessage(message);
      expect(result).toBe('[user]:\nHello, how are you?');
    });
  });

  describe('配列content', () => {
    it('input_textタイプのcontentを正しくフォーマットする', () => {
      const message: ResponseInputItem.Message = {
        type: 'message',
        role: 'user',
        content: [
          {
            type: 'input_text',
            text: 'Hello, world!',
          },
        ],
      };

      const result = formatMessage(message);
      expect(result).toBe('[user]:\nHello, world!');
    });

    it('output_textタイプのcontentを正しくフォーマットする', () => {
      const message: ResponseOutputMessage = {
        type: 'message',
        role: 'assistant',
        id: 'msg_123',
        status: 'completed',
        content: [
          {
            type: 'output_text',
            text: 'Hello back!',
            annotations: [],
          },
        ],
      };

      const result = formatMessage(message);
      expect(result).toBe('[assistant]:\nHello back!');
    });

    it('input_imageタイプのcontentを正しくフォーマットする', () => {
      const message: ResponseInputItem.Message = {
        type: 'message',
        role: 'user',
        content: [
          {
            type: 'input_image',
            image_url: 'https://example.com/image.jpg',
            detail: 'auto',
          },
        ],
      };

      const result = formatMessage(message);
      expect(result).toBe(
        '[user]:\n<image>https://example.com/image.jpg</image>'
      );
    });

    it('input_fileタイプのcontentを正しくフォーマットする（file_url使用）', () => {
      const message: ResponseInputItem.Message = {
        type: 'message',
        role: 'user',
        content: [
          {
            type: 'input_file',
            file_url: 'https://example.com/file.pdf',
            filename: 'document.pdf',
          },
        ],
      };

      const result = formatMessage(message);
      expect(result).toBe('[user]:\n<file>https://example.com/file.pdf</file>');
    });

    it('input_fileタイプのcontentを正しくフォーマットする（filename使用）', () => {
      const message: ResponseInputItem.Message = {
        type: 'message',
        role: 'user',
        content: [
          {
            type: 'input_file',
            filename: 'document.pdf',
          },
        ],
      };

      const result = formatMessage(message);
      expect(result).toBe('[user]:\n<file>document.pdf</file>');
    });

    it('refusalタイプのcontentを正しくフォーマットする', () => {
      const message: ResponseOutputMessage = {
        type: 'message',
        role: 'assistant',
        id: 'msg_456',
        status: 'completed',
        content: [
          {
            type: 'refusal',
            refusal: 'I cannot assist with that request.',
          },
        ],
      };

      const result = formatMessage(message);
      expect(result).toBe(
        '[assistant]:\n<refusal>I cannot assist with that request.</refusal>'
      );
    });

    it('複数のcontentアイテムを正しく結合する', () => {
      const message: ResponseInputItem.Message = {
        type: 'message',
        role: 'user',
        content: [
          {
            type: 'input_text',
            text: 'Here is an image:',
          },
          {
            type: 'input_image',
            image_url: 'https://example.com/image.jpg',
            detail: 'auto',
          },
          {
            type: 'input_text',
            text: 'What do you see?',
          },
        ],
      };

      const result = formatMessage(message);
      expect(result).toBe(
        '[user]:\nHere is an image:\n\n[user]:\n<image>https://example.com/image.jpg</image>\n\n[user]:\nWhat do you see?'
      );
    });
  });
});

describe('formatInputItem', () => {
  it('messageタイプのアイテムを正しくフォーマットする', () => {
    const item: ResponseInputItem = {
      type: 'message',
      role: 'user',
      content: 'Hello, world!',
    };

    const result = formatInputItem(item);
    expect(result).toBe('[user]:\nHello, world!');
  });

  it('function_callタイプのアイテムを正しくフォーマットする', () => {
    const item: ResponseInputItem = {
      type: 'function_call',
      call_id: 'call_123',
      name: 'test_function',
      arguments: '{"param": "value"}',
      status: 'completed',
    };

    const result = formatInputItem(item);
    expect(result).toBe(
      '[function call] call_123 (completed)\ntest_function({"param": "value"})'
    );
  });

  it('function_call_outputタイプのアイテムを正しくフォーマットする', () => {
    const item: ResponseInputItem = {
      type: 'function_call_output',
      call_id: 'call_123',
      output: '{"result": "success"}',
      status: 'completed',
    };

    const result = formatInputItem(item);
    expect(result).toBe(
      '[function call output] call_123 (completed)\n{\n  "result": "success"\n}'
    );
  });

  it('contentプロパティを持つアイテム（レガシー）を正しくフォーマットする', () => {
    const item = {
      role: 'user',
      content: 'Legacy message format',
    } as ResponseInputItem;

    const result = formatInputItem(item);
    expect(result).toBe('[user]:\nLegacy message format');
  });

  it('アイテム参照を正しくフォーマットする', () => {
    const item = {
      id: 'item_123',
    } as ResponseInputItem;

    const result = formatInputItem(item);
    expect(result).toBe('<item_reference>item_123</item_reference>');
  });

  it('未知のタイプを正しく処理する', () => {
    const item = {
      type: 'unknown_type',
    } as unknown as ResponseInputItem;

    const result = formatInputItem(item);
    expect(result).toBe('<unknown_type />');
  });
});

describe('formatOutputItem', () => {
  it('messageタイプのアイテムを正しくフォーマットする', () => {
    const item: ResponseOutputItem = {
      type: 'message',
      role: 'assistant',
      id: 'msg_789',
      status: 'completed',
      content: [
        {
          type: 'output_text',
          text: 'Hello back!',
          annotations: [],
        },
      ],
    };

    const result = formatOutputItem(item);
    expect(result).toBe('[assistant]:\nHello back!');
  });

  it('function_callタイプのアイテムを正しくフォーマットする', () => {
    const item: ResponseOutputItem = {
      type: 'function_call',
      call_id: 'call_456',
      name: 'output_function',
      arguments: '{"output": "data"}',
      status: 'completed',
    };

    const result = formatOutputItem(item);
    expect(result).toBe(
      '[function call] call_456 (completed)\noutput_function({"output": "data"})'
    );
  });

  it('未知のタイプを正しく処理する', () => {
    const item = {
      type: 'unknown_output_type',
    } as unknown as ResponseOutputItem;

    const result = formatOutputItem(item);
    expect(result).toBe('<unknown_output_type />');
  });
});
