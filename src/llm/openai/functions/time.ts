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
      timezone === 'UTC'
        ? now.toISOString()
        : now.toLocaleString('en-US', { timeZone: timezone });

    return `Current time (${timezone}): ${timeString}`;
  }
);
