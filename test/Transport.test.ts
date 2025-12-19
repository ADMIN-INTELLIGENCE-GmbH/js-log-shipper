import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Transport } from '../src/Transport';

describe('Transport', () => {
  let transport: Transport;
  const config = {
    endpoint: 'https://api.example.com',
    apiKey: 'test-key',
    retries: 1,
  };

  beforeEach(() => {
    transport = new Transport(config);
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should send logs successfully', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      status: 200,
    });

    const logs = [{ level: 'info', message: 'test' } as any];
    const result = await transport.send(logs);

    expect(result).toBe(true);
    expect(global.fetch).toHaveBeenCalledWith(
      config.endpoint,
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'X-Project-Key': config.apiKey,
        }),
        body: JSON.stringify({ logs }),
      })
    );
  });

  it('should retry on failure', async () => {
    // First attempt fails
    (global.fetch as any)
      .mockRejectedValueOnce(new Error('Network error'))
      // Second attempt succeeds
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
      });

    const logs = [{ level: 'info', message: 'test' } as any];
    const result = await transport.send(logs);

    expect(result).toBe(true);
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it('should fail after max retries', async () => {
    (global.fetch as any).mockRejectedValue(new Error('Network error'));

    const logs = [{ level: 'info', message: 'test' } as any];
    const result = await transport.send(logs);

    expect(result).toBe(false);
    // Initial + 1 retry
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it('should not retry on 4xx errors', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: false,
      status: 400,
      statusText: 'Bad Request',
    });

    const logs = [{ level: 'info', message: 'test' } as any];
    const result = await transport.send(logs);

    expect(result).toBe(false);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });
});
