import { LogEntry, LoggerConfig } from './types';

export class Transport {
  private config: LoggerConfig;
  private isFlushing = false;

  constructor(config: LoggerConfig) {
    this.config = config;
  }

  async send(logs: LogEntry[]): Promise<boolean> {
    if (logs.length === 0) return true;
    if (this.isFlushing) return false; // Simple lock, though we might want to queue if busy

    this.isFlushing = true;

    try {
      const success = await this.attemptSend(logs, this.config.retries ?? 3);
      return success;
    } finally {
      this.isFlushing = false;
    }
  }

  private async attemptSend(logs: LogEntry[], retriesLeft: number): Promise<boolean> {
    try {
      const payload = {
        logs: logs
      };

      const response = await fetch(this.config.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-Project-Key': this.config.apiKey,
        },
        body: JSON.stringify(payload),
      });

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
      if (retriesLeft > 0) {
        const delay = 1000 * (4 - retriesLeft); // 1s, 2s, 3s
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.attemptSend(logs, retriesLeft - 1);
      }
      
      console.warn('[Logger] Failed to send logs after retries:', error);
      return false;
    }
  }
}
