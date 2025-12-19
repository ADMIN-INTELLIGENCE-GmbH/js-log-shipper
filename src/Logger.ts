import { LoggerConfig, LogEntry, LogLevel, LogContext } from './types';
import { Transport } from './Transport';

export class Logger {
  private config: LoggerConfig;
  private transport: Transport;
  private buffer: LogEntry[] = [];
  private flushTimer: ReturnType<typeof setInterval> | null = null;
  private static instance: Logger;
  private recentLogs: Map<string, number> = new Map();
  private isFlushing = false;

  constructor(config: LoggerConfig) {
    this.config = {
      enabled: true,
      flushInterval: 5000,
      batchSize: 10,
      retries: 3,
      channel: 'javascript',
      deduplication: false,
      deduplicationWindow: 1000,
      ...config,
    };
    this.transport = new Transport(this.config);

    if (this.config.enabled) {
      this.startFlushTimer();
      this.setupPageUnload();
    }
  }

  public static init(config: LoggerConfig): Logger {
    Logger.instance = new Logger(config);
    return Logger.instance;
  }

  public static getInstance(): Logger {
    if (!Logger.instance) {
      throw new Error('Logger not initialized. Call Logger.init() first.');
    }
    return Logger.instance;
  }

  public log(level: LogLevel, message: string, context: LogContext = {}): void {
    if (!this.config.enabled) return;

    if (this.config.deduplication) {
      const fingerprint = this.generateFingerprint(level, message, context);
      const now = Date.now();
      const lastSeen = this.recentLogs.get(fingerprint);
      const window = this.config.deduplicationWindow ?? 1000;

      if (lastSeen && (now - lastSeen) < window) {
        return;
      }

      this.recentLogs.set(fingerprint, now);

      // Cleanup if map gets too large
      if (this.recentLogs.size > 1000) {
        this.cleanupRecentLogs(now, window);
      }
    }

    const entry: LogEntry = {
      level,
      message,
      context,
      channel: this.config.channel,
      datetime: new Date().toISOString(),
      request_url: typeof window !== 'undefined' ? window.location.href : undefined,
      user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
      referrer: typeof document !== 'undefined' ? document.referrer : undefined,
    };

    this.buffer.push(entry);

    if (this.buffer.length >= (this.config.batchSize ?? 10)) {
      this.flush();
    }
  }

  public debug(message: string, context?: LogContext): void {
    this.log('debug', message, context);
  }

  public info(message: string, context?: LogContext): void {
    this.log('info', message, context);
  }

  public notice(message: string, context?: LogContext): void {
    this.log('notice', message, context);
  }

  public warning(message: string, context?: LogContext): void {
    this.log('warning', message, context);
  }

  public error(message: string, context?: LogContext): void {
    this.log('error', message, context);
  }

  public critical(message: string, context?: LogContext): void {
    this.log('critical', message, context);
  }

  public alert(message: string, context?: LogContext): void {
    this.log('alert', message, context);
  }

  public emergency(message: string, context?: LogContext): void {
    this.log('emergency', message, context);
  }

  public async flush(): Promise<void> {
    if (this.buffer.length === 0 || this.isFlushing) return;

    this.isFlushing = true;
    const batchSize = this.config.batchSize ?? 10;
    // Take a batch, not everything, to avoid huge payloads
    const logsToSend = this.buffer.slice(0, batchSize);

    try {
      const success = await this.transport.send(logsToSend);
      
      if (success) {
        // Remove sent logs
        this.buffer.splice(0, logsToSend.length);
      } else {
        console.warn('[Logger] Failed to flush logs, keeping in buffer');
      }
    } catch (e) {
      console.error('[Logger] Error during flush', e);
    } finally {
      this.isFlushing = false;
      
      // If we have more logs, try to flush again immediately
      if (this.buffer.length >= batchSize) {
        setTimeout(() => this.flush(), 0);
      }
    }
  }

  private startFlushTimer(): void {
    if (this.flushTimer) clearInterval(this.flushTimer);
    
    this.flushTimer = setInterval(() => {
      this.flush();
    }, this.config.flushInterval);
  }

  private setupPageUnload(): void {
    if (typeof window === 'undefined') return;

    // Try to flush when the user leaves the page
    window.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        this.flush();
      }
    });
  }

  private generateFingerprint(level: LogLevel, message: string, context: LogContext): string {
    let fingerprint = `${level}:${message}`;
    
    if (context && typeof context === 'object') {
      if (context.stack) {
        fingerprint += `:${context.stack}`;
      } else if (context.exception && (context.exception as any).stack) {
        fingerprint += `:${(context.exception as any).stack}`;
      }
    }
    
    return fingerprint;
  }

  private cleanupRecentLogs(now: number, window: number): void {
    for (const [key, timestamp] of this.recentLogs.entries()) {
      if (now - timestamp >= window) {
        this.recentLogs.delete(key);
      }
    }
  }
}
