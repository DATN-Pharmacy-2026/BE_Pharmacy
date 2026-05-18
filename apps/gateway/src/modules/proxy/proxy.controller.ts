import { All, Controller, HttpException, Req, Res } from '@nestjs/common';
import { ApiExcludeController, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { RequestWithCorrelation } from '@app/logger';
import { ProxyService } from './proxy.service';

@ApiTags(
  'gateway',
  'identity proxy',
  'commerce proxy',
  'operation proxy',
  'reporting proxy',
  'notification proxy',
)
@ApiExcludeController(false)
@Controller()
export class ProxyController {
  constructor(private readonly proxyService: ProxyService) {}

  @All('*')
  @ApiOperation({
    summary: 'Gateway proxy entrypoint',
    description:
      'Forwards /api route groups to internal services. The /api prefix is preserved for downstream services.',
  })
  async proxy(
    @Req() req: RequestWithCorrelation,
    @Res() res: Response,
  ): Promise<void> {
    const path = req.path.startsWith('/api/')
      ? req.path
      : `/api${req.path.startsWith('/') ? req.path : `/${req.path}`}`;
    try {
      const response = await this.proxyService.forward({
        method: req.method,
        path,
        query: req.query,
        body: req.body,
        headers: req.headers,
        requestId: req.requestId,
      });

      const contentType = response.headers['content-type'];
      const requestId =
        response.headers['x-request-id'] ?? req.header('x-request-id');

      if (typeof contentType === 'string') {
        res.setHeader('content-type', contentType);
      }

      if (typeof requestId === 'string') {
        res.setHeader('x-request-id', requestId);
      }

      res.status(response.status).send(response.data);
    } catch (error) {
      if (error instanceof HttpException) {
        res.status(error.getStatus()).send(error.getResponse());
        return;
      }
      throw error;
    }
  }
}
