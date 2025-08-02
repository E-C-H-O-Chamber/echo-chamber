import { getChannelMessages, getCurrentUser } from './api';

export {
  addReactionToMessage,
  getChannelMessages,
  sendChannelMessage,
  getCurrentUser,
} from './api';

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
  const user = await getCurrentUser(token);
  const messages = await getChannelMessages(token, channelId, { limit });
  const unreadCount = messages.findIndex((msg) => {
    // 自分が送信したメッセージは既読
    if (msg.author.id === user.id) {
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
    return messages.length;
  }
  return unreadCount;
}
