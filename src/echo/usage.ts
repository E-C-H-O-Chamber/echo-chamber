import type { ResponseUsage } from 'openai/resources/responses/responses';

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

/**
 * 既存のUsageRecordに新しいUsageを加算する
 * @param usageRecord 既存のUsageRecord
 * @param key Usage加算するキー
 * @param usage 新しいUsage
 * @returns 更新されたUsageRecord
 */
export function addUsage(
  usageRecord: UsageRecord,
  key: string,
  usage: Usage
): UsageRecord {
  if (usageRecord[key]) {
    usageRecord[key].cached_input_tokens += usage.cached_input_tokens;
    usageRecord[key].uncached_input_tokens += usage.uncached_input_tokens;
    usageRecord[key].total_input_tokens += usage.total_input_tokens;
    usageRecord[key].output_tokens += usage.output_tokens;
    usageRecord[key].reasoning_tokens += usage.reasoning_tokens;
    usageRecord[key].total_tokens += usage.total_tokens;
    usageRecord[key].total_cost += usage.total_cost;
  } else {
    usageRecord[key] = usage;
  }

  return usageRecord;
}

/**
 * OpenAI SDKのResponseUsageをEchoのUsageに変換する
 * @param usage OpenAI SDKのResponseUsage
 * @returns EchoのUsage
 */
export function convertUsage(usage: ResponseUsage): Usage {
  const {
    input_tokens,
    input_tokens_details,
    output_tokens,
    output_tokens_details,
    total_tokens,
  } = usage;
  const { cached_tokens } = input_tokens_details;
  const { reasoning_tokens } = output_tokens_details;

  const cached_input_tokens = cached_tokens;
  const uncached_input_tokens = input_tokens - cached_tokens;

  // See https://platform.openai.com/docs/pricing
  const total_cost =
    (cached_input_tokens * 0.125 +
      uncached_input_tokens * 1.25 +
      output_tokens * 10) /
    1_000_000;

  return {
    cached_input_tokens,
    uncached_input_tokens,
    total_input_tokens: input_tokens,
    output_tokens,
    reasoning_tokens,
    total_tokens,
    total_cost,
  };
}

/**
 * 現在時刻に基づいて動的なトークン使用制限を計算
 */
export function calculateDynamicTokenLimit(
  tokenLimit: number,
  bufferFactor = 1.0
): number {
  const now = new Date();
  const currentHour = now.getHours() + now.getMinutes() / 60;

  // 現在時刻までの按分
  const idealUsageAtThisTime = tokenLimit * (currentHour / 24);

  // 余裕を持たせた許可量
  const allowedUsageWithBuffer = idealUsageAtThisTime * bufferFactor;

  // 上限は制限を超えない
  return Math.min(allowedUsageWithBuffer, tokenLimit);
}
