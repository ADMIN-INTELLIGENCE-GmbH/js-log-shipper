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

describe('Logger Disabled Hosts', () => {
  const config = {
    endpoint: 'https://api.example.com',
    apiKey: 'test-key',
    enabled: true,
  };

  beforeEach(() => {
    (Logger as any).instance = undefined;
    vi.useFakeTimers();
    sendMock.mockClear();
    
    // Default window mock
    vi.stubGlobal('window', {
      location: {
        hostname: 'example.com',
        href: 'https://example.com'
      },
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('should be enabled on non-disabled host', () => {
    const logger = Logger.init({
        ...config,
        disabledHosts: ['localhost']
    });

    logger.info('Test');
    const buffer = (logger as any).buffer;
    expect(buffer).toHaveLength(1);
    expect((logger as any).config.enabled).toBe(true);
  });

  it('should be disabled on exact match host', () => {
    vi.stubGlobal('window', {
        location: {
          hostname: 'localhost',
          href: 'http://localhost'
        },
        addEventListener: vi.fn(),
      });

    const logger = Logger.init({
        ...config,
        disabledHosts: ['localhost']
    });

    logger.info('Test');
    const buffer = (logger as any).buffer;
    expect(buffer).toHaveLength(0);
    expect((logger as any).config.enabled).toBe(false);
  });

  it('should be disabled on regex match host', () => {
    vi.stubGlobal('window', {
        location: {
          hostname: 'app.test',
          href: 'http://app.test'
        },
        addEventListener: vi.fn(),
      });

    const logger = Logger.init({
        ...config,
        disabledHosts: [/\.test$/]
    });

    logger.info('Test');
    const buffer = (logger as any).buffer;
    expect(buffer).toHaveLength(0);
    expect((logger as any).config.enabled).toBe(false);
  });

  it('should remain enabled if disabledHosts is empty', () => {
    vi.stubGlobal('window', {
        location: {
          hostname: 'localhost',
          href: 'http://localhost'
        },
        addEventListener: vi.fn(),
      });

    const logger = Logger.init({
        ...config,
        disabledHosts: []
    });

    expect((logger as any).config.enabled).toBe(true);
  });
});
