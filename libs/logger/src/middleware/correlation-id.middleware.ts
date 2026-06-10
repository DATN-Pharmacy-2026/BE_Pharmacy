import { randomUUID } from 'crypto';
import { NextFunction, Response } from 'express';
import { RequestWithCorrelation } from '../interfaces/request-with-correlation.interface';

export const createCorrelationIdMiddleware =
  () =>
  (req: RequestWithCorrelation, res: Response, next: NextFunction): void => {
    const headerValue =
      req.header('x-correlation-id') ?? req.header('x-request-id');
    const requestId =
      headerValue && headerValue.trim().length > 0 ? headerValue : randomUUID();

    req.requestId = requestId;
    req.headers['x-correlation-id'] = requestId;
    req.headers['x-request-id'] = requestId;
    res.setHeader('x-correlation-id', requestId);
    res.setHeader('x-request-id', requestId);

    next();
  };
