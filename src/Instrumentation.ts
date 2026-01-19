import { Logger } from './Logger';
import { errorToContext, getSourceFromStack, safeStringify } from './utils';

export interface InstrumentationConfig {
  console?: boolean;
  consoleLevels?: ('debug' | 'info' | 'warn' | 'error' | 'log' | 'dir')[];
  windowError?: boolean;
  unhandledRejection?: boolean;
}

export class Instrumentation {
  private logger: Logger;
  private config: InstrumentationConfig;
  private originalConsole: { [key: string]: any } = {};

  constructor(logger: Logger, config: InstrumentationConfig = {}) {
    this.logger = logger;
    this.config = {
      console: true,
      consoleLevels: ['error', 'warn'], // Default to only critical logs to reduce noise
      windowError: true,
      unhandledRejection: true,
      ...config,
    };
  }

  public install(): void {
    if (typeof window === 'undefined') return;

    if (this.config.windowError) {
      this.installWindowError();
    }

    if (this.config.unhandledRejection) {
      this.installUnhandledRejection();
    }

    if (this.config.console) {
      this.installConsole();
    }
  }

  private installWindowError(): void {
    const originalOnError = window.onerror;

    window.onerror = (message, source, lineno, colno, error) => {
      const context: any = {
        file: source,
        line: lineno,
        column: colno,
      };

      if (error) {
        Object.assign(context, errorToContext(error));
      }

      // Extract controller/method from error stack if available
      let sourceInfo = {};
      if (error && error.stack) {
        sourceInfo = getSourceFromStack(error.stack);
      }

      this.logger.log('error', String(message), {
        ...context,
        ...sourceInfo,
      });

      if (originalOnError) {
        return originalOnError(message, source, lineno, colno, error);
      }
      return false;
    };
  }

  private installUnhandledRejection(): void {
    const originalOnUnhandledRejection = window.onunhandledrejection;

    window.onunhandledrejection = (event) => {
      let context: any = {};
      let message = 'Unhandled Promise Rejection';
      let sourceInfo = {};

      if (event.reason instanceof Error) {
        message = event.reason.message;
        context = errorToContext(event.reason);
        if (event.reason.stack) {
          sourceInfo = getSourceFromStack(event.reason.stack);
        }
      } else {
        context = { reason: event.reason };
      }

      this.logger.log('error', message, {
        ...context,
        ...sourceInfo,
      });

      if (originalOnUnhandledRejection) {
        originalOnUnhandledRejection.call(window, event);
      }
    };
  }

  private installConsole(): void {
    const levels = this.config.consoleLevels || ['error', 'warn'];

    levels.forEach((level) => {
      if ((console as any)[level]) {
        this.originalConsole[level] = (console as any)[level];

        (console as any)[level] = (...args: any[]) => {
          // Avoid infinite loops: ignore logs from the logger itself
          const firstArg = args[0];
          if (typeof firstArg === 'string' && firstArg.startsWith('[Logger]')) {
             this.originalConsole[level].apply(console, args);
             return;
          }

          // Format message
          const message = args.map(arg => 
            typeof arg === 'object' ? safeStringify(arg) : String(arg)
          ).join(' ');

          // Create context from args if there are errors
          let context = {};
          let sourceInfo = {};
          
          const errorArg = args.find(arg => arg instanceof Error);
          if (errorArg) {
            context = errorToContext(errorArg);
            if (errorArg.stack) {
              sourceInfo = getSourceFromStack(errorArg.stack);
            }
          } else {
            // Try to get stack trace from a new error
            const stack = new Error().stack;
            if (stack) {
              // Skip the first few frames (Instrumentation, Console wrapper)
              // This is a bit hacky and depends on browser
              sourceInfo = getSourceFromStack(stack); 
            }
          }

          // Map console level to log level
          let logLevel = level;
          if (level === 'warn') logLevel = 'warning';
          if (level === 'log') logLevel = 'info';
          if (level === 'dir') logLevel = 'debug';

          // Safe version of args for context
          const safeArgs = args.map(arg => {
            try {
              return JSON.parse(safeStringify(arg));
            } catch (e) {
              return '[Circular/Unserializable]';
            }
          });

          this.logger.log(logLevel as any, message, {
            ...context,
            ...sourceInfo,
            original_args: safeArgs 
          });
        };
      }
    });
  }
}
