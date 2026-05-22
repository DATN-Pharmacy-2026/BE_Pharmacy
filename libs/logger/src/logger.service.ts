import {
  ConsoleLogger,
  Injectable,
  LoggerService as NestLoggerService,
} from '@nestjs/common';
import { LOGGER_CONTEXT } from './constants/logger.constants';
import { maskSensitiveData } from './utils/sensitive-data.util';

type LogMeta = Record<string, unknown>;

@Injectable()
export class LoggerService implements NestLoggerService {
  private readonly logger = new ConsoleLogger(LOGGER_CONTEXT);

  log(message: string, context?: string, meta?: LogMeta): void {
    this.logger.log(
      this.formatMessage(message, meta),
      context ?? LOGGER_CONTEXT,
    );
  }

  error(
    message: string,
    trace?: string,
    context?: string,
    meta?: LogMeta,
  ): void {
    this.logger.error(
      this.formatMessage(message, meta),
      trace,
      context ?? LOGGER_CONTEXT,
    );
  }

  warn(message: string, context?: string, meta?: LogMeta): void {
    this.logger.warn(
      this.formatMessage(message, meta),
      context ?? LOGGER_CONTEXT,
    );
  }

  debug(message: string, context?: string, meta?: LogMeta): void {
    this.logger.debug(
      this.formatMessage(message, meta),
      context ?? LOGGER_CONTEXT,
    );
  }

  verbose(message: string, context?: string, meta?: LogMeta): void {
    this.logger.verbose(
      this.formatMessage(message, meta),
      context ?? LOGGER_CONTEXT,
    );
  }

  private formatMessage(message: string, meta?: LogMeta): string {
    if (!meta) {
      return message;
    }

    const safeMeta = maskSensitiveData(meta);
    return JSON.stringify({ message, ...safeMeta });
  }
}
