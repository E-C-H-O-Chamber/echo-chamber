import { env } from 'cloudflare:test';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  addReactionToChatMessageFunction,
  checkNotificationsFunction,
  readChatMessagesFunction,
  sendChatMessageFunction,
} from '../../../../../src/llm/openai/functions/chat';
import {
  addReactionToMessage,
  getChannelMessages,
  getUnreadMessageCount,
  sendChannelMessage,
} from '../../../../../src/discord';
import { createDiscordMessagesResponse } from '../../../../helpers/discord';

const CHAT_UNAVAILABLE_ERROR = 'Chat tool is currently unavailable.';
const CHAT_API_ERROR = 'Chat API error';

const mockKV = {
  get: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
  list: vi.fn(),
  getWithMetadata: vi.fn(),
};

env.ECHO_KV = mockKV;

vi.mock('../../../../../src/discord', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('../../../../../src/discord')>();
  return {
    ...actual,
    getUnreadMessageCount: vi.fn(),
  };
});

describe('checkNotificationsFunction', () => {
  it('name', () => {
    expect(checkNotificationsFunction.name).toBe('check_notifications');
  });

  it('description', () => {
    expect(checkNotificationsFunction.description).toBeDefined();
  });

  it('parameters', () => {
    const { parameters } = checkNotificationsFunction;
    expect(parameters).toBeDefined();
    expect(parameters).toEqual({});
  });

  describe('handler', () => {
    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('0件', async () => {
      const unreadCount = 0;
      vi.mocked(getUnreadMessageCount).mockResolvedValue(unreadCount);
      const result = await checkNotificationsFunction.handler({}, env);
      const expected = {
        success: true,
        notifications: {
          channel: 'chat',
          unreadCount,
        },
      };
      expect(result).toEqual(expected);
    });

    it('1件', async () => {
      const unreadCount = 1;
      vi.mocked(getUnreadMessageCount).mockResolvedValue(unreadCount);
      const result = await checkNotificationsFunction.handler({}, env);
      const expected = {
        success: true,
        notifications: {
          channel: 'chat',
          unreadCount,
        },
      };
      expect(result).toEqual(expected);
    });

    it('10件', async () => {
      const unreadCount = 10;
      vi.mocked(getUnreadMessageCount).mockResolvedValue(unreadCount);
      const result = await checkNotificationsFunction.handler({}, env);
      const expected = {
        success: true,
        notifications: {
          channel: 'chat',
          unreadCount,
        },
      };
      expect(result).toEqual(expected);
    });

    it('99件', async () => {
      const unreadCount = 99;
      vi.mocked(getUnreadMessageCount).mockResolvedValue(unreadCount);
      const result = await checkNotificationsFunction.handler({}, env);
      const expected = {
        success: true,
        notifications: {
          channel: 'chat',
          unreadCount,
        },
      };
      expect(result).toEqual(expected);
    });

    it('100件 (99+)', async () => {
      const unreadCount = 100;
      vi.mocked(getUnreadMessageCount).mockResolvedValue(unreadCount);
      const result = await checkNotificationsFunction.handler({}, env);
      const expected = {
        success: true,
        notifications: {
          channel: 'chat',
          unreadCount: '99+',
        },
      };
      expect(result).toEqual(expected);
    });

    it('200件 (99+)', async () => {
      const unreadCount = 200;
      vi.mocked(getUnreadMessageCount).mockResolvedValue(unreadCount);
      const result = await checkNotificationsFunction.handler({}, env);
      const expected = {
        success: true,
        notifications: {
          channel: 'chat',
          unreadCount: '99+',
        },
      };
      expect(result).toEqual(expected);
    });

    it('チャンネルIDが存在しない', async () => {
      mockKV.get.mockResolvedValue(null);
      const result = await checkNotificationsFunction.handler({}, env);
      expect(result.success).toBe(false);
      expect(result.error).toBe(CHAT_UNAVAILABLE_ERROR);
    });

    it('getUnreadMessageCount エラー', async () => {
      const error = new Error(CHAT_API_ERROR);
      vi.mocked(getUnreadMessageCount).mockRejectedValue(error);
      const result = await checkNotificationsFunction.handler({}, env);
      expect(result.success).toBe(false);
      expect(result.error).toContain(CHAT_API_ERROR);
    });
  });
});

