import { describe, expect, it } from 'vitest';

import { thinkDeeplyFunction } from '../../../../../src/llm/openai/functions/think';
import { mockToolContext } from '../../../../mocks/tool';

describe('thinkDeeplyFunction', () => {
  it('name', () => {
    expect(thinkDeeplyFunction.name).toBe('think_deeply');
  });

  it('description', () => {
    expect(thinkDeeplyFunction.description).toBeDefined();
  });

  describe('parameters', () => {
    const { parameters } = thinkDeeplyFunction;
    expect(parameters).toBeDefined();

    it('thought', () => {
      expect(parameters).toHaveProperty('thought');
      expect(parameters.thought.def.type).toBe('string');
      expect(parameters.thought.description).toBeDefined();
    });
  });

  describe('handler', () => {
    it('thought', () => {
      const result = thinkDeeplyFunction.handler(
        { thought: 'What is the meaning of life?' },
        mockToolContext
      );
      const expected = {
        success: true,
      };
      expect(result).toEqual(expected);
    });
  });
});
