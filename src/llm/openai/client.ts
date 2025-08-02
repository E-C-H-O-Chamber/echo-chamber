import OpenAI from 'openai';

import { createLogger } from '../../utils/logger';

import {
  checkNotificationsFunction,
  readChatMessagesFunction,
  sendChatMessageFunction,
} from './functions/chat';
import { thinkDeeplyFunction } from './functions/think';
import { getCurrentTimeFunction } from './functions/time';

import type { Logger } from '../../utils/logger';
import type {
  Response,
  ResponseInput,
  ResponseInputItem,
  ResponseOutputItem,
  ResponseFunctionToolCall,
  EasyInputMessage,
  ResponseOutputMessage,
  ResponseUsage,
} from 'openai/resources/responses/responses';

const MAX_TURNS = 10;

export class OpenAIClient {
  private readonly env: Env;
  private readonly client: OpenAI;
  private readonly tools = {
    [getCurrentTimeFunction.name]: getCurrentTimeFunction,
    [checkNotificationsFunction.name]: checkNotificationsFunction,
    [readChatMessagesFunction.name]: readChatMessagesFunction,
    [sendChatMessageFunction.name]: sendChatMessageFunction,
    [thinkDeeplyFunction.name]: thinkDeeplyFunction,
  };
  private previousResponseId: string | undefined;
  private readonly logger: Logger;

  constructor(env: Env) {
    this.env = env;
    this.client = new OpenAI({
      apiKey: env.OPENAI_API_KEY,
    });
    this.logger = createLogger(env);
  }

  /**
   * Responses APIを実行
   */
  async createResponse(input: ResponseInput): Promise<Response> {
    const response = await this.client.responses.create({
      input,
      model: 'gpt-4.1',
      parallel_tool_calls: true,
      previous_response_id: this.previousResponseId,
      store: true,
      stream: false,
      temperature: 0.3,
      tool_choice: 'auto',
      tools: Object.values(this.tools).map((tool) => tool.definition),
      top_p: 0.95,
      truncation: 'auto',
    });

    // Usage情報の確認（undefinedの場合のみwarnログ）
    if (!response.usage) {
      await this.logger.warn('Response usage information is undefined');
    }

    return response;
  }

  /**
   * Function Callを実行
   */
  async executeFunction(
    functionCall: ResponseFunctionToolCall
  ): Promise<string> {
    const tool = this.tools[functionCall.name];
    if (!tool) {
      return JSON.stringify({
        error: `Function '${functionCall.name}' is not registered`,
        available_functions: Object.keys(this.tools),
      });
    }

    try {
      const result = await tool.execute(functionCall.arguments, this.env);
      return JSON.stringify(result);
    } catch (error) {
      return JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * 完全な会話フロー（Function Calling含む）を実行
   */
  async call(input: ResponseInput, turn = 1): Promise<ResponseUsage> {
    if (turn > MAX_TURNS) {
      throw new Error('Maximum turns exceeded');
    }

    await this.logger.debug(input.map(formatInputItem).join('\n\n'));

    const response = await this.createResponse(input);

    if (response.id) {
      this.previousResponseId = response.id;
    }

    await this.logger.debug(response.output.map(formatOutputItem).join('\n\n'));
    await this.logOutput(response.output);

    // 現在のレスポンスのusageを取得
    let totalUsage: ResponseUsage = response.usage ?? {
      input_tokens: 0,
      input_tokens_details: { cached_tokens: 0 },
      output_tokens: 0,
      output_tokens_details: { reasoning_tokens: 0 },
      total_tokens: 0,
    };

    const nextInput: ResponseInput = await Promise.all(
      response.output
        .filter((item) => item.type === 'function_call')
        .map(async (item) => ({
          type: 'function_call_output',
          call_id: item.call_id,
          output: await this.executeFunction(item),
        }))
    );

    if (nextInput.length > 0) {
      const recursiveUsage = await this.call(nextInput, turn + 1);
      totalUsage = accumulateUsage(totalUsage, recursiveUsage);
    }

    return totalUsage;
  }

  async logOutput(output: ResponseOutputItem[]): Promise<void> {
    const logMessage = output
      .map((item) => {
        if (item.type === 'message') {
          return item.content
            .map((c) => {
              const contentType = c.type;
              switch (contentType) {
                case 'output_text':
                  return c.text;
                case 'refusal':
                  return `*refusal: ${c.refusal}*`;
                default:
                  throw new Error(
                    `Unexpected contentType: ${contentType satisfies never}`
                  );
              }
            })
            .join('\n\n');
        } else if (item.type === 'function_call') {
          return `*${item.name}*`;
        }
      })
      .filter((msg) => msg !== undefined)
      .join('\n\n');

    // 空文字列の場合はログ出力をスキップ
    if (logMessage.trim().length > 0) {
      await this.logger.info(logMessage);
    }
  }
}

/**
 * 複数のUsageオブジェクトを累積する
 */
export function accumulateUsage(
  total: ResponseUsage,
  additional: ResponseUsage
): ResponseUsage {
  return {
    input_tokens: total.input_tokens + additional.input_tokens,
    input_tokens_details: {
      cached_tokens:
        total.input_tokens_details.cached_tokens +
        additional.input_tokens_details.cached_tokens,
    },
    output_tokens: total.output_tokens + additional.output_tokens,
    output_tokens_details: {
      reasoning_tokens:
        total.output_tokens_details.reasoning_tokens +
        additional.output_tokens_details.reasoning_tokens,
    },
    total_tokens: total.total_tokens + additional.total_tokens,
  };
}

export function formatInputItem(item: ResponseInputItem): string {
  const itemType = item.type;
  if (!itemType) {
    if ('content' in item) {
      return formatMessage(item);
    }
    return `<item_reference>${item.id}</item_reference>`;
  }
  if (itemType === 'message') {
    return formatMessage(item);
  }
  if (itemType === 'function_call') {
    return formatFunctionCall(item);
  }
  if (itemType === 'function_call_output') {
    return `[function call output] ${item.call_id} (${item.status})\n${JSON.stringify(JSON.parse(item.output), null, 2)}`;
  }
  return `<${itemType} />`;
}

export function formatOutputItem(item: ResponseOutputItem): string {
  const itemType = item.type;
  if (itemType === 'message') {
    return formatMessage(item);
  }
  if (itemType === 'function_call') {
    return formatFunctionCall(item);
  }
  return `<${item.type} />`;
}

export function formatMessage(
  item: EasyInputMessage | ResponseInputItem.Message | ResponseOutputMessage
): string {
  const { role, content } = item;
  if (typeof content === 'string') {
    return formatBlock(role, content);
  }
  return content
    .map((c) => {
      const contentType = c.type;
      switch (contentType) {
        case 'input_text':
        case 'output_text':
          return formatBlock(role, c.text);
        case 'input_image':
          return formatBlock(role, `<image>${c.image_url}</image>`);
        case 'input_file':
          return formatBlock(role, `<file>${c.file_url ?? c.filename}</file>`);
        case 'refusal':
          return formatBlock(role, `<refusal>${c.refusal}</refusal>`);
        default:
          throw new Error(
            `Unexpected contentType: ${contentType satisfies never}`
          );
      }
    })
    .join('\n\n');
}

export function formatBlock(role: string, content: string): string {
  return `[${role}]:\n${content}`;
}

export function formatFunctionCall(item: ResponseFunctionToolCall): string {
  return `[function call] ${item.call_id} (${item.status})\n${item.name}(${item.arguments})`;
}