describe('readChatMessagesFunction', () => {
  it('name', () => {
    expect(readChatMessagesFunction.name).toBe('read_chat_messages');
  });

  it('description', () => {
    expect(readChatMessagesFunction.description).toBeDefined();
  });

  it('parameters', () => {
    const { parameters } = readChatMessagesFunction;
    expect(parameters).toBeDefined();
    expect(parameters).toHaveProperty('limit');
    expect(parameters.limit.def.type).toBe('number');
    expect(parameters.limit.description).toBeDefined();
  });

  describe('handler', () => {
    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('limit分だけメッセージ取得', async () => {
      const message = {
        message: 'Hello',
        user: 'user1',
        timestamp: '2025-01-23T04:56:07.089Z',
      };
      const mockMessages = createDiscordMessagesResponse([message]);
      vi.mocked(getChannelMessages).mockResolvedValue(mockMessages);
      const result = await readChatMessagesFunction.handler({ limit: 1 }, env);
      const expected = {
        success: true,
        messages: [message],
      };
      expect(result).toEqual(expected);
    });

    it('メッセージが日付の昇順にソートされる', async () => {
      const messages = [
        {
          message: 'Third',
          user: 'user1',
          timestamp: '2025-01-23T04:56:09.000Z',
        },
        {
          message: 'Second',
          user: 'user2',
          timestamp: '2025-01-23T04:56:08.000Z',
        },
        {
          message: 'First',
          user: 'user3',
          timestamp: '2025-01-23T04:56:07.000Z',
        },
      ];
      const mockMessages = createDiscordMessagesResponse(messages);
      vi.mocked(getChannelMessages).mockResolvedValue(mockMessages);
      const result = await readChatMessagesFunction.handler({ limit: 3 }, env);
      const expected = {
        success: true,
        messages: messages.reverse(),
      };
      expect(result).toEqual(expected);
    });

    it('チャンネルIDが存在しない', async () => {
      mockKV.get.mockResolvedValue(null);
      const result = await readChatMessagesFunction.handler({ limit: 10 }, env);
      expect(result.success).toBe(false);
      expect(result.error).toBe(CHAT_UNAVAILABLE_ERROR);
    });

    it('getChannelMessages エラー', async () => {
      const error = new Error(CHAT_API_ERROR);
      vi.mocked(getChannelMessages).mockRejectedValue(error);
      const result = await readChatMessagesFunction.handler({ limit: 5 }, env);
      expect(result.success).toBe(false);
      expect(result.error).toContain(CHAT_API_ERROR);
    });
  });
});

describe('sendChatMessageFunction', () => {
  it('name', () => {
    expect(sendChatMessageFunction.name).toBe('send_chat_message');
  });

  it('description', () => {
    expect(sendChatMessageFunction.description).toBeDefined();
  });

  it('parameters', () => {
    const { parameters } = sendChatMessageFunction;
    expect(parameters).toBeDefined();
    expect(parameters).toHaveProperty('message');
    expect(parameters.message.def.type).toBe('string');
    expect(parameters.message.description).toBeDefined();
  });

  describe('handler', () => {
    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('メッセージ送信成功', async () => {
      const message = 'Hello';
      const result = await sendChatMessageFunction.handler({ message }, env);
      const expected = {
        success: true,
      };
      expect(result).toEqual(expected);
    });

    it('チャンネルIDが存在しない', async () => {
      mockKV.get.mockResolvedValue(null);
      const result = await sendChatMessageFunction.handler(
        { message: 'Hello' },
        env
      );
      expect(result.success).toBe(false);
      expect(result.error).toBe(CHAT_UNAVAILABLE_ERROR);
    });

    it('sendChannelMessage エラー', async () => {
      const error = new Error(CHAT_API_ERROR);
      vi.mocked(sendChannelMessage).mockRejectedValue(error);
      const result = await sendChatMessageFunction.handler(
        { message: 'Hello' },
        env
      );
      expect(result.success).toBe(false);
      expect(result.error).toContain(CHAT_API_ERROR);
    });
  });
});

describe('addReactionToChatMessageFunction', () => {
  it('name', () => {
    expect(addReactionToChatMessageFunction.name).toBe(
      'add_reaction_to_chat_message'
    );
  });

  it('description', () => {
    expect(addReactionToChatMessageFunction.description).toBeDefined();
  });

  it('parameters', () => {
    const { parameters } = addReactionToChatMessageFunction;
    expect(parameters).toBeDefined();

    expect(parameters).toHaveProperty('messageId');
    expect(parameters.messageId.def.type).toBe('string');
    expect(parameters.messageId.description).toBeDefined();

    expect(parameters).toHaveProperty('reaction');
    expect(parameters.reaction.def.type).toBe('string');
    expect(parameters.reaction.description).toBeDefined();
  });

  describe('handler', () => {
    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('リアクション追加成功', async () => {
      vi.mocked(addReactionToMessage).mockResolvedValue(undefined);

      const result = await addReactionToChatMessageFunction.handler(
        { messageId: '123456789', reaction: '👍' },
        env
      );

      const expected = {
        success: true,
      };
      expect(result).toEqual(expected);
    });

    it('チャンネルIDが存在しない', async () => {
      mockKV.get.mockResolvedValue(null);
      const result = await addReactionToChatMessageFunction.handler(
        { messageId: '123456789', reaction: '👍' },
        env
      );
      expect(result.success).toBe(false);
      expect(result.error).toBe(CHAT_UNAVAILABLE_ERROR);
    });

    it('addReactionToMessage エラー', async () => {
      const error = new Error(CHAT_API_ERROR);
      vi.mocked(addReactionToMessage).mockRejectedValue(error);
      const result = await addReactionToChatMessageFunction.handler(
        { messageId: '123456789', reaction: '👍' },
        env
      );
      expect(result.success).toBe(false);
      expect(result.error).toContain(CHAT_API_ERROR);
    });
  });
});
