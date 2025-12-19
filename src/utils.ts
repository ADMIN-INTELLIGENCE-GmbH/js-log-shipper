import { LogContext } from './types';

export interface StackFrame {
  functionName: string;
  fileName: string;
  lineNumber: number;
  columnNumber: number;
}

export function parseStackTrace(stack: string): StackFrame[] {
  const lines = stack.split('\n');
  const frames: StackFrame[] = [];

  for (const line of lines) {
    // Chrome: at FunctionName (File:Line:Col) or at File:Line:Col
    const chromeMatch = line.match(/^\s*at\s+(?:(.+?)\s+\()?(.*?):(\d+):(\d+)\)?$/);
    if (chromeMatch) {
      frames.push({
        functionName: chromeMatch[1] || 'unknown',
        fileName: chromeMatch[2],
        lineNumber: parseInt(chromeMatch[3], 10),
        columnNumber: parseInt(chromeMatch[4], 10),
      });
      continue;
    }

    // Firefox: FunctionName@File:Line:Col
    const firefoxMatch = line.match(/^\s*(.*?)@(.*?):(\d+):(\d+)$/);
    if (firefoxMatch) {
      frames.push({
        functionName: firefoxMatch[1] || 'unknown',
        fileName: firefoxMatch[2],
        lineNumber: parseInt(firefoxMatch[3], 10),
        columnNumber: parseInt(firefoxMatch[4], 10),
      });
      continue;
    }
  }

  return frames;
}

export function errorToContext(error: Error): LogContext {
  const stack = error.stack || '';
  const frames = parseStackTrace(stack);
  
  // Use the first frame as the source
  const topFrame = frames[0];

  return {
    message: error.message,
    name: error.name,
    stack: stack,
    file: topFrame?.fileName,
    line: topFrame?.lineNumber,
    function: topFrame?.functionName,
    frames: frames, // Full trace for detailed view
  };
}

export function getSourceFromStack(stack: string): { controller?: string; method?: string } {
  const frames = parseStackTrace(stack);
  if (frames.length === 0) return {};

  // Skip internal frames if possible (e.g. Logger code)
  // For now, just take the first one that isn't obviously internal
  // In a real app, we might want to filter out node_modules or the logger script itself
  
  const frame = frames[0];
  
  // Clean up file path to look more like a "Controller"
  // e.g. http://localhost/js/app.js -> js/app.js
  let controller = frame.fileName;
  try {
    const url = new URL(controller);
    controller = url.pathname.substring(1); // Remove leading /
  } catch (e) {
    // Not a URL, keep as is
  }

  return {
    controller: controller,
    method: frame.functionName,
  };
}
