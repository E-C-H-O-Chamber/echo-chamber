/**
 * Echo インスタンス設定レジストリ
 *
 * 各 Echo インスタンスの設定を一元管理する
 * 新しいインスタンスを追加する場合はこのファイルのみを更新する
 */

import type { EchoInstanceConfig, EchoInstanceId } from '../types/echo-config';

/**
 * 指定されたインスタンス ID の設定を取得する
 *
 * @param env - Cloudflare Workers 環境変数
 * @param instanceId - Echo インスタンス ID
 * @returns インスタンス設定
 */
export function getInstanceConfig(
  env: Env,
  instanceId: EchoInstanceId
): EchoInstanceConfig {
  const configs: Record<EchoInstanceId, EchoInstanceConfig> = {
    rin: {
      id: 'rin',
      name: 'Rin',
      discordBotToken: env.DISCORD_BOT_TOKEN_RIN,
      chatChannelKey: 'chat_channel_discord_rin',
      thinkingChannelKey: 'thinking_channel_discord_rin',
    },
  };

  return configs[instanceId];
}
