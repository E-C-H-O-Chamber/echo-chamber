export type EchoState = 'Idling' | 'Running' | 'Sleeping';

export interface Task {
  name: string;
  content: string;
  execution_time: string;
}

export interface Usage {
  cached_input_tokens: number;
  uncached_input_tokens: number;
  total_input_tokens: number;
  output_tokens: number;
  reasoning_tokens: number;
  total_tokens: number;
  total_cost: number;
}

export type UsageRecord = Record<string, Usage>;
