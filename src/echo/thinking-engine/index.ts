import { OpenAIClient } from '../../llm/openai/client';
import { OpenAIEmbeddingService } from '../../llm/openai/embedding';
import {
  addReactionToChatMessageFunction,
  checkNotificationsFunction,
  readChatMessagesFunction,
  sendChatMessageFunction,
} from '../../llm/openai/functions/chat';
import {
  storeContextFunction,
  recallContextFunction,
} from '../../llm/openai/functions/context';
// import {
//   storeKnowledgeFunction,
//   searchKnowledgeFunction,
// } from '../../llm/openai/functions/knowledge';
import {
  storeMemoryFunction,
  searchMemoryFunction,
} from '../../llm/openai/functions/memory';
// import {
//   createTaskFunction,
//   listTaskFunction,
//   updateTaskFunction,
//   deleteTaskFunction,
//   completeTaskFunction,
// } from '../../llm/openai/functions/task';
import { thinkDeeplyFunction } from '../../llm/openai/functions/think';
import { getCurrentTimeFunction } from '../../llm/openai/functions/time';
import { ThinkingStream } from '../../utils/thinking-stream';
import { MemorySystem } from '../memory-system';
import { getTodayUsageKey } from '../usage';

import type { ITool, ToolContext } from '../../llm/openai/functions';
import type { EchoInstanceConfig } from '../../types/echo-config';
import type { Logger } from '../../utils/logger';
import type { UsageRecord } from '../types';
import type {
  ResponseFunctionToolCall,
  ResponseInput,
  ResponseInputItem,
  ResponseUsage,
} from 'openai/resources/responses/responses';

/**
 * Echo の思考エンジン
 */
export class ThinkingEngine {
  private readonly env: Env;
  private readonly toolContext: ToolContext;
  private readonly instanceConfig: EchoInstanceConfig;

  constructor(options: {
    env: Env;
    storage: DurableObjectStorage;
    logger: Logger;
    instanceConfig: EchoInstanceConfig;
  }) {
    this.env = options.env;
    this.instanceConfig = options.instanceConfig;
    const embeddingService = new OpenAIEmbeddingService(options.env);
    const memorySystem = new MemorySystem({
      storage: options.storage,
      embeddingService,
      logger: options.logger,
    });
    this.toolContext = {
      instanceConfig: options.instanceConfig,
      storage: options.storage,
      memorySystem,
      logger: options.logger,
    };
  }

  async think(): Promise<ResponseUsage> {
    const thinkingStream = new ThinkingStream(this.instanceConfig);
    await thinkingStream.send('*Thinking started...*');
    const openai = this.createOpenAIClient(thinkingStream);
    const messages = await this.buildInitialMessages();
    const usage = await openai.call(messages);
    await thinkingStream.send(
      `*Thinking completed.*\nUsage: ${usage.total_tokens} tokens (Total: ${
        (await this.getCurrentUsage()) + usage.total_tokens
      } tokens)`
    );
    return usage;
  }

  private createOpenAIClient(thinkingStream: ThinkingStream): OpenAIClient {
    return new OpenAIClient(
      this.env,
      [
        getCurrentTimeFunction,
        checkNotificationsFunction,
        readChatMessagesFunction,
        sendChatMessageFunction,
        addReactionToChatMessageFunction,
        storeContextFunction,
        recallContextFunction,
        // storeKnowledgeFunction,
        // searchKnowledgeFunction,
        storeMemoryFunction,
        searchMemoryFunction,
        // listTaskFunction,
        // createTaskFunction,
        // updateTaskFunction,
        // completeTaskFunction,
        // deleteTaskFunction,
        thinkDeeplyFunction,
      ],
      this.toolContext,
      thinkingStream
    );
  }

  private async buildInitialMessages(): Promise<ResponseInput> {
    // const result = await listTaskFunction.handler({}, this.toolContext);
    // const hasTasks =
    //   'tasks' in result &&
    //   Array.isArray(result.tasks) &&
    //   result.tasks.length > 0;
    // const taskMessage = hasTasks
    //   ? [
    //       this.createFunctionCallMessage(listTaskFunction),
    //       {
    //         type: 'function_call_output' as const,
    //         call_id: listTaskFunction.name,
    //         output: JSON.stringify(result),
    //       },
    //     ]
    //   : [];

    return [
      {
        role: 'developer',
        content: this.instanceConfig.systemPrompt,
      },
      this.createFunctionCallMessage(recallContextFunction),
      await this.createFunctionCallOutputMessage(recallContextFunction),
      this.createFunctionCallMessage(getCurrentTimeFunction),
      await this.createFunctionCallOutputMessage(getCurrentTimeFunction),
      this.createFunctionCallMessage(checkNotificationsFunction),
      await this.createFunctionCallOutputMessage(checkNotificationsFunction),
      // ...taskMessage,
    ];
  }

  private createFunctionCallMessage(tool: ITool): ResponseFunctionToolCall {
    return {
      type: 'function_call',
      call_id: tool.name,
      name: tool.name,
      arguments: '{}',
    };
  }

  private async createFunctionCallOutputMessage(
    tool: ITool
  ): Promise<ResponseInputItem.FunctionCallOutput> {
    return {
      type: 'function_call_output',
      call_id: tool.name,
      output: await tool.execute('{}', this.toolContext),
    };
  }

  private async getCurrentUsage(): Promise<number> {
    const usage = await this.toolContext.storage.get<UsageRecord>('usage');
    if (!usage) {
      return 0;
    }

    const todayUsage = usage[getTodayUsageKey()];
    if (!todayUsage) {
      return 0;
    }

    return todayUsage.total_tokens;
  }
}
