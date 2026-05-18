import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ResponseStatus } from '../enums/common.enums';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    let message = 'Internal server error';
    let error = 'Internal Server Error';
    if (exception instanceof HttpException) {
      const responsePayload = exception.getResponse();
      const fallback = exception.message || 'Request failed';
      if (typeof responsePayload === 'string') {
        message = responsePayload;
      } else if (
        typeof responsePayload === 'object' &&
        responsePayload !== null
      ) {
        const payload = responsePayload as {
          message?: string | string[];
          error?: string;
        };
        message = Array.isArray(payload.message)
          ? payload.message.join(', ')
          : payload.message || fallback;
        error = payload.error || error;
      } else {
        message = fallback;
      }
    }

    if (status >= 500) {
      message = 'Internal server error';
      error = 'Internal Server Error';
    }

    response.status(status).json({
      status: ResponseStatus.Error,
      statusCode: status,
      message,
      error,
      correlationId:
        (request.headers['x-correlation-id'] as string | undefined) ??
        (request.headers['x-request-id'] as string | undefined) ??
        null,
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }
}
