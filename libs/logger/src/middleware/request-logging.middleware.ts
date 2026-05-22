import { NextFunction, Response } from 'express';
import { LoggerService } from '../logger.service';
import { RequestWithCorrelation } from '../interfaces/request-with-correlation.interface';

export const createRequestLoggingMiddleware = (serviceName: string) => {
  const logger = new LoggerService();

  return (
    req: RequestWithCorrelation,
    res: Response,
    next: NextFunction,
  ): void => {
    const start = Date.now();

    res.on('finish', () => {
      const durationMs = Date.now() - start;
      const meta = {
        requestId: req.requestId,
        serviceName,
        method: req.method,
        path: req.originalUrl || req.url,
        statusCode: res.statusCode,
        durationMs,
        ip: req.ip,
        userAgent: req.header('user-agent') ?? '',
      };

      if (res.statusCode >= 500) {
        logger.error('HTTP Request', undefined, serviceName, meta);
        return;
      }

      if (res.statusCode >= 400) {
        logger.warn('HTTP Request', serviceName, meta);
        return;
      }

      logger.log('HTTP Request', serviceName, meta);
    });

    next();
  };
};
