import { z } from 'zod';

import type { FunctionTool } from 'openai/resources/responses/responses';

export class Tool<Args extends z.ZodRawShape> {
  constructor(
    readonly name: string,
    readonly description: string,
    readonly parameters: Args,
    readonly handler: (args: z.infer<z.ZodObject<Args>>, env: Env) => unknown
  ) {}

  get definition(): FunctionTool {
    return {
      type: 'function',
      name: this.name,
      description: this.description,
      parameters: z.toJSONSchema(z.object(this.parameters)),
      strict: true,
    };
  }

  execute(args: string, env: Env): unknown {
    const parsedArgs = z.parse(z.object(this.parameters), JSON.parse(args));
    return this.handler(parsedArgs, env);
  }
}
