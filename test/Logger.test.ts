import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Logger } from '../src/Logger';
import { Transport } from '../src/Transport';

// Mock Transport
const sendMock = vi.fn().mockResolvedValue(true);
vi.mock('../src/Transport', () => {
  return {
    Transport: vi.fn().mockImplementation(function () {
      return { send: sendMock };
    }),
  };
});

describe('Logger', () => {
  let logger: Logger;
  const config = {
    endpoint: 'https://api.example.com',
    apiKey: 'test-key',
    enabled: true,
    batchSize: 2, // Small batch size for testing
    flushInterval: 1000,
  };

  beforeEach(() => {
    // Reset singleton if exists (hacky but needed for testing singleton)
    (Logger as any).instance = undefined;
    vi.useFakeTimers();
    sendMock.mockClear();
    logger = Logger.init(config);
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  it('should initialize with config', () => {
    expect(logger).toBeDefined();
    expect(Logger.getInstance()).toBe(logger);
  });

  it('should buffer logs', () => {
    logger.info('Test message');
    // Access private buffer for testing
    expect((logger as any).buffer).toHaveLength(1);
    expect((logger as any).buffer[0].message).toBe('Test message');
  });

  it('should flush when batch size is reached', async () => {
    logger.info('Message 1');
    expect((logger as any).buffer).toHaveLength(1);
    
    logger.info('Message 2');
    // Should have flushed now, but it's async
    // Wait for microtasks to process
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();

    expect((logger as any).buffer).toHaveLength(0);
    
    expect(sendMock).toHaveBeenCalledTimes(1);
    expect(sendMock).toHaveBeenCalledWith(expect.arrayContaining([
      expect.objectContaining({ message: 'Message 1' }),
      expect.objectContaining({ message: 'Message 2' }),
    ]));
  });

  it('should flush on interval', async () => {
    logger.info('Message 1');
    expect((logger as any).buffer).toHaveLength(1);

    vi.advanceTimersByTime(1000);
    // Wait for microtasks
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();

    expect((logger as any).buffer).toHaveLength(0);
    expect(sendMock).toHaveBeenCalledTimes(1);
  });

  it('should not log if disabled', () => {
    (Logger as any).instance = undefined;
    const disabledLogger = Logger.init({ ...config, enabled: false });
    
    disabledLogger.info('Test');
    expect((disabledLogger as any).buffer).toHaveLength(0);
  });

  it('should deduplicate logs when enabled', () => {
    vi.setSystemTime(new Date('2023-01-01T00:00:00Z'));
    
    // Re-init with deduplication enabled
    (Logger as any).instance = undefined;
    logger = Logger.init({
      ...config,
      batchSize: 10,
      deduplication: true,
      deduplicationWindow: 1000,
    });

    logger.info('Duplicate message');
    logger.info('Duplicate message'); // Should be ignored
    
    expect((logger as any).buffer).toHaveLength(1);
    
    // Advance time to clear deduplication window
    vi.setSystemTime(new Date('2023-01-01T00:00:01.001Z'));
    
    logger.info('Duplicate message'); // Should be accepted now
    expect((logger as any).buffer).toHaveLength(2);
  });

  it('should support global context', () => {
    logger.setGlobalContext({ app_version: '1.0.0' });
    logger.setUser('user-123');

    logger.info('Test context');
    
    const entry = (logger as any).buffer[0];
    expect(entry.context).toMatchObject({
      app_version: '1.0.0',
      user_id: 'user-123',
    });
  });

  it('should run beforeSend hook', () => {
    (Logger as any).instance = undefined;
    logger = Logger.init({
      ...config,
      beforeSend: (log) => {
        if (log.message.includes('Ignore')) return null;
        log.message = '[Modified] ' + log.message;
        return log;
      }
    });

    logger.info('Ignore me');
    expect((logger as any).buffer).toHaveLength(0);

    logger.info('Keep me');
    expect((logger as any).buffer).toHaveLength(1);
    expect((logger as any).buffer[0].message).toBe('[Modified] Keep me');
  });

  it('should respect maxBufferSize', () => {
    (Logger as any).instance = undefined;
    logger = Logger.init({
      ...config,
      maxBufferSize: 3,
      batchSize: 10, // Don't flush automatically yet
    });

    logger.info('1');
    logger.info('2');
    logger.info('3');
    expect((logger as any).buffer).toHaveLength(3);

    logger.info('4');
    expect((logger as any).buffer).toHaveLength(3);
    // Should drop '1' (oldest) and keep '2', '3', '4'
    expect((logger as any).buffer[0].message).toBe('2');
    expect((logger as any).buffer[2].message).toBe('4');
  });

  it('should filter benign ResizeObserver warnings by default', () => {
    logger.error('ResizeObserver loop completed with undelivered notifications');
    logger.error('ResizeObserver loop limit exceeded');
    
    expect((logger as any).buffer).toHaveLength(0);
  });

  it('should filter generic "Script error." messages', () => {
    logger.error('Script error.');
    logger.error('Script error');
    
    expect((logger as any).buffer).toHaveLength(0);
  });

  it('should filter non-error promise rejections', () => {
    logger.error('Non-Error promise rejection captured with value: undefined');
    logger.error('Non-Error promise rejection captured with keys: somekey');
    
    expect((logger as any).buffer).toHaveLength(0);
  });

  it('should check for benign warnings in context.exception', () => {
    logger.error('Something went wrong', {
      exception: { message: 'ResizeObserver loop completed with undelivered notifications' }
    });
    
    expect((logger as any).buffer).toHaveLength(0);
  });

  it('should allow disabling benign warning suppression', () => {
    (Logger as any).instance = undefined;
    logger = Logger.init({
      ...config,
      suppressBenignWarnings: false,
      batchSize: 10,
    });

    logger.error('ResizeObserver loop completed with undelivered notifications');
    logger.error('Script error.');
    
    expect((logger as any).buffer).toHaveLength(2);
  });

  it('should filter benign warnings before beforeSend hook', () => {
    const beforeSendMock = vi.fn((log) => log);
    
    (Logger as any).instance = undefined;
    logger = Logger.init({
      ...config,
      beforeSend: beforeSendMock,
      batchSize: 10,
    });

    logger.error('ResizeObserver loop completed with undelivered notifications');
    logger.error('Real error message');
    
    // beforeSend should only be called for the real error (benign filtered before it)
    expect(beforeSendMock).toHaveBeenCalledTimes(1);
    expect(beforeSendMock).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Real error message' })
    );
  });

  it('should not filter warnings that partially match benign patterns', () => {
    logger.error('This is a real error about ResizeObserver usage in code');
    logger.error('Script error occurred in my application');
    
    // These should NOT be filtered because they're not exact matches
    expect((logger as any).buffer).toHaveLength(2);
  });
});
