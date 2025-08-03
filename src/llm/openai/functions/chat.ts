import { z } from 'zod';

import {
  addReactionToMessage,
  getChannelMessages,
  getUnreadMessageCount,
  sendChannelMessage,
} from '../../../discord';
import { getErrorMessage } from '../../../utils/error';
import { createLogger } from '../../../utils/logger';

import { Tool } from '.';

export const checkNotificationsFunction = new Tool(
  'check_notifications',
  'Check for new notifications in the chat channel. Returns the unread message count.',
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
        `Error checking notifications: ${getErrorMessage(error)}`
      );
      return {
        success: false,
        error: 'Failed to fetch notifications',
      };
    }
  }
);

export const readChatMessagesFunction = new Tool(
  'read_chat_messages',
  'Retrieve chat messages. Returns the latest messages in ascending order by timestamp.',
  {
    limit: z.int().min(1).max(100).describe('Number of messages to retrieve'),
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
          messageId: message.id,
          user: message.author.username,
          message: message.content,
          timestamp: message.timestamp,
          reactions: message.reactions?.map((reaction) => ({
            emoji: reaction.emoji.name,
            me: reaction.me,
          })),
        })),
      };
    } catch (error) {
      await logger.error(
        `Error reading chat messages: ${getErrorMessage(error)}`
      );
      return {
        success: false,
        error: 'Failed to read messages',
      };
    }
  }
);

export const sendChatMessageFunction = new Tool(
  'send_chat_message',
  'Send a message to the chat channel',
  {
    message: z
      .string()
      .min(1)
      .max(2000)
      .describe('Message content to send. Max 2000 characters.'),
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
        `Error sending chat message: ${getErrorMessage(error)}`
      );
      return {
        success: false,
        error: 'Failed to send message',
      };
    }
  }
);

export const addReactionToChatMessageFunction = new Tool(
  'add_reaction_to_chat_message',
  'Add a reaction to a specific chat message. The reaction must be a valid emoji string. When you react to a message, the messages up to that point are marked as read.',
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
        `Error adding reaction to chat message: ${getErrorMessage(error)}`
      );
      return {
        success: false,
        error: 'Failed to add reaction',
      };
    }
  }
);
