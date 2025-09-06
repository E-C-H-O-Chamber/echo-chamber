import { describe, it, expect } from 'vitest';

import { formatDatetime, formatDate } from './datetime';

describe('formatDatetime', () => {
  it('基本的な日時フォーマット（Asia/Tokyo）', () => {
    const date = new Date('2025-09-06T02:30:45Z');

    const result = formatDatetime(date);

    expect(result).toBe('2025/09/06 11:30:45');
  });

  it('深夜の時間を正しく表示', () => {
    const date = new Date('2025-09-06T18:00:00Z');

    const result = formatDatetime(date);

    expect(result).toBe('2025/09/07 03:00:00');
  });

  it('24時間表記で表示', () => {
    const date = new Date('2025-09-06T03:15:30Z');

    const result = formatDatetime(date);

    expect(result).toBe('2025/09/06 12:15:30');
  });

  it('タイムゾーン UTC を指定', () => {
    const date = new Date('2025-09-06T15:30:45Z');

    const result = formatDatetime(date, 'UTC');

    expect(result).toBe('2025/09/06 15:30:45');
  });

  it('タイムゾーン America/New_York を指定', () => {
    const date = new Date('2025-09-06T15:30:45Z');

    const result = formatDatetime(date, 'America/New_York');

    // New York は UTC-4 または UTC-5 (夏時間による)
    // 9月なので夏時間適用でUTC-4
    expect(result).toBe('2025/09/06 11:30:45');
  });

  it('月跨ぎの時間変換', () => {
    const date = new Date('2025-02-28T18:00:00Z');

    const result = formatDatetime(date);

    expect(result).toBe('2025/03/01 03:00:00');
  });

  it('年跨ぎの時間変換', () => {
    const date = new Date('2024-12-31T18:00:00Z');

    const result = formatDatetime(date);

    expect(result).toBe('2025/01/01 03:00:00');
  });
});

describe('formatDate', () => {
  it('基本的な日付フォーマット（Asia/Tokyo）', () => {
    const date = new Date('2025-09-06T15:30:45Z');

    const result = formatDate(date);

    expect(result).toBe('2025-09-07');
  });

  it('タイムゾーン UTC を指定', () => {
    const date = new Date('2025-09-06T15:30:45Z');

    const result = formatDate(date, 'UTC');

    expect(result).toBe('2025-09-06');
  });

  it('タイムゾーン America/New_York を指定', () => {
    const date = new Date('2025-09-06T15:30:45Z');

    const result = formatDate(date, 'America/New_York');

    // New York は UTC-4 (夏時間) なので同日
    expect(result).toBe('2025-09-06');
  });

  it('月跨ぎの日付変換', () => {
    const date = new Date('2025-02-28T18:00:00Z');

    const result = formatDate(date);

    expect(result).toBe('2025-03-01');
  });

  it('年跨ぎの日付変換', () => {
    const date = new Date('2024-12-31T18:00:00Z');

    const result = formatDate(date);

    expect(result).toBe('2025-01-01');
  });

  it('うるう年の2月29日', () => {
    const date = new Date('2024-02-29T12:00:00Z');

    const result = formatDate(date);

    expect(result).toBe('2024-02-29');
  });

  it('1桁の月と日が0埋めされる', () => {
    const date = new Date('2025-01-05T12:00:00Z');

    const result = formatDate(date);

    expect(result).toBe('2025-01-05');
  });
});
