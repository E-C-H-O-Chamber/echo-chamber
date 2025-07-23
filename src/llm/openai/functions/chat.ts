import { z } from 'zod';

import {
  addReactionToMessage,
  getChannelMessages,
  getUnreadMessageCount,
  sendChannelMessage,
} from '../../discord';

import { Tool } from '.';

export const checkNotificationsFunction = new Tool(
  'check_notifications',
  'Check for new notifications in the chat channel',
  {},
  async (_, env) => {
    try {
      const channelId = await env.ECHO_KV.get('chat_channel_discord_rin');
      if (channelId === null) {
        console.error('Chat channel ID not found in environment variables.');
        return {
          error: 'Chat tool is currently unavailable.',
        };
      }

      const unreadCount = await getUnreadMessageCount(
        env.DISCORD_BOT_TOKEN_RIN,
        channelId
      );

      return {
        notifications: {
          channel: 'chat',
          unreadCount: unreadCount === 100 ? '99+' : unreadCount,
        },
      };
    } catch (error) {
      console.error('Error checking notifications:', error);
      return {
        error: `Failed to check notifications: ${error instanceof Error ? error.message : String(error)}`,
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
    try {
      const channelId = await env.ECHO_KV.get('chat_channel_discord_rin');
      if (channelId === null) {
        console.error('Chat channel ID not found in environment variables.');
        return {
          error: 'Chat tool is currently unavailable.',
        };
      }

      const messages = await getChannelMessages(
        env.DISCORD_BOT_TOKEN_RIN,
        channelId,
        { limit }
      );

      return {
        // 投稿日時の昇順
        messages: messages.reverse().map((message) => ({
          user: message.author.username,
          message: message.content,
          timestamp: message.timestamp,
        })),
      };
    } catch (error) {
      console.error('Error reading chat messages:', error);
      return {
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
    try {
      const channelId = await env.ECHO_KV.get('chat_channel_discord_rin');
      if (channelId === null) {
        console.error('Chat channel ID not found in environment variables.');
        return {
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
      console.error('Error sending chat message:', error);
      return {
        error: `Failed to send message: ${error instanceof Error ? error.message : String(error)}`,
        success: false,
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
    try {
      const channelId = await env.ECHO_KV.get('chat_channel_discord_rin');
      if (channelId === null) {
        console.error('Chat channel ID not found in environment variables.');
        return {
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
      console.error('Error adding reaction to chat message:', error);
      return {
        error: `Failed to add reaction: ${error instanceof Error ? error.message : String(error)}`,
        success: false,
      };
    }
  }
);
