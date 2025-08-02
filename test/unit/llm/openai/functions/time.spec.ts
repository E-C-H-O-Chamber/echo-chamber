import { env } from 'cloudflare:test';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { getCurrentTimeFunction } from '../../../../../src/llm/openai/functions/time';

describe('getCurrentTimeFunction', () => {
  beforeAll(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-01-23T04:56:07.089Z'));
  });

  afterAll(() => {
    vi.useRealTimers();
  });

  it('name', () => {
    expect(getCurrentTimeFunction.name).toBe('get_current_time');
  });

  it('description', () => {
    expect(getCurrentTimeFunction.description).toBeDefined();
  });

  describe('parameters', () => {
    const { parameters } = getCurrentTimeFunction;
    expect(parameters).toBeDefined();

    it('timezone', () => {
      expect(parameters).toHaveProperty('timezone');
      expect(parameters.timezone.unwrap().unwrap().def.type).toBe('string');
      expect(parameters.timezone.unwrap().def.type).toBe('optional');
      expect(parameters.timezone.def.defaultValue).toBe('UTC');
      expect(parameters.timezone.description).toBeDefined();
    });
  });

  describe('handler', () => {
    it('UTC timezone', () => {
      const result = getCurrentTimeFunction.handler({ timezone: 'UTC' }, env);
      const expected = {
        success: true,
        timestamp: '2025-01-23T04:56:07.089Z',
        timezone: 'UTC',
      };
      expect(result).toEqual(expected);
    });

    it('Asia/Tokyo timezone', () => {
      const result = getCurrentTimeFunction.handler(
        { timezone: 'Asia/Tokyo' },
        env
      );
      const expected = {
        success: true,
        timestamp: '2025-01-23T13:56:07.089+09:00',
        timezone: 'Asia/Tokyo',
      };
      expect(result).toEqual(expected);
    });
  });
});
