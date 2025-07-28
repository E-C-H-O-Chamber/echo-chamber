import { z } from 'zod';

import { Tool } from '.';

export const thinkDeeplyFunction = new Tool(
  'think_deeply',
  'Think deeply about a topic and provide insights. It will not obtain new information or change the database, but just append the thought to the log. Use it when complex reasoning or some cache memory is needed.',
  {
    thought: z.string().describe('A thought to think deeply about'),
  },
  () => {
    // LLM が考えるだけで処理は何もない
    return {
      success: true,
    };
  }
);
