import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { getCurrentTimeFunction } from '../../../../../src/llm/openai/functions/time';
import { mockToolContext } from '../../../../mocks/tool';

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
      expect(parameters.timezone.def.defaultValue).toBe('Asia/Tokyo');
      expect(parameters.timezone.description).toBeDefined();
    });
  });

  describe('handler', () => {
    it('UTC timezone', () => {
      const result = getCurrentTimeFunction.handler(
        { timezone: 'UTC' },
        mockToolContext
      );
      const expected = {
        success: true,
        current_time: '2025/01/23 04:56:07',
        timezone: 'UTC',
      };
      expect(result).toEqual(expected);
    });

    it('Asia/Tokyo timezone', () => {
      const result = getCurrentTimeFunction.handler(
        { timezone: 'Asia/Tokyo' },
        mockToolContext
      );
      const expected = {
        success: true,
        current_time: '2025/01/23 13:56:07',
        timezone: 'Asia/Tokyo',
      };
      expect(result).toEqual(expected);
    });

    it('America/New_York timezone', () => {
      const result = getCurrentTimeFunction.handler(
        { timezone: 'America/New_York' },
        mockToolContext
      );
      const expected = {
        success: true,
        current_time: '2025/01/22 23:56:07',
        timezone: 'America/New_York',
      };
      expect(result).toEqual(expected);
    });

    it('invalid timezone', () => {
      const result = getCurrentTimeFunction.handler(
        { timezone: 'Invalid/Timezone' },
        mockToolContext
      );
      expect(result).toEqual({
        success: false,
        error:
          'Failed to format date: Invalid time zone specified: Invalid/Timezone',
      });
    });
  });
});
