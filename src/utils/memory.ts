import type { KnowledgeCategory } from '../echo/types';

/**
 * 記憶維持日数の最大値（2年）
 * オーバーフロー対策として設定
 */
export const MAX_RETENTION_DAYS = 730;

/**
 * カテゴリー別の記憶維持補正係数
 */
export const CATEGORY_RETENTION_MULTIPLIERS: Record<KnowledgeCategory, number> =
  {
    rule: 5,
    preference: 2,
    fact: 1,
    experience: 1,
    insight: 1,
    pattern: 1,
    other: 1,
  };

/**
 * アクセス回数から基本記憶維持日数を計算
 *
 * @param accessCount - アクセス回数（想起回数）
 * @returns 基本記憶維持日数（日）
 */
export function calculateBaseRetentionDays(accessCount: number): number {
  return Math.pow(2, accessCount);
}

/**
 * 忘却日を計算
 *
 * @param lastAccessedAt - 最終アクセス日時（ISO 8601形式）
 * @param accessCount - アクセス回数
 * @param category - 知識カテゴリー
 * @returns 忘却日（ISO 8601形式）
 */
export function calculateForgottenAt(
  lastAccessedAt: string,
  accessCount: number,
  category: KnowledgeCategory
): string {
  const baseRetentionDays = calculateBaseRetentionDays(accessCount);
  const categoryMultiplier = CATEGORY_RETENTION_MULTIPLIERS[category];
  const calculatedDays = baseRetentionDays * categoryMultiplier;

  // 最大値制限を適用（オーバーフロー対策）
  const retentionDays = Math.min(calculatedDays, MAX_RETENTION_DAYS);

  const forgottenDate = new Date(lastAccessedAt);
  forgottenDate.setDate(forgottenDate.getDate() + retentionDays);

  return forgottenDate.toISOString();
}
