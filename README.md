# @adminintelligence/js-logger

[![npm version](https://img.shields.io/npm/v/@adminintelligence/js-logger.svg)](https://www.npmjs.com/package/@adminintelligence/js-logger)
[![Build Status](https://github.com/ADMIN-INTELLIGENCE-GmbH/js-logger/actions/workflows/js-logger.yml/badge.svg)](https://github.com/ADMIN-INTELLIGENCE-GmbH/js-logger/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A lightweight, resilient JavaScript logger for the Logger application. Captures console logs, uncaught exceptions, and unhandled promise rejections, sending them to your Logger instance.

## Features

- **Automatic Instrumentation**: Captures `console.*`, `window.onerror`, and `window.onunhandledrejection`.
- **Resilient**: Buffers logs and retries failed requests with exponential backoff.
- **Batching**: Sends logs in batches to reduce network overhead.
- **Context Aware**: Automatically captures URL, User Agent, and Stack Traces.
-Automatic Instrumentation**: Captures `console.*`, `window.onerror`, and `window.onunhandledrejection`.
- **Resilient**: Buffers logs and retries failed requests with exponential backoff.
- **Batching**: Sends logs in batches to reduce network overhead.
- **Context Aware**: Automatically captures URL, User Agent, and Stack Traces.
- **TypeScript Support**: Written in TypeScript with full type definitions.

## Installation

```bash
npm install @adminintelligence/js-logger
```

## Usage

Initialize the logger at the entry point of your application (e.g., `app.js`, `main.ts`).

```javascript
import { init } from '@adminintelligence/js-logger';

init({
  // Your Logger Project API Endpoint
  endpoint: 'https://your-logger-instance.com/api/ingest',
  
  // Your Project API Key
  apiKey: 'your-project-api-key',
  
  // Optional Configuration
  channel: 'javascript', // Default: 'javascript'
  enabled: process.env.NODE_ENV === 'production', // Default: true
  
  // Instrumentation Settings
  instrumentation: {
    console: true, // Capture console.log/warn/error
    windowError: true, // Capture window.onerror
    unhandledRejection: true, // Capture unhandled promise rejections
  }
});
```

### Manual Logging

You can also manually log messages using the exported `Logger` instance.

```javascript
import { Logger } from '@adminintelligence/js-logger';

const logger = Logger.getInstance();

logger.info('User clicked button', { buttonId: 'submit-btn' });
logger.error('Payment failed', { error: err, amount: 99.99 });
```

### Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `endpoint` | `string` | **Required** | The API URL to send logs to. |
| `apiKey` | `string` | **Required** | Your project's API key. |
| `enabled` | `boolean` | `true` | Master switch to enable/disable logging. |
| `channel` | `string` | `'javascript'` | The log channel name. |
| `batchSize` | `number` | `10` | Max logs to buffer before sending. |
| `flushInterval` | `number` | `5000` | Time in ms to wait before flushing buffer. |
| `retries` | `number` | `3` | Number of retries for failed requests. |

## Development

1.  Clone the repository.
2.  Install dependencies: `npm install`
3.  Build the package: `npm run build`
4.  Run tests: `npm test`

## License

MIT
