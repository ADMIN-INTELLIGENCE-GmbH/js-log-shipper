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
}
