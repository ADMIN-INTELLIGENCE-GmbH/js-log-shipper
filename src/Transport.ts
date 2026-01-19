import { LogEntry, LoggerConfig } from './types';
import { safeStringify } from './utils';

export class Transport {
  private config: LoggerConfig;

  constructor(config: LoggerConfig) {
    this.config = config;
  }

  async send(logs: LogEntry[]): Promise<boolean> {
    if (logs.length === 0) return true;

    const maxRetries = this.config.retries ?? 3;
    let attempt = 0;

    while (attempt <= maxRetries) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

        const response = await fetch(this.config.endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'X-Project-Key': this.config.apiKey,
          },
          body: safeStringify({ logs }),
          keepalive: true,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          return true;
        }

        // If 4xx error, don't retry (client error)
        if (response.status >= 400 && response.status < 500) {
          console.warn(`[Logger] Failed to send logs: ${response.status} ${response.statusText}`);
          return false;
        }

        throw new Error(`Server returned ${response.status}`);
      } catch (error) {
        attempt++;
        if (attempt > maxRetries) {
          console.warn('[Logger] Failed to send logs after retries:', error);
          return false;
        }
        
        const delay = 1000 * attempt; // Exponential backoff: 1s, 2s, 3s...
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    return false;
  }
}
