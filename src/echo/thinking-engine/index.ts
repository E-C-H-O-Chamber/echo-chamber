import { OpenAIClient } from '../../llm/openai/client';
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
import {
  storeKnowledgeFunction,
  searchKnowledgeFunction,
} from '../../llm/openai/functions/knowledge';
// import {
//   createTaskFunction,
//   listTaskFunction,
//   updateTaskFunction,
//   deleteTaskFunction,
//   completeTaskFunction,
// } from '../../llm/openai/functions/task';
import { thinkDeeplyFunction } from '../../llm/openai/functions/think';
import { getCurrentTimeFunction } from '../../llm/openai/functions/time';
import { echoSystemMessage } from '../../llm/prompts/system';
import { createThinkingStream } from '../../utils/thinking-stream';

import type { ITool, ToolContext } from '../../llm/openai/functions';
import type { EchoInstanceConfig } from '../../types/echo-config';
import type { Logger } from '../../utils/logger';
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
    store: KVNamespace;
    logger: Logger;
    instanceConfig: EchoInstanceConfig;
  }) {
    this.env = options.env;
    this.instanceConfig = options.instanceConfig;
    this.toolContext = {
      echoId: options.instanceConfig.id,
      store: options.store,
      storage: options.storage,
      discordBotToken: options.instanceConfig.discordBotToken,
      chatChannelKey: options.instanceConfig.chatChannelKey,
      logger: options.logger,
    };
  }

  async think(): Promise<ResponseUsage> {
    const openai = await this.createOpenAIClient();
    const messages = await this.buildInitialMessages();
    const usage = await openai.call(messages);
    return usage;
  }

  private async createOpenAIClient(): Promise<OpenAIClient> {
    const thinkingStream = await createThinkingStream(
      this.instanceConfig,
      this.toolContext.store
    );
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
        storeKnowledgeFunction,
        searchKnowledgeFunction,
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
        content: echoSystemMessage,
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
}
