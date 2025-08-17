import { z } from 'zod';

import { formatDatetime } from '../../../utils/datetime';
import { getErrorMessage } from '../../../utils/error';

import { Tool } from '.';

export const getCurrentTimeFunction = new Tool(
  'get_current_time',
  'Get the current date and time in ISO format',
  {
    timezone: z
      .string()
      .optional()
      .default('Asia/Tokyo')
      .describe('Timezone identifier (e.g., "Asia/Tokyo", "UTC")'),
  },
  ({ timezone }) => {
    try {
      return {
        success: true,
        current_time: formatDatetime(new Date(), timezone),
        timezone,
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to format date: ${getErrorMessage(error)}`,
      };
    }
  }
);
