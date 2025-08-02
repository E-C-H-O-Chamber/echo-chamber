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

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = {
      level: config.level ?? 'info',
      mode: config.mode ?? 'console',
      sendToDiscord: config.sendToDiscord ?? false,
      discordToken: config.discordToken,
      discordChannelId: config.discordChannelId,
    };
  }

  async debug(message: string): Promise<void> {
    await this.log('debug', message);
  }

  async info(message: string): Promise<void> {
    await this.log('info', message);
  }

  async warn(message: string): Promise<void> {
    await this.log('warn', message);
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
      : {};

    await this.log('error', message, { ...errorContext });
  }

  private async log(
    level: LogLevel,
    message: string,
    context?: LogContext
  ): Promise<void> {
    if (LOG_LEVELS[level] < LOG_LEVELS[this.config.level]) {
      return;
    }

    const logEntry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
    };

    switch (this.config.mode) {
      case 'structured':
        this.outputStructured(logEntry);
        break;
      case 'console':
        this.outputSimple(level, message, context);
        break;
      default:
        throw new Error(
          `Unknown logger mode: ${this.config.mode satisfies never}`
        );
    }

    // Discord送信（同期実行で時系列順を保持）
    if (this.config.sendToDiscord) {
      try {
        await this.sendToDiscord(logEntry);
      } catch (error: unknown) {
        console.error('Failed to send log to Discord:', error);
      }
    }
  }

  private outputStructured(entry: LogEntry): void {
    const logString = JSON.stringify(entry);

    switch (entry.level) {
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
  }

  private outputSimple(
    level: LogLevel,
    message: string,
    context?: LogContext
  ): void {
    const contextStr =
      context && Object.keys(context).length > 0
        ? ` ${JSON.stringify(context)}`
        : '';

    const logMessage = `[${level.toUpperCase()}] ${message}${contextStr}`;

    switch (level) {
      case 'debug':
        console.debug(logMessage);
        break;
      case 'info':
        console.info(logMessage);
        break;
      case 'warn':
        console.warn(logMessage);
        break;
      case 'error':
        console.error(logMessage);
        break;
    }
  }

  private async sendToDiscord(entry: LogEntry): Promise<void> {
    const { discordToken, discordChannelId } = this.config;

    if (
      typeof discordToken !== 'string' ||
      typeof discordChannelId !== 'string'
    ) {
      throw new Error(
        'Discord token or channel ID is not configured properly.'
      );
    }

    const levelEmoji = {
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

    await sendChannelMessage(discordToken, discordChannelId, {
      content: discordMessage,
    });
  }
}

export function createLogger(env: Env): Logger {
  const config: LoggerConfig = {
    level: env.ENVIRONMENT === 'local' ? 'debug' : 'info',
    mode: env.ENVIRONMENT === 'local' ? 'console' : 'structured',
    sendToDiscord: true,
    discordToken: env.DISCORD_BOT_TOKEN,
    discordChannelId: env.LOG_CHANNEL_ID,
  };

  return new Logger(config);
}
