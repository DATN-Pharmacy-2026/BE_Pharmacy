import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { AxiosError, AxiosRequestConfig, AxiosResponse } from 'axios';
import { ProxyRouteTarget } from './interfaces/proxy-target.interface';
import { buildProxyRouteConfig } from './proxy-route.config';

interface ForwardRequestInput {
  method: string;
  path: string;
  query: Record<string, unknown>;
  body: unknown;
  headers: Record<string, unknown>;
  requestId: string;
}

@Injectable()
export class ProxyService {
  private readonly routeTargets: ProxyRouteTarget[];

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.routeTargets = buildProxyRouteConfig(this.configService);
  }

  resolveTarget(path: string): ProxyRouteTarget | undefined {
    return this.routeTargets.find((target) =>
      target.prefixes.some(
        (prefix) => path === prefix || path.startsWith(`${prefix}/`),
      ),
    );
  }

  async forward(input: ForwardRequestInput): Promise<AxiosResponse> {
    const target = this.resolveTarget(input.path);
    if (!target) {
      throw new HttpException(
        {
          statusCode: HttpStatus.NOT_FOUND,
          message: 'No proxy route matched',
          path: input.path,
        },
        HttpStatus.NOT_FOUND,
      );
    }

    const url = `${target.baseUrl}${input.path}`;
    const timeout = this.configService.get<number>(
      'gateway.proxyTimeoutMs',
      10000,
    );

    const axiosConfig: AxiosRequestConfig = {
      url,
      method: input.method,
      params: input.query,
      data: input.body,
      ...(input.method.toUpperCase() === 'GET' &&
      input.path.startsWith('/api/uploads/')
        ? { responseType: 'arraybuffer' as const }
        : {}),
      headers: this.buildForwardHeaders(
        input.headers,
        target.baseUrl,
        input.requestId,
      ),
      timeout,
      validateStatus: () => true,
    };

    try {
      return await this.httpService.axiosRef.request(axiosConfig);
    } catch (error) {
      if (error instanceof AxiosError) {
        throw new HttpException(
          {
            statusCode: HttpStatus.SERVICE_UNAVAILABLE,
            message: 'Service unavailable',
            service: target.service,
            path: input.path,
          },
          HttpStatus.SERVICE_UNAVAILABLE,
        );
      }

      throw error;
    }
  }

  private buildForwardHeaders(
    incomingHeaders: Record<string, unknown>,
    serviceUrl: string,
    requestId: string,
  ): Record<string, string> {
    const headers = new Map<string, string>();

    const trySet = (name: string) => {
      const value =
        incomingHeaders[name] ?? incomingHeaders[name.toLowerCase()];
      if (typeof value === 'string' && value.length > 0) {
        headers.set(name, value);
      }
    };

    trySet('authorization');
    trySet('content-type');
    trySet('user-agent');
    trySet('x-forwarded-for');
    trySet('x-real-ip');
    trySet('x-branch-id');
    trySet('x-warehouse-id');
    trySet('x-session-id');
    trySet('x-correlation-id');

    headers.set('x-request-id', requestId);
    headers.set('x-correlation-id', requestId);
    headers.set('x-forwarded-host', serviceUrl);

    return Object.fromEntries(headers.entries());
  }
}
