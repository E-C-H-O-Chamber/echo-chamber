import { z } from 'zod';

import { Tool } from '.';

export const getCurrentTimeFunction = new Tool(
  'get_current_time',
  'Get the current date and time in ISO format',
  {
    timezone: z
      .string()
      .optional()
      .default('UTC')
      .describe('Timezone identifier (e.g., "Asia/Tokyo", "UTC")'),
  },
  ({ timezone }) => {
    const now = new Date();
    const timeString =
      timezone === 'UTC' ? now.toISOString() : toIsoStringWithTimezone(now);

    return {
      success: true,
      timestamp: timeString,
      timezone,
    };
  }
);

function toIsoStringWithTimezone(date: Date): string {
  const tzo = -date.getTimezoneOffset();
  const dif = tzo >= 0 ? '+' : '-';
  const pad = (num: number, size = 2): string =>
    `${'0'.repeat(size - 1)}${num}`.slice(-size);
  const dateString = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  const timeString = `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}.${pad(date.getMilliseconds(), 3)}`;
  const timezoneOffset = `${dif}${pad(Math.floor(Math.abs(tzo) / 60))}:${pad(Math.abs(tzo) % 60)}`;

  return `${dateString}T${timeString}${timezoneOffset}`;
}
