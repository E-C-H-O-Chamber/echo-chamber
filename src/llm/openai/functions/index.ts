import { z } from 'zod';

import type { FunctionTool } from 'openai/resources/responses/responses';

interface ToolResultSuccess {
  success: true;
  [key: string]: unknown;
}

interface ToolResultError {
  success: false;
  error: string;
}

export type ToolResult = ToolResultSuccess | ToolResultError;

export interface ITool {
  name: string;
  description: string;
  definition: FunctionTool;
  execute(args: string, env: Env): ToolResult | Promise<ToolResult>;
}

export class Tool<Args extends z.ZodRawShape> implements ITool {
  constructor(
    readonly name: string,
    readonly description: string,
    readonly parameters: Args,
    readonly handler: (
      args: z.infer<z.ZodObject<Args>>,
      env: Env
    ) => ToolResult | Promise<ToolResult>
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

  execute(args: string, env: Env): ToolResult | Promise<ToolResult> {
    const parsedArgs = z.parse(z.object(this.parameters), JSON.parse(args));
    return this.handler(parsedArgs, env);
  }
}
