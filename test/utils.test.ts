import { describe, it, expect } from 'vitest';
import { parseStackTrace, errorToContext, getSourceFromStack, safeStringify, redactObject } from '../src/utils';

describe('utils', () => {
  describe('parseStackTrace', () => {
    it('should parse Chrome-style stack traces', () => {
      const stack = `Error: test
    at Object.test (http://localhost:3000/src/test.ts:10:20)
    at Context.<anonymous> (http://localhost:3000/test/utils.test.ts:5:10)`;
      
      const frames = parseStackTrace(stack);
      expect(frames).toHaveLength(2);
      expect(frames[0]).toEqual({
        functionName: 'Object.test',
        fileName: 'http://localhost:3000/src/test.ts',
        lineNumber: 10,
        columnNumber: 20,
      });
    });

    it('should parse Firefox-style stack traces', () => {
      const stack = `test@http://localhost:3000/src/test.ts:10:20
anonymous@http://localhost:3000/test/utils.test.ts:5:10`;
      
      const frames = parseStackTrace(stack);
      expect(frames).toHaveLength(2);
      expect(frames[0]).toEqual({
        functionName: 'test',
        fileName: 'http://localhost:3000/src/test.ts',
        lineNumber: 10,
        columnNumber: 20,
      });
    });

    it('should handle stack traces without function names (Chrome)', () => {
      const stack = `    at http://localhost:3000/src/test.ts:10:20`;
      const frames = parseStackTrace(stack);
      expect(frames[0].functionName).toBe('unknown');
    });
  });

  describe('errorToContext', () => {
    it('should convert Error to LogContext', () => {
      const error = new Error('Test error');
      error.stack = `Error: Test error
    at Object.test (http://localhost:3000/src/test.ts:10:20)`;
      
      const context = errorToContext(error);
      
      expect(context).toMatchObject({
        message: 'Test error',
        name: 'Error',
        file: 'http://localhost:3000/src/test.ts',
        line: 10,
        function: 'Object.test',
      });
      expect(context.frames).toHaveLength(1);
    });

    it('should handle errors without stack', () => {
      const error = new Error('No stack');
      error.stack = undefined;
      
      const context = errorToContext(error);
      expect(context.message).toBe('No stack');
      expect(context.frames).toHaveLength(0);
    });
  });

  describe('getSourceFromStack', () => {
    it('should extract controller and method from stack', () => {
      const stack = `Error: test
    at Object.doSomething (http://localhost:3000/src/controllers/UserController.ts:10:20)`;
      
      const source = getSourceFromStack(stack);
      expect(source).toEqual({
        controller: 'src/controllers/UserController.ts',
        method: 'Object.doSomething',
      });
    });

    it('should handle non-URL file paths', () => {
      const stack = `Error: test
    at Object.doSomething (/Users/user/project/src/file.ts:10:20)`;
      
      const source = getSourceFromStack(stack);
      expect(source).toEqual({
        controller: '/Users/user/project/src/file.ts',
        method: 'Object.doSomething',
      });
    });

    it('should return empty object for empty stack', () => {
      expect(getSourceFromStack('')).toEqual({});
    });
  });
});

describe('security utils', () => {
  it('safeStringify should handle circular references', () => {
    const obj: any = { a: 1 };
    obj.self = obj;
    
    const str = safeStringify(obj);
    expect(str).toContain('"[Circular]"');
    expect(str).toContain('"a":1');
  });

  it('safeStringify should handle BigInt', () => {
    const obj = { val: BigInt(123) };
    const str = safeStringify(obj);
    expect(str).toContain('"val":"123"');
  });

  it('redactObject should hide sensitive keys', () => {
    const obj = {
      username: 'john',
      password: 'secret123',
      nested: {
        token: 'xyz-token',
        public: 'visible'
      }
    };
    
    const redacted = redactObject(obj, ['password', 'token']);
    
    expect(redacted.username).toBe('john');
    expect(redacted.password).toBe('[REDACTED]');
    expect(redacted.nested.token).toBe('[REDACTED]');
    expect(redacted.nested.public).toBe('visible');
  });
});
