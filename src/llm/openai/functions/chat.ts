import { z } from 'zod';

import {
  addReactionToMessage,
  getChannelMessages,
  getUnreadMessageCount,
  sendChannelMessage,
} from '../../../discord';
import { createLogger } from '../../../utils/logger';

import { Tool } from '.';

export const checkNotificationsFunction = new Tool(
  'check_notifications',
  'Check for new notifications in the chat channel',
  {},
  async (_, env) => {
    const logger = createLogger(env);
    try {
      const channelId = await env.ECHO_KV.get('chat_channel_discord_rin');
      if (channelId === null) {
        await logger.error(
          'Chat channel ID not found in environment variables.'
        );
        return {
          success: false,
          error: 'Chat tool is currently unavailable.',
        };
      }

      const unreadCount = await getUnreadMessageCount(
        env.DISCORD_BOT_TOKEN_RIN,
        channelId
      );

      return {
        success: true,
        notifications: {
          channel: 'chat',
          unreadCount: unreadCount > 99 ? '99+' : unreadCount,
        },
      };
    } catch (error) {
      await logger.error(
        'Error checking notifications:',
        error instanceof Error ? error : new Error(String(error))
      );
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
);

export const readChatMessagesFunction = new Tool(
  'read_chat_messages',
  'Retrieve chat messages for a specific channel',
  {
    limit: z.number().min(1).describe('Number of messages to retrieve'),
  },
  async ({ limit }, env) => {
    const logger = createLogger(env);
    try {
      const channelId = await env.ECHO_KV.get('chat_channel_discord_rin');
      if (channelId === null) {
        await logger.error(
          'Chat channel ID not found in environment variables.'
        );
        return {
          success: false,
          error: 'Chat tool is currently unavailable.',
        };
      }

      const messages = await getChannelMessages(
        env.DISCORD_BOT_TOKEN_RIN,
        channelId,
        { limit }
      );

      return {
        success: true,
        // 投稿日時の昇順
        messages: messages.reverse().map((message) => ({
          user: message.author.username,
          message: message.content,
          timestamp: message.timestamp,
        })),
      };
    } catch (error) {
      await logger.error(
        'Error reading chat messages:',
        error instanceof Error ? error : new Error(String(error))
      );
      return {
        success: false,
        error: `Failed to read messages: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }
);

export const sendChatMessageFunction = new Tool(
  'send_chat_message',
  'Send a message to the chat channel',
  {
    message: z.string().describe('Message content to send'),
  },
  async ({ message }, env) => {
    const logger = createLogger(env);
    try {
      const channelId = await env.ECHO_KV.get('chat_channel_discord_rin');
      if (channelId === null) {
        await logger.error(
          'Chat channel ID not found in environment variables.'
        );
        return {
          success: false,
          error: 'Chat tool is currently unavailable.',
        };
      }

      await sendChannelMessage(env.DISCORD_BOT_TOKEN_RIN, channelId, {
        content: message,
      });

      return {
        success: true,
      };
    } catch (error) {
      await logger.error(
        'Error sending chat message:',
        error instanceof Error ? error : new Error(String(error))
      );
      return {
        success: false,
        error: `Failed to send message: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }
);

export const addReactionToChatMessageFunction = new Tool(
  'add_reaction_to_chat_message',
  'Add a reaction to a specific chat message',
  {
    messageId: z.string().describe('ID of the message to react to'),
    reaction: z.string().describe('Reaction to add, emoji string'),
  },
  async ({ messageId, reaction }, env) => {
    const logger = createLogger(env);
    try {
      const channelId = await env.ECHO_KV.get('chat_channel_discord_rin');
      if (channelId === null) {
        await logger.error(
          'Chat channel ID not found in environment variables.'
        );
        return {
          success: false,
          error: 'Chat tool is currently unavailable.',
        };
      }

      await addReactionToMessage(
        env.DISCORD_BOT_TOKEN_RIN,
        channelId,
        messageId,
        reaction
      );

      return {
        success: true,
      };
    } catch (error) {
      await logger.error(
        'Error adding reaction to chat message:',
        error instanceof Error ? error : new Error(String(error))
      );
      return {
        success: false,
        error: `Failed to add reaction: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }
);
