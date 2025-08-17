import { describe, expect, it, vi } from 'vitest';

import {
  getChannelMessages,
  getCurrentUser,
  getUnreadMessageCount,
} from '../../../src/discord';
import {
  createDiscordCurrentUserResponse,
  createDiscordMessagesResponse,
} from '../../helpers/discord';

const TOKEN = 'TEST_DISCORD_BOT_TOKEN';
const CHANNEL_ID = 'test-channel-id';
const BOT_USER_ID = 'bot-user-123';

describe('getUnreadMessageCount', () => {
  it('すべてのメッセージが未読の場合、取得した数を返す', async () => {
    const mockUser = createDiscordCurrentUserResponse(BOT_USER_ID);
    vi.mocked(getCurrentUser).mockResolvedValue(mockUser);
    const messages = [
      {
        message: 'Hello',
        user: 'user-1',
        timestamp: new Date().toISOString(),
      },
      {
        message: 'World',
        user: 'user-1',
        timestamp: new Date().toISOString(),
      },
    ];
    const mockMessages = createDiscordMessagesResponse(messages);
    vi.mocked(getChannelMessages).mockResolvedValue(mockMessages);
    const result = await getUnreadMessageCount(TOKEN, CHANNEL_ID);
    expect(result).toBe(2);
  });

  it('自分が送信したメッセージがある場合、そこまでの未読数を返す', async () => {
    const mockUser = createDiscordCurrentUserResponse(BOT_USER_ID);
    vi.mocked(getCurrentUser).mockResolvedValue(mockUser);
    const messages = [
      {
        message: 'Hello',
        user: 'user-1',
        timestamp: new Date().toISOString(),
      },
      {
        message: 'World',
        user: 'user-1',
        timestamp: new Date().toISOString(),
      },
      {
        message: 'OK',
        user: BOT_USER_ID,
        userId: BOT_USER_ID,
        timestamp: new Date().toISOString(),
      },
      {
        message: 'Test',
        user: 'user-1',
        timestamp: new Date().toISOString(),
      },
    ];
    const mockMessages = createDiscordMessagesResponse(messages);
    vi.mocked(getChannelMessages).mockResolvedValue(mockMessages);
    const result = await getUnreadMessageCount(TOKEN, CHANNEL_ID);
    expect(result).toBe(2);
  });

  it('自分がリアクションをつけたメッセージがある場合、そこまでの未読数を返す', async () => {
    const mockUser = createDiscordCurrentUserResponse(BOT_USER_ID);
    vi.mocked(getCurrentUser).mockResolvedValue(mockUser);
    const messages = [
      {
        message: 'Hello',
        user: 'user-1',
        timestamp: new Date().toISOString(),
      },
      {
        message: 'World',
        user: 'user-2',
        timestamp: new Date().toISOString(),
        reactions: [{ emoji: '👍', me: true }],
      },
      {
        message: 'Test',
        user: 'user-3',
        timestamp: new Date().toISOString(),
      },
    ];
    const mockMessages = createDiscordMessagesResponse(messages);
    vi.mocked(getChannelMessages).mockResolvedValue(mockMessages);
    const result = await getUnreadMessageCount(TOKEN, CHANNEL_ID);
    expect(result).toBe(1);
  });

  it('リアクションが自分のものではない場合、既読として扱わない', async () => {
    const mockUser = createDiscordCurrentUserResponse(BOT_USER_ID);
    vi.mocked(getCurrentUser).mockResolvedValue(mockUser);
    const messages = [
      {
        message: 'Hello',
        user: 'user-1',
        timestamp: new Date().toISOString(),
      },
      {
        message: 'World',
        user: 'user-2',
        timestamp: new Date().toISOString(),
        reactions: [{ emoji: '👍', me: false }],
      },
      {
        message: 'Test',
        user: 'user-3',
        timestamp: new Date().toISOString(),
      },
    ];
    const mockMessages = createDiscordMessagesResponse(messages);
    vi.mocked(getChannelMessages).mockResolvedValue(mockMessages);
    const result = await getUnreadMessageCount(TOKEN, CHANNEL_ID);
    expect(result).toBe(3);
  });

  it('リアクションが複数ある場合、1つでも自分のものがあれば既読として扱う', async () => {
    const mockUser = createDiscordCurrentUserResponse(BOT_USER_ID);
    vi.mocked(getCurrentUser).mockResolvedValue(mockUser);
    const messages = [
      {
        message: 'Hello',
        user: 'user-1',
        timestamp: new Date().toISOString(),
      },
      {
        message: 'World',
        user: 'user-2',
        timestamp: new Date().toISOString(),
        reactions: [
          { emoji: '👍', me: true },
          { emoji: '👎', me: false },
        ],
      },
      {
        message: 'Test',
        user: 'user-3',
        timestamp: new Date().toISOString(),
      },
    ];
    const mockMessages = createDiscordMessagesResponse(messages);
    vi.mocked(getChannelMessages).mockResolvedValue(mockMessages);
    const result = await getUnreadMessageCount(TOKEN, CHANNEL_ID);
    expect(result).toBe(1);
  });

  it('最初のメッセージが自分のメッセージである場合、未読数は0', async () => {
    const mockUser = createDiscordCurrentUserResponse(BOT_USER_ID);
    vi.mocked(getCurrentUser).mockResolvedValue(mockUser);
    const messages = [
      {
        message: 'Hello',
        user: BOT_USER_ID,
        userId: BOT_USER_ID,
        timestamp: new Date().toISOString(),
      },
      {
        message: 'World',
        user: 'user-1',
        timestamp: new Date().toISOString(),
      },
    ];
    const mockMessages = createDiscordMessagesResponse(messages);
    vi.mocked(getChannelMessages).mockResolvedValue(mockMessages);
    const result = await getUnreadMessageCount(TOKEN, CHANNEL_ID);
    expect(result).toBe(0);
  });

  it('最初のメッセージに自分がリアクションをつけている場合、未読数は0', async () => {
    const mockUser = createDiscordCurrentUserResponse(BOT_USER_ID);
    vi.mocked(getCurrentUser).mockResolvedValue(mockUser);
    const messages = [
      {
        message: 'Hello',
        user: 'user-1',
        timestamp: new Date().toISOString(),
        reactions: [{ emoji: '👍', me: true }],
      },
      {
        message: 'World',
        user: 'user-1',
        timestamp: new Date().toISOString(),
      },
    ];
    const mockMessages = createDiscordMessagesResponse(messages);
    vi.mocked(getChannelMessages).mockResolvedValue(mockMessages);
    const result = await getUnreadMessageCount(TOKEN, CHANNEL_ID);
    expect(result).toBe(0);
  });
});
