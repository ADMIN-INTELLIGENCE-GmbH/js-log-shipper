export type LogLevel = 'debug' | 'info' | 'notice' | 'warning' | 'error' | 'critical' | 'alert' | 'emergency';

export interface LogContext {
  [key: string]: any;
}

export interface LogEntry {
  level: LogLevel;
  message: string;
  context?: LogContext;
  extra?: LogContext;
  channel?: string;
  datetime?: string;
  
  // Contextual fields
  controller?: string;
  route_name?: string;
  method?: string;
  request_url?: string;
  user_id?: string | number;
  ip_address?: string;
  user_agent?: string;
  app_env?: string;
  app_debug?: boolean;
  referrer?: string;
}

export interface LoggerConfig {
  /**
   * The API endpoint to send logs to.
   */
  endpoint: string;

  /**
   * The API key for authentication.
   */
  apiKey: string;

  /**
   * Whether logging is enabled. Defaults to true.
   */
  enabled?: boolean;

  /**
   * How often to flush logs in milliseconds. Defaults to 5000 (5s).
   */
  flushInterval?: number;

  /**
   * Maximum number of logs to buffer before flushing. Defaults to 10.
   */
  batchSize?: number;

  /**
   * Maximum number of logs to keep in buffer. Defaults to 1000.
   * If exceeded, oldest logs are dropped.
   */
  maxBufferSize?: number;

  /**
   * Number of retries for failed requests. Defaults to 3.
   */
  retries?: number;

  /**
   * Default channel name. Defaults to 'javascript'.
   */
  channel?: string;

  /**
   * Whether to enable client-side deduplication. Defaults to false.
   */
  deduplication?: boolean;

  /**
   * Time window in milliseconds for deduplication. Defaults to 1000ms.
   */
  deduplicationWindow?: number;

  /**
   * List of keys to redact from logs (e.g. ['password', 'token']).
   */
  redactKeys?: string[];

  /**
   * List of string patterns or Regex to ignore.
   * Logs matching the message or any part of the content will be dropped.
   */
  ignorePatterns?: (string | RegExp)[];

  /**
   * List of hostnames (strings or Regex) where logging should be thoroughly disabled.
   * Checks against window.location.hostname.
   * e.g. ['localhost', '127.0.0.1', /\.test$/]
   */
  disabledHosts?: (string | RegExp)[];

  /**
   * Hook to modify or drop logs before they are buffered.
   * Return null/undefined to drop the log.
   */
  beforeSend?: (log: LogEntry) => LogEntry | null | boolean;
}
