import {
  RESTGetAPIChannelMessagesResult,
  APIMessage,
  APIUser,
  APIReaction,
} from 'discord-api-types/v10';

type MessageInput = {
  message: string;
  user: string;
  timestamp: string;
  reactions?: string[];
};

export function createDiscordMessagesResponse(
  messages: MessageInput[]
): RESTGetAPIChannelMessagesResult {
  return messages.map((msg, index) => {
    const author: APIUser = {
      id: `user-${index + 1}`,
      username: msg.user,
      discriminator: '0000',
      global_name: msg.user,
      avatar: null,
      bot: false,
      system: false,
      mfa_enabled: false,
    };

    const reactions: APIReaction[] | undefined = msg.reactions?.map(
      (emoji) => ({
        count: 1,
        count_details: {
          burst: 0,
          normal: 1,
        },
        me: true,
        me_burst: false,
        emoji: {
          id: null,
          name: emoji,
          animated: false,
        },
        burst_colors: [],
      })
    );

    const message: APIMessage = {
      id: `message-${index + 1}`,
      type: 0,
      content: msg.message,
      channel_id: 'test-channel-id',
      author,
      timestamp: msg.timestamp,
      edited_timestamp: null,
      tts: false,
      mention_everyone: false,
      mentions: [],
      mention_roles: [],
      mention_channels: [],
      attachments: [],
      embeds: [],
      reactions: reactions || [],
      pinned: false,
    };

    return message;
  });
}
