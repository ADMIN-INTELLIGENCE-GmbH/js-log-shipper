# @adminintelligence/js-log-shipper

[![npm version](https://img.shields.io/npm/v/@adminintelligence/js-log-shipper.svg)](https://www.npmjs.com/package/@adminintelligence/js-log-shipper)
[![Build Status](https://github.com/ADMIN-INTELLIGENCE-GmbH/js-log-shipper/actions/workflows/ci.yml/badge.svg)](https://github.com/ADMIN-INTELLIGENCE-GmbH/js-log-shipper/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)


A lightweight, resilient JavaScript logger for the [Logger](https://github.com/ADMIN-INTELLIGENCE-GmbH/logger) application. Captures console logs, uncaught exceptions, and unhandled promise rejections, sending them to your Logger instance.

---

## Project Family & Companions

This package is a companion to:

- [Laravel Log Shipper](https://github.com/ADMIN-INTELLIGENCE-GmbH/laravel-log-shipper) – Laravel package for shipping logs to a central server
- [Logger](https://github.com/ADMIN-INTELLIGENCE-GmbH/logger) – Centralized log aggregation service and dashboard

For more details, configuration, and advanced usage, see the respective README files in those repositories.

---

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
npm install @adminintelligence/js-log-shipper
```

## Usage

Initialize the logger at the entry point of your application (e.g., `app.js`, `main.ts`).

```javascript
import { init } from '@adminintelligence/js-log-shipper';

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
import { Logger } from '@adminintelligence/js-log-shipper';

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


## Authors

Julian Billinger ([j-bill](https://github.com/j-bill)) | [ADMIN INTELLIGENCE GmbH](https://admin-intelligence.com/)

## License

MIT License

Copyright (c) 2023-2025 ADMIN INTELLIGENCE GmbH

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
