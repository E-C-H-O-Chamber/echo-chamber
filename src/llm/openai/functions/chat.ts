import { z } from 'zod';

import { Tool } from '.';

export const checkNotificationsFunction = new Tool(
  'check_notifications',
  'Check for new notifications in the chat channel',
  {},
  () => {
    return {
      // モック
      notifications: {
        channelId: '1371143541526499470',
        unreadCount: 3,
      },
    };
  }
);

export const readChatMessagesFunction = new Tool(
  'read_chat_messages',
  'Retrieve chat messages for a specific channel',
  {
    channelId: z.string().describe('Unique identifier for the chat channel'),
  },
  ({ channelId: _ }) => {
    return {
      // モック
      unreadMessages: [
        {
          user: 'yatabis',
          message: 'リンちゃん。元気？',
        },
        {
          user: 'yatabis',
          message: 'おーい',
        },
        {
          user: 'yatabis',
          message: '生きてる？',
        },
      ],
    };
  }
);

export const sendChatMessageFunction = new Tool(
  'send_chat_message',
  'Send a message to the chat channel',
  {
    channelId: z.string().describe('Unique identifier for the chat channel'),
    message: z.string().describe('Message content to send'),
  },
  ({ channelId: _channelId, message: _message }) => {
    // モック
    return {
      success: true,
    };
  }
);
