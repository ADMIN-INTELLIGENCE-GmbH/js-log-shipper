import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Instrumentation } from '../src/Instrumentation';
import { Logger } from '../src/Logger';

// Mock Logger
const logMock = vi.fn();
const loggerMock = {
  log: logMock,
} as unknown as Logger;

describe('Instrumentation', () => {
  beforeEach(() => {
    // Mock window
    vi.stubGlobal('window', {
      onerror: null,
      onunhandledrejection: null,
    });
    logMock.mockClear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('should install window.onerror handler', () => {
    const instrumentation = new Instrumentation(loggerMock, { windowError: true });
    instrumentation.install();

    expect(window.onerror).toBeDefined();
    expect(typeof window.onerror).toBe('function');
  });

  it('should capture window errors', () => {
    const instrumentation = new Instrumentation(loggerMock, { windowError: true });
    instrumentation.install();

    const error = new Error('Test error');
    error.stack = `Error: Test error
    at func (script.js:10:20)`;
    
    // Simulate onerror call
    // @ts-ignore
    window.onerror('Test error', 'script.js', 10, 20, error);

    expect(logMock).toHaveBeenCalledWith('error', 'Test error', expect.objectContaining({
      file: 'script.js',
      line: 10,
      column: 20,
      message: 'Test error',
    }));
  });

  it('should install unhandledrejection handler', () => {
    const instrumentation = new Instrumentation(loggerMock, { unhandledRejection: true });
    instrumentation.install();

    expect(window.onunhandledrejection).toBeDefined();
  });

  it('should capture unhandled rejections', () => {
    const instrumentation = new Instrumentation(loggerMock, { unhandledRejection: true });
    instrumentation.install();

    const error = new Error('Promise error');
    const event = { reason: error };
    
    // Simulate onunhandledrejection
    // @ts-ignore
    window.onunhandledrejection(event);

    expect(logMock).toHaveBeenCalledWith('error', 'Promise error', expect.objectContaining({
      message: 'Promise error',
    }));
  });
  
  it('should call original handlers', () => {
    const originalOnError = vi.fn();
    window.onerror = originalOnError;
    
    const instrumentation = new Instrumentation(loggerMock, { windowError: true });
    instrumentation.install();
    
    // @ts-ignore
    window.onerror('msg', 'file', 1, 1, new Error('err'));
    
    expect(originalOnError).toHaveBeenCalled();
  });
});
