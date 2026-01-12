import { sendChannelMessage } from '../discord';

import type { EchoInstanceConfig } from '../types/echo-config';

interface ThinkingStreamConfig {
  discordToken: string;
  channelId: string;
}

/**
 * 思考ログ専用のストリームクラス
 * OpenAIの推論結果をTHINKING_CHANNEL_IDに送信
 * Loggerとは完全に独立
 */
export class ThinkingStream {
  private readonly config: ThinkingStreamConfig;

  constructor(config: ThinkingStreamConfig) {
    this.config = config;
  }

  /**
   * 思考ログを送信
   * 呼び出し元で既にフォーマット済みの内容をそのまま送信
   */
  async send(content: string): Promise<void> {
    if (content === '') {
      return;
    }

    const message = this.truncateForDiscord(content);

    try {
      await sendChannelMessage(
        this.config.discordToken,
        this.config.channelId,
        { content: message }
      );
    } catch (error) {
      // 思考ログ送信失敗はコンソールにのみ出力（無限ループ防止）
      console.error('Failed to send thinking to Discord:', error);
    }
  }

  private truncateForDiscord(content: string): string {
    const maxLength = 2000;
    if (content.length <= maxLength) {
      return content;
    }
    return `${content.substring(0, maxLength - 15)}...(truncated)`;
  }
}

/**
 * インスタンス設定とKVストアからThinkingStreamを生成
 */
export async function createThinkingStream(
  instanceConfig: EchoInstanceConfig,
  store: KVNamespace
): Promise<ThinkingStream> {
  const channelId = await store.get(instanceConfig.thinkingChannelKey);

  if (channelId === null || channelId === '') {
    throw new Error(
      `thinkingChannelKey "${instanceConfig.thinkingChannelKey}" is not set in KV store`
    );
  }

  return new ThinkingStream({
    discordToken: instanceConfig.discordBotToken,
    channelId,
  });
}
