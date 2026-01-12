import { sendChannelMessage } from '../discord';

import type {
  LogContext,
  LogEntry,
  LogLevel,
  LoggerConfig,
} from '../types/logger';

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

export class Logger {
  private readonly config: LoggerConfig;

  constructor(config: LoggerConfig) {
    this.config = config;
  }

  /**
   * Discord通知の閾値レベルを取得
   */
  get discordNotifyLevel(): LogLevel {
    return this.config.discordNotifyLevel;
  }

  async debug(message: string, context?: LogContext): Promise<void> {
    await this.log('debug', message, context);
  }

  async info(message: string, context?: LogContext): Promise<void> {
    await this.log('info', message, context);
  }

  async warn(message: string, context?: LogContext): Promise<void> {
    await this.log('warn', message, context);
  }

  async error(message: string, error?: Error): Promise<void> {
    const errorContext = error
      ? {
          error: {
            name: error.name,
            message: error.message,
            stack: error.stack,
          },
        }
      : undefined;

    await this.log('error', message, errorContext);
  }

  private async log(
    level: LogLevel,
    message: string,
    context?: LogContext
  ): Promise<void> {
    const logEntry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
    };

    // 1. コンソール出力（常にstructured JSON形式）
    const logString = JSON.stringify(logEntry);
    switch (level) {
      case 'debug':
        console.debug(logString);
        break;
      case 'info':
        console.info(logString);
        break;
      case 'warn':
        console.warn(logString);
        break;
      case 'error':
        console.error(logString);
        break;
    }

    // 2. Discord通知はdiscordNotifyLevel以上のみ
    if (
      this.config.discord &&
      LOG_LEVELS[level] >= LOG_LEVELS[this.config.discordNotifyLevel]
    ) {
      try {
        await this.sendToDiscord(logEntry);
      } catch (error: unknown) {
        // Discord送信失敗はコンソールにのみ出力（無限ループ防止）
        console.error('Failed to send log to Discord:', error);
      }
    }
  }

  private async sendToDiscord(entry: LogEntry): Promise<void> {
    const { discord } = this.config;
    if (!discord) return;

    const levelEmoji: Record<LogLevel, string> = {
      debug: '🔍',
      info: 'ℹ️',
      warn: '⚠️',
      error: '🚨',
    };

    const contextStr =
      entry.context && Object.keys(entry.context).length > 0
        ? `\n\`\`\`json\n${JSON.stringify(entry.context, null, 2)}\n\`\`\``
        : '';

    const baseMessage = `${levelEmoji[entry.level]} **[${entry.level.toUpperCase()}]** ${entry.message}${contextStr}`;

    // Discord文字数制限（2000文字）への対応
    const discordMessage =
      baseMessage.length > 2000
        ? `${baseMessage.substring(0, 1980)}...(truncated)`
        : baseMessage;

    await sendChannelMessage(discord.token, discord.channelId, {
      content: discordMessage,
    });
  }
}

/**
 * 環境変数からLoggerを生成
 */
export function createLogger(env: Env): Logger {
  const isLocal = env.ENVIRONMENT === 'local';

  return new Logger({
    // ローカル: debug以上全てDiscord通知
    // 本番: info以上のみDiscord通知
    discordNotifyLevel: isLocal ? 'debug' : 'info',
    discord: {
      token: env.DISCORD_BOT_TOKEN,
      channelId: env.LOG_CHANNEL_ID,
    },
  });
}
