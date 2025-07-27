import { REST } from '@discordjs/rest';
import { Routes } from 'discord-api-types/v10';

import type {
  RESTGetAPIChannelMessagesQuery,
  RESTGetAPIChannelMessagesResult,
  RESTGetAPICurrentUserResult,
  RESTPostAPIChannelMessageJSONBody,
  RESTPostAPIChannelMessageResult,
} from 'discord-api-types/v10';

/**
 * チャンネルからメッセージを取得
 * @param token Discord Bot Token
 * @param channelId チャンネルID
 * @param options オプション（limitなど）
 * @returns メッセージの配列
 */
export async function getChannelMessages(
  token: string,
  channelId: string,
  options: RESTGetAPIChannelMessagesQuery = {}
): Promise<RESTGetAPIChannelMessagesResult> {
  const rest = new REST().setToken(token);
  return rest.get(Routes.channelMessages(channelId), {
    query: new URLSearchParams(
      Object.entries(options).map(([key, value]) => [key, String(value)])
    ),
  }) as Promise<RESTGetAPIChannelMessagesResult>;
}

/**
 * チャンネルにメッセージを送信
 * @param token Discord Bot Token
 * @param channelId チャンネルID
 * @param options 送信するメッセージの内容
 * @returns 送信したメッセージの結果
 */
export async function sendChannelMessage(
  token: string,
  channelId: string,
  options: RESTPostAPIChannelMessageJSONBody
): Promise<RESTPostAPIChannelMessageResult> {
  const rest = new REST().setToken(token);
  return rest.post(Routes.channelMessages(channelId), {
    body: options,
  }) as Promise<RESTPostAPIChannelMessageResult>;
}

/**
 * メッセージにリアクションを追加
 * @param token Discord Bot Token
 * @param channelId チャンネルID
 * @param messageId メッセージID
 * @param reaction 追加するリアクション（絵文字など）
 */
export async function addReactionToMessage(
  token: string,
  channelId: string,
  messageId: string,
  reaction: string
): Promise<void> {
  const rest = new REST().setToken(token);
  await rest.put(
    Routes.channelMessageOwnReaction(channelId, messageId, reaction)
  );
}

/**
 * ボットの情報を取得（認証テスト用）
 * @param token Discord Bot Token
 * @returns ボットのユーザー情報
 */
export async function getCurrentUser(
  token: string
): Promise<RESTGetAPICurrentUserResult> {
  const rest = new REST().setToken(token);
  return rest.get(Routes.user()) as Promise<RESTGetAPICurrentUserResult>;
}

/**
 * ボットが未読のメッセージ数を取得（最大100件）
 * @param token Discord Bot Token
 * @param channelId チャンネルID
 * @returns 未読メッセージ数
 */
export async function getUnreadMessageCount(
  token: string,
  channelId: string
): Promise<number> {
  const limit = 100;
  const userId = await getCurrentUser(token);
  const messages = await getChannelMessages(token, channelId, { limit });
  const unreadCount = messages.findIndex((msg) => {
    // 自分が送信したメッセージは既読
    if (msg.author.id === userId.id) {
      return true;
    }
    // リアクションがついていないメッセージは未読
    const reactions = msg.reactions;
    if (!reactions) {
      return false;
    }
    // 自分がリアクションをつけているメッセージは既読
    if (reactions.some((reaction) => reaction.me)) {
      return true;
    }
    return false;
  });
  if (unreadCount === -1) {
    return limit;
  }
  return unreadCount;
}
