import { env } from 'cloudflare:test';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  accumulateUsage,
  formatLogOutput,
  formatInputItem,
  formatOutputItem,
  formatMessage,
  formatBlock,
  formatFunctionCall,
  OpenAIClient,
} from '../../../../src/llm/openai/client';
import { thinkDeeplyFunction } from '../../../../src/llm/openai/functions/think';
import { mockToolContext } from '../../../mocks/tool';

import type {
  ResponseUsage,
  ResponseInputItem,
  ResponseOutputItem,
  EasyInputMessage,
  ResponseOutputMessage,
  ResponseFunctionToolCall,
} from 'openai/resources/responses/responses';

const mockCreateResponse = vi.fn();

vi.mock('openai', () => {
  return {
    default: vi.fn(() => ({
      responses: {
        create: mockCreateResponse,
      },
    })),
  };
});

describe('OpenAI Client', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('createResponse', async () => {
    const client = new OpenAIClient(
      env,
      [thinkDeeplyFunction],
      mockToolContext
    );
    const input = [
      {
        role: 'user' as const,
        content: 'Hello, how are you?',
      },
    ];
    mockCreateResponse.mockResolvedValue({});
    await client.createResponse(input);
    expect(mockCreateResponse).toHaveBeenCalledWith({
      input,
      model: 'gpt-5-2025-08-07',
      parallel_tool_calls: true,
      previous_response_id: undefined,
      reasoning: {
        effort: 'minimal',
      },
      store: true,
      stream: false,
      text: {
        format: {
          type: 'text',
        },
        verbosity: 'low',
      },
      tool_choice: 'auto',
      tools: [thinkDeeplyFunction.definition],
      truncation: 'auto',
    });
  });

  describe('executeFunction', () => {
    it('正常なツール使用', async () => {
      const client = new OpenAIClient(
        env,
        [thinkDeeplyFunction],
        mockToolContext
      );
      const result = await client.executeFunction({
        type: 'function_call',
        name: 'think_deeply',
        call_id: 'call_123',
        arguments: JSON.stringify({ thought: 'What is the meaning of life?' }),
      });
      expect(result).toBe(
        JSON.stringify({
          success: true,
        })
      );
    });

    it('未登録のツール使用', async () => {
      const client = new OpenAIClient(
        env,
        [thinkDeeplyFunction],
        mockToolContext
      );
      const result = await client.executeFunction({
        type: 'function_call',
        name: 'unknown_function',
        call_id: 'call_456',
        arguments: JSON.stringify({ param: 'value' }),
      });
      expect(result).toBe(
        JSON.stringify({
          error: "Function 'unknown_function' is not registered",
          available_functions: ['think_deeply'],
        })
      );
    });

    it('引数のパースエラー', async () => {
      const client = new OpenAIClient(
        env,
        [thinkDeeplyFunction],
        mockToolContext
      );
      const result = await client.executeFunction({
        type: 'function_call',
        name: 'think_deeply',
        call_id: 'call_789',
        arguments: 'invalid_json',
      });
      expect(result).toEqual(
        JSON.stringify({
          success: false,
          error: 'arguments is not valid JSON',
        })
      );
    });

    it('ツールの実行中にエラーが発生', async () => {
      const errorFunction = {
        name: 'error_function',
        description: 'A function that always fails',
        definition: {
          type: 'function',
          name: 'error_function',
          description: 'A function that always fails',
          parameters: {},
          strict: true,
        },
        execute: () => {
          throw new Error('Function execution error');
        },
      } as const;
      const client = new OpenAIClient(env, [errorFunction], mockToolContext);
      const result = await client.executeFunction({
        type: 'function_call',
        name: 'error_function',
        call_id: 'call_999',
        arguments: JSON.stringify({}),
      });
      expect(result).toEqual(
        JSON.stringify({
          success: false,
          error: 'Function execution error',
        })
      );
    });
  });

  describe('call', () => {
    it('シンプルな応答', async () => {
      const client = new OpenAIClient(
        env,
        [thinkDeeplyFunction],
        mockToolContext
      );
      const input: ResponseInputItem[] = [
        {
          role: 'user',
          content: 'Hello, how are you?',
        },
      ];
      const usage = {
        input_tokens: 0,
        input_tokens_details: { cached_tokens: 0 },
        output_tokens: 0,
        output_tokens_details: { reasoning_tokens: 0 },
        total_tokens: 0,
      };
      mockCreateResponse.mockResolvedValue({
        id: 'response_123',
        output: [],
        usage,
      });

      const response = await client.call(input);
      expect(mockCreateResponse).toHaveBeenCalledWith({
        input,
        model: 'gpt-5-2025-08-07',
        parallel_tool_calls: true,
        previous_response_id: undefined,
        reasoning: {
          effort: 'minimal',
        },
        store: true,
        stream: false,
        text: {
          format: {
            type: 'text',
          },
          verbosity: 'low',
        },
        tool_choice: 'auto',
        tools: [thinkDeeplyFunction.definition],
        truncation: 'auto',
      });
      expect(mockCreateResponse).toHaveBeenCalledTimes(1);
      expect(response).toEqual(usage);
    });

    it('ツールコールを含む応答', async () => {
      const client = new OpenAIClient(
        env,
        [thinkDeeplyFunction],
        mockToolContext
      );
      const input: ResponseInputItem[] = [
        {
          role: 'user',
          content: 'What is the meaning of life?',
        },
      ];
      const usage1 = {
        input_tokens: 10,
        input_tokens_details: { cached_tokens: 0 },
        output_tokens: 10,
        output_tokens_details: { reasoning_tokens: 0 },
        total_tokens: 20,
      };
      const usage2 = {
        input_tokens: 10,
        input_tokens_details: { cached_tokens: 5 },
        output_tokens: 15,
        output_tokens_details: { reasoning_tokens: 10 },
        total_tokens: 25,
      };
      const totalUsage = {
        input_tokens: 20,
        input_tokens_details: {
          cached_tokens: 5,
        },
        output_tokens: 25,
        output_tokens_details: {
          reasoning_tokens: 10,
        },
        total_tokens: 45,
      };
      mockCreateResponse.mockResolvedValueOnce({
        id: 'response_123',
        output: [
          {
            type: 'function_call',
            call_id: 'call_123',
            name: 'think_deeply',
            arguments: JSON.stringify({
              thought: 'What is the meaning of life?',
            }),
          },
        ],
        usage: usage1,
      });
      mockCreateResponse.mockResolvedValueOnce({
        id: 'response_456',
        output: [
          {
            type: 'message',
            role: 'assistant',
            content: [
              {
                type: 'output_text',
                text: 'The meaning of life is a philosophical question that has been asked for centuries. Different cultures and philosophies have offered various answers, but it ultimately depends on individual beliefs and values.',
              },
            ],
          },
        ],
        usage: usage2,
      });
      const nextInput = [
        {
          type: 'function_call_output',
          call_id: 'call_123',
          output: JSON.stringify({ success: true }),
        },
      ];
      const response = await client.call(input);
      expect(mockCreateResponse).toHaveBeenNthCalledWith(1, {
        input,
        model: 'gpt-5-2025-08-07',
        parallel_tool_calls: true,
        previous_response_id: undefined,
        reasoning: {
          effort: 'minimal',
        },
        store: true,
        stream: false,
        text: {
          format: {
            type: 'text',
          },
          verbosity: 'low',
        },
        tool_choice: 'auto',
        tools: [thinkDeeplyFunction.definition],
        truncation: 'auto',
      });
      expect(mockCreateResponse).toHaveBeenNthCalledWith(2, {
        input: nextInput,
        model: 'gpt-5-2025-08-07',
        parallel_tool_calls: true,
        previous_response_id: 'response_123',
        reasoning: {
          effort: 'minimal',
        },
        store: true,
        stream: false,
        text: {
          format: {
            type: 'text',
          },
          verbosity: 'low',
        },
        tool_choice: 'auto',
        tools: [thinkDeeplyFunction.definition],
        truncation: 'auto',
      });
      expect(response).toEqual(totalUsage);
      expect(mockCreateResponse).toHaveBeenCalledTimes(2);
    });

    it('MAX_TURNSを超える呼び出し', async () => {
      const client = new OpenAIClient(
        env,
        [thinkDeeplyFunction],
        mockToolContext
      );
      const input: ResponseInputItem[] = [
        {
          role: 'user',
          content: 'Hello, how are you?',
        },
      ];
      mockCreateResponse.mockResolvedValue({
        id: 'response_123',
        output: [
          {
            type: 'function_call',
            call_id: 'call_123',
            name: 'think_deeply',
            arguments: JSON.stringify({
              thought: 'What is the meaning of life?',
            }),
            status: 'completed',
          },
        ],
        usage: {
          input_tokens: 4,
          input_tokens_details: { cached_tokens: 3 },
          output_tokens: 2,
          output_tokens_details: { reasoning_tokens: 1 },
          total_tokens: 10,
        },
      });

      const response = await client.call(input);
      expect(mockCreateResponse).toHaveBeenCalledTimes(10);
      expect(response).toEqual({
        input_tokens: 40,
        input_tokens_details: { cached_tokens: 30 },
        output_tokens: 20,
        output_tokens_details: { reasoning_tokens: 10 },
        total_tokens: 100,
      });
    });
  });
});

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

