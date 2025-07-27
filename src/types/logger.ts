export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export type LogContext = Record<string, unknown>;

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: LogContext;
}

export interface LoggerConfig {
  level: LogLevel;
  mode: 'console' | 'structured';
  sendToDiscord: boolean;
  discordToken?: string;
  discordChannelId?: string;
}
