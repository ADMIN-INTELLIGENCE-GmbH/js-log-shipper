import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Logger } from '../src/Logger';

// Mock Transport
const sendMock = vi.fn().mockResolvedValue(true);
vi.mock('../src/Transport', () => {
  return {
    Transport: vi.fn().mockImplementation(function () {
      return { send: sendMock };
    }),
  };
});

describe('Logger Ignore Patterns', () => {
  let logger: Logger;
  const config = {
    endpoint: 'https://api.example.com',
    apiKey: 'test-key',
    enabled: true,
  };

  beforeEach(() => {
    (Logger as any).instance = undefined;
    vi.useFakeTimers();
    sendMock.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  it('should ignore logs matching string pattern', () => {
    logger = Logger.init({
      ...config,
      ignorePatterns: ['Network Error'],
    });

    logger.error('Some random error');
    logger.error('This is a Network Error');
    logger.error('Another error');

    const buffer = (logger as any).buffer;
    expect(buffer).toHaveLength(2);
    expect(buffer[0].message).toBe('Some random error');
    expect(buffer[1].message).toBe('Another error');
  });

  it('should ignore logs matching regex pattern', () => {
    logger = Logger.init({
      ...config,
      ignorePatterns: [/AxiosError/],
    });

    logger.error('Some error');
    logger.error('Request failed with AxiosError: timeout');
    logger.error('Another error');

    const buffer = (logger as any).buffer;
    expect(buffer).toHaveLength(2);
    expect(buffer[0].message).toBe('Some error');
    expect(buffer[1].message).toBe('Another error');
  });

  it('should ignore logs matching any of multiple patterns', () => {
    logger = Logger.init({
      ...config,
      ignorePatterns: ['IgnoredString', /IgnoredRegex/],
    });

    logger.info('Keep this');
    logger.info('This contains IgnoredString');
    logger.info('This matches IgnoredRegex pattern');
    logger.info('Keep this too');

    const buffer = (logger as any).buffer;
    expect(buffer).toHaveLength(2);
    expect(buffer[0].message).toBe('Keep this');
    expect(buffer[1].message).toBe('Keep this too');
  });
});