describe('formatLogOutput', () => {
  it('ログ出力のフォーマット', () => {
    const output: ResponseOutputItem[] = [
      {
        type: 'message',
        role: 'assistant',
        id: 'msg_123',
        status: 'completed',
        content: [
          {
            type: 'output_text',
            text: 'I am fine, thank you!',
            annotations: [],
          },
        ],
      },
    ];

    expect(formatLogOutput(output)).toBe('think: I am fine, thank you!');
  });

  it('refusal', () => {
    const output: ResponseOutputItem[] = [
      {
        type: 'message',
        role: 'assistant',
        id: 'msg_refusal',
        status: 'completed',
        content: [
          {
            type: 'refusal',
            refusal: 'I cannot assist with that request.',
          },
        ],
      },
    ];

    expect(formatLogOutput(output)).toBe(
      '*refusal: I cannot assist with that request.*'
    );
  });

  it('get_current_time', () => {
    const output: ResponseOutputItem[] = [
      {
        type: 'function_call',
        call_id: 'call_time',
        name: 'get_current_time',
        arguments: JSON.stringify({ timezone: 'Asia/Tokyo' }),
        status: 'completed',
      },
    ];

    expect(formatLogOutput(output)).toBe('*get_current_time: Asia/Tokyo*');
  });

  it('read_chat_messages', () => {
    const output: ResponseOutputItem[] = [
      {
        type: 'function_call',
        call_id: 'call_read',
        name: 'read_chat_messages',
        arguments: JSON.stringify({ limit: 10 }),
        status: 'completed',
      },
    ];

    expect(formatLogOutput(output)).toBe('*read_chat_messages: 10*');
  });

  it('think_deeply', () => {
    const output: ResponseOutputItem[] = [
      {
        type: 'function_call',
        call_id: 'call_think',
        name: 'think_deeply',
        arguments: JSON.stringify({ thought: 'Deep philosophical question' }),
        status: 'completed',
      },
    ];

    expect(formatLogOutput(output)).toBe(
      '*think_deeply: Deep philosophical question*'
    );
  });

  it('store_context', () => {
    const output: ResponseOutputItem[] = [
      {
        type: 'function_call',
        call_id: 'call_store',
        name: 'store_context',
        arguments: JSON.stringify({ context: 'Important context data' }),
        status: 'completed',
      },
    ];

    expect(formatLogOutput(output)).toBe(
      '*store_context: Important context data*'
    );
  });

  it('create_task', () => {
    const output: ResponseOutputItem[] = [
      {
        type: 'function_call',
        call_id: 'call_create',
        name: 'create_task',
        arguments: JSON.stringify({
          name: 'New Task',
          content: 'Task content goes here',
          execution_time: '2025-08-07T12:00:00Z',
        }),
        status: 'completed',
      },
    ];

    expect(formatLogOutput(output)).toBe('*create_task: New Task*');
  });

  it('update_task', () => {
    const output: ResponseOutputItem[] = [
      {
        type: 'function_call',
        call_id: 'call_update',
        name: 'update_task',
        arguments: JSON.stringify({
          name: 'Updated Task',
          content: 'Updated task content',
          execution_time: '2025-08-07T12:00:00Z',
        }),
        status: 'completed',
      },
    ];

    expect(formatLogOutput(output)).toBe('*update_task: Updated Task*');
  });

  it('delete_task', () => {
    const output: ResponseOutputItem[] = [
      {
        type: 'function_call',
        call_id: 'call_delete',
        name: 'delete_task',
        arguments: JSON.stringify({ name: 'Task to Delete' }),
        status: 'completed',
      },
    ];

    expect(formatLogOutput(output)).toBe('*delete_task: Task to Delete*');
  });

  it('complete_task', () => {
    const output: ResponseOutputItem[] = [
      {
        type: 'function_call',
        call_id: 'call_complete',
        name: 'complete_task',
        arguments: JSON.stringify({ name: 'Task to Complete' }),
        status: 'completed',
      },
    ];

    expect(formatLogOutput(output)).toBe('*complete_task: Task to Complete*');
  });

  it('デフォルトの function_call', () => {
    const output: ResponseOutputItem[] = [
      {
        type: 'function_call',
        call_id: 'call_default',
        name: 'default_function',
        arguments: JSON.stringify({ param: 'value' }),
        status: 'completed',
      },
    ];

    expect(formatLogOutput(output)).toBe('*default_function*');
  });

  it('function の引数が不正な型でもエラーにならない', () => {
    const output: ResponseOutputItem[] = [
      {
        type: 'function_call',
        call_id: 'call_invalid_arg_type',
        name: 'read_chat_messages',
        arguments: JSON.stringify({ param: 123 }),
        status: 'completed',
      },
    ];

    expect(formatLogOutput(output)).toBe('*read_chat_messages: undefined*');
  });

  it('複数のoutputアイテム', () => {
    const output: ResponseOutputItem[] = [
      {
        type: 'message',
        role: 'assistant',
        id: 'msg_1',
        status: 'completed',
        content: [
          {
            type: 'output_text',
            text: 'First message',
            annotations: [],
          },
        ],
      },
      {
        type: 'function_call',
        call_id: 'call_think',
        name: 'think_deeply',
        arguments: JSON.stringify({ thought: 'Some thought' }),
        status: 'completed',
      },
    ];

    expect(formatLogOutput(output)).toBe(
      'think: First message\n\n*think_deeply: Some thought*'
    );
  });

  it('複数のcontentを持つメッセージ', () => {
    const output: ResponseOutputItem[] = [
      {
        type: 'message',
        role: 'assistant',
        id: 'msg_multi',
        status: 'completed',
        content: [
          {
            type: 'output_text',
            text: 'First part',
            annotations: [],
          },
          {
            type: 'output_text',
            text: 'Second part',
            annotations: [],
          },
        ],
      },
    ];

    expect(formatLogOutput(output)).toBe(
      'think: First part\n\nthink: Second part'
    );
  });

  it('空の出力アイテム', () => {
    const output: ResponseOutputItem[] = [];
    expect(formatLogOutput(output)).toBe('');
  });

  it('空になるログ出力', () => {
    // undefinedを返すoutputアイテムを作る
    const output: ResponseOutputItem[] = [
      {
        type: 'unknown_type',
      } as unknown as ResponseOutputItem,
    ];
    expect(formatLogOutput(output)).toBe('');
  });

  it('予期しないcontentTypeでエラーが投げられる', () => {
    const output: ResponseOutputItem[] = [
      {
        type: 'message',
        role: 'assistant',
        id: 'msg_error',
        status: 'completed',
        content: [
          {
            type: 'unknown_content_type',
          },
        ] as unknown as ResponseOutputMessage['content'],
      },
    ];

    expect(() => formatLogOutput(output)).toThrowError(
      'Unexpected contentType: unknown_content_type'
    );
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

    it('未知のタイプを正しく処理する', () => {
      const message: ResponseOutputMessage = {
        type: 'message',
        role: 'assistant',
        id: 'msg_456',
        status: 'completed',
        content: [
          {
            type: 'unknown',
          },
        ] as unknown as ResponseOutputMessage['content'],
      };

      expect(() => formatMessage(message)).toThrowError(
        'Unexpected contentType: unknown'
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
