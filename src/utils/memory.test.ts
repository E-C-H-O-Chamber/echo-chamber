import { describe, it, expect } from 'vitest';

import {
  CATEGORY_RETENTION_MULTIPLIERS,
  MAX_RETENTION_DAYS,
  calculateBaseRetentionDays,
  calculateForgottenAt,
} from './memory';

describe('CATEGORY_RETENTION_MULTIPLIERS', () => {
  it('ruleカテゴリーは5倍', () => {
    expect(CATEGORY_RETENTION_MULTIPLIERS.rule).toBe(5);
  });

  it('preferenceカテゴリーは2倍', () => {
    expect(CATEGORY_RETENTION_MULTIPLIERS.preference).toBe(2);
  });

  it('その他のカテゴリーは1倍', () => {
    expect(CATEGORY_RETENTION_MULTIPLIERS.fact).toBe(1);
    expect(CATEGORY_RETENTION_MULTIPLIERS.experience).toBe(1);
    expect(CATEGORY_RETENTION_MULTIPLIERS.insight).toBe(1);
    expect(CATEGORY_RETENTION_MULTIPLIERS.pattern).toBe(1);
    expect(CATEGORY_RETENTION_MULTIPLIERS.other).toBe(1);
  });
});

describe('calculateBaseRetentionDays', () => {
  it('accessCount=0の場合は1日', () => {
    expect(calculateBaseRetentionDays(0)).toBe(1); // 2^0 = 1
  });

  it('accessCount=1の場合は2日', () => {
    expect(calculateBaseRetentionDays(1)).toBe(2); // 2^1 = 2
  });

  it('accessCount=3の場合は8日', () => {
    expect(calculateBaseRetentionDays(3)).toBe(8); // 2^3 = 8
  });

  it('accessCount=10の場合は1024日', () => {
    expect(calculateBaseRetentionDays(10)).toBe(1024); // 2^10 = 1024
  });
});

describe('calculateForgottenAt', () => {
  const baseDate = '2025-08-04T08:00:00.000Z';

  describe('基本的な忘却日計算', () => {
    it('accessCount=0, category=otherの場合、1日後', () => {
      const result = calculateForgottenAt(baseDate, 0, 'other');
      expect(result).toBe('2025-08-05T08:00:00.000Z');
    });

    it('accessCount=3, category=otherの場合、8日後', () => {
      const result = calculateForgottenAt(baseDate, 3, 'other');
      expect(result).toBe('2025-08-12T08:00:00.000Z');
    });
  });

  describe('カテゴリー補正', () => {
    it('ruleカテゴリーは5倍（accessCount=0で5日後）', () => {
      const result = calculateForgottenAt(baseDate, 0, 'rule');
      expect(result).toBe('2025-08-09T08:00:00.000Z');
    });

    it('preferenceカテゴリーは2倍（accessCount=0で2日後）', () => {
      const result = calculateForgottenAt(baseDate, 0, 'preference');
      expect(result).toBe('2025-08-06T08:00:00.000Z');
    });

    it('ruleカテゴリー、accessCount=2で20日後', () => {
      // 2^2 = 4日 × 5倍 = 20日
      const result = calculateForgottenAt(baseDate, 2, 'rule');
      expect(result).toBe('2025-08-24T08:00:00.000Z');
    });
  });

  describe('月跨ぎ・年跨ぎ', () => {
    it('月跨ぎの計算', () => {
      const result = calculateForgottenAt(
        '2025-01-30T08:00:00.000Z',
        2,
        'other'
      );
      // 4日後 = 2025-02-03
      expect(result).toBe('2025-02-03T08:00:00.000Z');
    });

    it('年跨ぎの計算', () => {
      const result = calculateForgottenAt(
        '2024-12-28T08:00:00.000Z',
        3,
        'other'
      );
      // 8日後 = 2025-01-05
      expect(result).toBe('2025-01-05T08:00:00.000Z');
    });
  });

  describe('最大値制限（オーバーフロー対策）', () => {
    it('MAX_RETENTION_DAYSは730日（2年）', () => {
      expect(MAX_RETENTION_DAYS).toBe(730);
    });

    it('計算結果が最大値を超える場合、730日に制限される（category=other）', () => {
      // 2^10 = 1024日 > 730日
      const result = calculateForgottenAt(baseDate, 10, 'other');
      // 730日後 = 2027-08-04
      expect(result).toBe('2027-08-04T08:00:00.000Z');
    });

    it('計算結果が最大値を超える場合、730日に制限される（category=rule）', () => {
      // 2^8 * 5 = 1280日 > 730日
      const result = calculateForgottenAt(baseDate, 8, 'rule');
      // 730日後 = 2027-08-04
      expect(result).toBe('2027-08-04T08:00:00.000Z');
    });

    it('極端に大きなaccessCountでも最大値に制限される', () => {
      // 2^30 = 約10億日 → 730日に制限
      const result = calculateForgottenAt(baseDate, 30, 'other');
      expect(result).toBe('2027-08-04T08:00:00.000Z');
    });

    it('最大値未満の場合は制限されない', () => {
      // 2^9 = 512日 < 730日
      const result = calculateForgottenAt(baseDate, 9, 'other');
      // 512日後
      expect(result).toBe('2026-12-29T08:00:00.000Z');
    });

    it('カテゴリー補正後に最大値を超える場合も制限される', () => {
      // 2^7 * 5 = 640日 < 730日（制限されない）
      const result = calculateForgottenAt(baseDate, 7, 'rule');
      // 640日後
      expect(result).toBe('2027-05-06T08:00:00.000Z');
    });
  });
});
