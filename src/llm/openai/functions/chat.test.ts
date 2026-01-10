import { afterEach, describe, expect, it, vi } from 'vitest';

import { createDiscordMessagesResponse } from '../../../../test/helpers/discord';
import { mockToolContext } from '../../../../test/mocks/tool';
import {
  addReactionToMessage,
  getChannelMessages,
  getNotificationDetails,
  sendChannelMessage,
} from '../../../discord';

import {
  addReactionToChatMessageFunction,
  checkNotificationsFunction,
  readChatMessagesFunction,
  sendChatMessageFunction,
} from './chat';

const CHAT_UNAVAILABLE_ERROR = 'Chat tool is currently unavailable.';
const CHAT_API_ERROR = 'Chat API error';

vi.mock('../../../discord', async (importOriginal) => {
  const actual =
    // eslint-disable-next-line @typescript-eslint/consistent-type-imports
    await importOriginal<typeof import('../../../discord')>();
  return {
    ...actual,
    getUnreadMessageCount: vi.fn(),
    getNotificationDetails: vi.fn(),
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

    it('0件（最新メッセージをプレビュー表示）', async () => {
      const mockNotificationDetails = {
        unreadCount: 0,
        latestMessagePreview: {
          messageId: 'message-latest',
          user: 'user1',
          message: 'Latest message (already read)',
          created_at: '2025/01/23 13:56:07',
        },
      };
      vi.mocked(getNotificationDetails).mockResolvedValue(
        mockNotificationDetails
      );
      const result = await checkNotificationsFunction.handler(
        {},
        mockToolContext
      );
      const expected = {
        success: true,
        notifications: {
          channel: 'chat',
          unreadCount: 0,
          latestMessagePreview: {
            messageId: 'message-latest',
            user: 'user1',
            message: 'Latest message (already read)',
            created_at: '2025/01/23 13:56:07',
          },
        },
      };
      expect(result).toEqual(expected);
    });

    it('1件', async () => {
      const mockNotificationDetails = {
        unreadCount: 1,
        latestMessagePreview: {
          messageId: 'message-1',
          user: 'testuser',
          message: 'Test message',
          created_at: '2025/01/23 13:56:07',
        },
      };
      vi.mocked(getNotificationDetails).mockResolvedValue(
        mockNotificationDetails
      );
      const result = await checkNotificationsFunction.handler(
        {},
        mockToolContext
      );
      const expected = {
        success: true,
        notifications: {
          channel: 'chat',
          unreadCount: 1,
          latestMessagePreview: {
            messageId: 'message-1',
            user: 'testuser',
            message: 'Test message',
            created_at: '2025/01/23 13:56:07',
          },
        },
      };
      expect(result).toEqual(expected);
    });

    it('10件', async () => {
      const mockNotificationDetails = {
        unreadCount: 10,
        latestMessagePreview: {
          messageId: 'message-10',
          user: 'testuser',
          message: 'Test message',
          created_at: '2025/01/23 13:56:07',
        },
      };
      vi.mocked(getNotificationDetails).mockResolvedValue(
        mockNotificationDetails
      );
      const result = await checkNotificationsFunction.handler(
        {},
        mockToolContext
      );
      const expected = {
        success: true,
        notifications: {
          channel: 'chat',
          unreadCount: 10,
          latestMessagePreview: {
            messageId: 'message-10',
            user: 'testuser',
            message: 'Test message',
            created_at: '2025/01/23 13:56:07',
          },
        },
      };
      expect(result).toEqual(expected);
    });

    it('99件', async () => {
      const mockNotificationDetails = {
        unreadCount: 99,
        latestMessagePreview: {
          messageId: 'message-99',
          user: 'testuser',
          message: 'Test message',
          created_at: '2025/01/23 13:56:07',
        },
      };
      vi.mocked(getNotificationDetails).mockResolvedValue(
        mockNotificationDetails
      );
      const result = await checkNotificationsFunction.handler(
        {},
        mockToolContext
      );
      const expected = {
        success: true,
        notifications: {
          channel: 'chat',
          unreadCount: 99,
          latestMessagePreview: {
            messageId: 'message-99',
            user: 'testuser',
            message: 'Test message',
            created_at: '2025/01/23 13:56:07',
          },
        },
      };
      expect(result).toEqual(expected);
    });

    it('100件 (99+)', async () => {
      const mockNotificationDetails = {
        unreadCount: 100,
        latestMessagePreview: {
          messageId: 'message-100',
          user: 'testuser',
          message: 'Test message',
          created_at: '2025/01/23 13:56:07',
        },
      };
      vi.mocked(getNotificationDetails).mockResolvedValue(
        mockNotificationDetails
      );
      const result = await checkNotificationsFunction.handler(
        {},
        mockToolContext
      );
      const expected = {
        success: true,
        notifications: {
          channel: 'chat',
          unreadCount: '99+',
          latestMessagePreview: {
            messageId: 'message-100',
            user: 'testuser',
            message: 'Test message',
            created_at: '2025/01/23 13:56:07',
          },
        },
      };
      expect(result).toEqual(expected);
    });

    it('200件 (99+)', async () => {
      const mockNotificationDetails = {
        unreadCount: 200,
        latestMessagePreview: {
          messageId: 'message-200',
          user: 'testuser',
          message: 'Test message',
          created_at: '2025/01/23 13:56:07',
        },
      };
      vi.mocked(getNotificationDetails).mockResolvedValue(
        mockNotificationDetails
      );
      const result = await checkNotificationsFunction.handler(
        {},
        mockToolContext
      );
      const expected = {
        success: true,
        notifications: {
          channel: 'chat',
          unreadCount: '99+',
          latestMessagePreview: {
            messageId: 'message-200',
            user: 'testuser',
            message: 'Test message',
            created_at: '2025/01/23 13:56:07',
          },
        },
      };
      expect(result).toEqual(expected);
    });

    it('チャンネルIDが存在しない', async () => {
      mockToolContext.store.get.mockResolvedValue(null);
      const result = await checkNotificationsFunction.handler(
        {},
        mockToolContext
      );
      expect(result.success).toBe(false);
      expect(result.error).toBe(CHAT_UNAVAILABLE_ERROR);
    });

    it('空のチャンネル（メッセージ0件）', async () => {
      const mockNotificationDetails = {
        unreadCount: 0,
        latestMessagePreview: null,
      };
      vi.mocked(getNotificationDetails).mockResolvedValue(
        mockNotificationDetails
      );
      const result = await checkNotificationsFunction.handler(
        {},
        mockToolContext
      );
      const expected = {
        success: true,
        notifications: {
          channel: 'chat',
          unreadCount: 0,
          latestMessagePreview: null,
        },
      };
      expect(result).toEqual(expected);
    });

    it('getNotificationDetails エラー', async () => {
      const error = new Error(CHAT_API_ERROR);
      vi.mocked(getNotificationDetails).mockRejectedValue(error);
      const result = await checkNotificationsFunction.handler(
        {},
        mockToolContext
      );
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
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

    it('基本的なメッセージ取得', async () => {
      const message = {
        message: 'Hello',
        user: 'user1',
        timestamp: '2025-01-23T04:56:07.089Z',
      };
      const mockMessages = createDiscordMessagesResponse([message]);
      vi.mocked(getChannelMessages).mockResolvedValue(mockMessages);
      const result = await readChatMessagesFunction.handler(
        { limit: 1 },
        mockToolContext
      );
      const expected = {
        success: true,
        messages: [
          {
            messageId: 'message-1',
            user: 'user1',
            message: 'Hello',
            created_at: '2025/01/23 13:56:07',
          },
        ],
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
      const result = await readChatMessagesFunction.handler(
        { limit: 3 },
        mockToolContext
      );
      const expected = {
        success: true,
        messages: [
          {
            messageId: 'message-3',
            user: 'user3',
            message: 'First',
            created_at: '2025/01/23 13:56:07',
          },
          {
            messageId: 'message-2',
            user: 'user2',
            message: 'Second',
            created_at: '2025/01/23 13:56:08',
          },
          {
            messageId: 'message-1',
            user: 'user1',
            message: 'Third',
            created_at: '2025/01/23 13:56:09',
          },
        ],
      };
      expect(result).toEqual(expected);
    });

    it('リアクション付きメッセージを取得', async () => {
      const message = {
        message: 'Hello with reactions',
        user: 'user1',
        timestamp: '2025-01-23T04:56:07.089Z',
        reactions: [
          { emoji: '👍', me: false },
          { emoji: '😄', me: true },
        ],
      };
      const mockMessages = createDiscordMessagesResponse([message]);
      vi.mocked(getChannelMessages).mockResolvedValue(mockMessages);
      const result = await readChatMessagesFunction.handler(
        { limit: 1 },
        mockToolContext
      );
      const expected = {
        success: true,
        messages: [
          {
            messageId: 'message-1',
            user: 'user1',
            message: 'Hello with reactions',
            created_at: '2025/01/23 13:56:07',
            reactions: [
              { emoji: '👍', me: false },
              { emoji: '😄', me: true },
            ],
          },
        ],
      };
      expect(result).toEqual(expected);
    });

    it('チャンネルIDが存在しない', async () => {
      mockToolContext.store.get.mockResolvedValue(null);
      const result = await readChatMessagesFunction.handler(
        { limit: 1 },
        mockToolContext
      );
      expect(result.success).toBe(false);
      expect(result.error).toBe(CHAT_UNAVAILABLE_ERROR);
    });

    it('getChannelMessages エラー', async () => {
      const error = new Error(CHAT_API_ERROR);
      vi.mocked(getChannelMessages).mockRejectedValue(error);
      const result = await readChatMessagesFunction.handler(
        { limit: 1 },
        mockToolContext
      );
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
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
      const result = await sendChatMessageFunction.handler(
        { message },
        mockToolContext
      );
      const expected = {
        success: true,
      };
      expect(result).toEqual(expected);
    });

    it('チャンネルIDが存在しない', async () => {
      mockToolContext.store.get.mockResolvedValue(null);
      const result = await sendChatMessageFunction.handler(
        { message: 'Hello' },
        mockToolContext
      );
      expect(result.success).toBe(false);
      expect(result.error).toBe(CHAT_UNAVAILABLE_ERROR);
    });

    it('sendChannelMessage エラー', async () => {
      const error = new Error(CHAT_API_ERROR);
      vi.mocked(sendChannelMessage).mockRejectedValue(error);
      const result = await sendChatMessageFunction.handler(
        { message: 'Hello' },
        mockToolContext
      );
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
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
        mockToolContext
      );

      const expected = {
        success: true,
      };
      expect(result).toEqual(expected);
    });

    it('チャンネルIDが存在しない', async () => {
      mockToolContext.store.get.mockResolvedValue(null);
      const result = await addReactionToChatMessageFunction.handler(
        { messageId: '123456789', reaction: '👍' },
        mockToolContext
      );
      expect(result.success).toBe(false);
      expect(result.error).toBe(CHAT_UNAVAILABLE_ERROR);
    });

    it('addReactionToMessage エラー', async () => {
      const error = new Error(CHAT_API_ERROR);
      vi.mocked(addReactionToMessage).mockRejectedValue(error);
      const result = await addReactionToChatMessageFunction.handler(
        { messageId: '123456789', reaction: '👍' },
        mockToolContext
      );
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });
});
