# JS Log Shipper

> **⚠️ Development Notice**: This package is currently in **active initial development** and is pending in-depth testing on live environments.

[![npm version](https://img.shields.io/npm/v/@adminintelligence/js-log-shipper.svg)](https://www.npmjs.com/package/@adminintelligence/js-log-shipper)
[![Build Status](https://github.com/ADMIN-INTELLIGENCE-GmbH/js-log-shipper/actions/workflows/ci.yml/badge.svg)](https://github.com/ADMIN-INTELLIGENCE-GmbH/js-log-shipper/actions)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A resilient JavaScript logger that ships your application logs to a central server.

## Companion Service: Logger

This package is designed to work with [**Logger**](https://github.com/ADMIN-INTELLIGENCE-GmbH/logger) — a centralized log aggregation service.

**Logger provides:**
- **Web Dashboard** — Search, filter, and browse logs with pagination
- **Multi-Project Support** — Manage logs from multiple applications with isolated project keys
- **Failing Controllers Report** — Identify error hotspots by controller or file
- **Retention Policies** — Configurable per-project log retention
- **Webhook Notifications** — receive alerts for errors and critical events
- **Dark Mode** — Full dark theme support

> **Note:** You can also use this package with any HTTP endpoint that accepts JSON log payloads.

## Features

- **Automatic Instrumentation**: Automatically captures `console.error`, `console.warn`, `window.onerror`, and `window.onunhandledrejection`. (Configurable to include `console.log`, `console.debug`, etc.)
- **Benign Warning Filtering**: Automatically filters out common non-actionable browser warnings like ResizeObserver notifications and generic script errors.
- **Resilient**: Buffers logs when offline or failing, and retries with exponential backoff.
- **Batched Shipping**: Sends logs in chunks to reduce network overhead.
- **Smart Context**: Automatically captures current URL, User Agent, and Stack Traces.
- **Deduplication**: Prevents flooding your logs with duplicate errors (e.g. inside loops).
- **TypeScript**: Written in TypeScript with full type definitions included.

## Installation

```bash
npm install @adminintelligence/js-log-shipper
```

## Usage

Initialize the logger at the entry point of your application (e.g., `main.ts`, `app.js`, or `index.html`).

```typescript
import { init, Logger } from '@adminintelligence/js-log-shipper';

init({
  endpoint: 'https://your-log-server.com/api/ingest',
  apiKey: 'your-project-api-key',
  
  // Optional configuration
  channel: 'frontend',
  enabled: process.env.NODE_ENV === 'production',
});
```

### Manual Logging

You can use the exported `Logger` instance to manually log events with context.

```typescript
const logger = Logger.getInstance();

logger.info('User clicked subscribe', { plan: 'pro' });

try {
  await processPayment();
} catch (err) {
  logger.error('Payment failed', { error: err, amount: 99.00 });
}
```

### User Identification

You can associate logs with a specific user ID. This is helpful for tracking issues reported by specific users.

```typescript
// Call this after your user authenticates
Logger.getInstance().setUser('user_12345');

// or with a numeric ID
Logger.getInstance().setUser(12345);

// To clear (e.g., on logout)
Logger.getInstance().clearGlobalContext();
| `maxBufferSize` | `number` | `1000` | Max number of logs to keep in memory (drops oldest) |
| `redactKeys` | `string[]` | `[]` | Keys to redact from context (e.g. `['password']`) |
```

### Global Context

You can also set other global context variables that will be attached to every log entry (e.g., application version, active subscription plan, etc.).

```typescript
Logger.getInstance().setGlobalContext({
  app_version: '1.2.0',
  environment: 'staging',
  plan: 'enterprise'
});
```

### Advanced hooks

#### `beforeSend`

You can intercept, modify, or drop logs before they are buffered using the `beforeSend` hook.

```typescript
init({
  // ...
  beforeSend: (log) => {
    // Drop logs containing specific text
    if (log.message.includes('test-ignore')) {
      return null;
    }

    // Modify sensitive data manually (or use redactKeys)
    if (log.context && log.context.email) {
      log.context.email = '[REDACTED]';
    }

    return log;
  }
});
```

## Configuration

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `endpoint` | `string` | **Required** | The URL of your log server's ingest API |
| `apiKey` | `string` | **Required** | Your project's API Key |
| `enabled` | `boolean` | `true` | Enable or disable log shipping |
| `channel` | `string` | `'javascript'` | The logging channel name |
| `batchSize` | `number` | `10` | Number of logs to buffer before sending |
| `flushInterval` | `number` | `5000` | Max wait time (ms) before sending buffer |
| `retries` | `number` | `3` | Attempts to retry failed requests |
| `deduplication` | `boolean` | `false` | Enable client-side deduplication |
| `deduplicationWindow` | `number` | `1000` | Time window (ms) for deduplication |

### Instrumentation Options

You can fine-tune what the logger automatically captures via the `instrumentation` config object:

```typescript
init({
  // ...
  instrumentation: {
    console: true,           // Capture console logs
    consoleLevels: ['error', 'warn', 'info', 'debug'], // Select methods to capture (supports log, dir, debug, info, warn, error)
    windowError: true,       // Capture global exceptions
    unhandledRejection: true // Capture unhandled promises
  }
});
```

### Benign Warning Suppression

By default, the logger automatically filters out common benign browser warnings that clutter logs without providing actionable information. This feature is enabled by default but can be disabled if needed.

**Filtered Warnings:**
- **ResizeObserver loop completed with undelivered notifications** — A benign browser behavior that occurs when ResizeObserver callbacks trigger layout changes. Has no functional impact.
- **Script error.** — Generic cross-origin script errors that provide no useful debugging information.
- **Non-Error promise rejection captured with value: undefined** — Promise rejections with no error object or useful context.

To disable this feature (and log all warnings):

```typescript
init({
  // ...
  suppressBenignWarnings: false
});
```

> **Note:** The internal benign warning filter runs *before* the `beforeSend` hook, so `beforeSend` will only receive logs that pass this filter (when enabled). This allows you to add your own custom filtering logic on top of the built-in filtering.

## Log Payload

When logs are shipped, the following data structure is sent to your server:

```json
{
  "logs": [
    {
      "level": "error",
      "message": "ReferenceError: x is not defined",
      "context": {
        "file": "app.js",
        "line": 42,
        "stack": "..."
      },
      "datetime": "2025-01-19T10:00:00.000Z",
      "channel": "frontend",
      "request_url": "https://myapp.com/dashboard",
      "user_agent": "Mozilla/5.0...",
      "referrer": "https://google.com"
    }
  ]
}
```

## Reliability

### Retries & Backoff
If the log server is unreachable (e.g. 500 error or network offline), the client will retry sending the batch up to `retries` times (default 3) with exponential backoff (1s, 2s, 3s...).

### Page Unload
The logger attempts to flush any remaining logs in the buffer when the user leaves the page (`beforeunload`).

## Authors

Julian Billinger ([j-bill](https://github.com/j-bill)) | [ADMIN INTELLIGENCE GmbH](https://admin-intelligence.com/)

## Contributing

Please see [CONTRIBUTING.md](CONTRIBUTING.md) for details.

## License

The MIT License (MIT). Please see [LICENSE](LICENSE) for more information.
