import { Logger } from './Logger';
import { Instrumentation, InstrumentationConfig } from './Instrumentation';
import { LoggerConfig } from './types';

export * from './types';
export * from './Logger';
export * from './Instrumentation';

export interface InitOptions extends LoggerConfig {
  instrumentation?: InstrumentationConfig;
}

export function init(options: InitOptions): Logger {
  const logger = Logger.init(options);
  
  const instrumentation = new Instrumentation(logger, options.instrumentation);
  instrumentation.install();

  return logger;
}

export default {
  init,
  Logger,
};
