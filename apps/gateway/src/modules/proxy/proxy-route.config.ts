import { ConfigService } from '@nestjs/config';
import { ProxyRouteTarget } from './interfaces/proxy-target.interface';
import {
  AUTH_ROUTES,
  CHATBOT_ROUTES,
  COMMERCE_ROUTES,
  IDENTITY_ROUTES,
  IDENTITY_EVENT_ROUTES,
  NOTIFICATION_ROUTES,
  OPERATION_ROUTES,
  REPORTING_ROUTES,
} from '../../contracts';

export const buildProxyRouteConfig = (
  configService: ConfigService,
): ProxyRouteTarget[] => [
  {
    service: 'identity-service',
    baseUrl: configService.getOrThrow<string>('gateway.services.identity'),
    prefixes: [
      ...AUTH_ROUTES,
      ...IDENTITY_ROUTES,
      ...IDENTITY_EVENT_ROUTES,
    ].map((route) => route.replace('/*', '')),
  },
  {
    service: 'commerce-service',
    baseUrl: configService.getOrThrow<string>('gateway.services.commerce'),
    prefixes: COMMERCE_ROUTES.map((route) => route.replace('/*', '')),
  },
  {
    service: 'operation-service',
    baseUrl: configService.getOrThrow<string>('gateway.services.operation'),
    prefixes: OPERATION_ROUTES.map((route) => route.replace('/*', '')),
  },
  {
    service: 'reporting-setting-service',
    baseUrl: configService.getOrThrow<string>(
      'gateway.services.reportingSetting',
    ),
    prefixes: REPORTING_ROUTES.map((route) => route.replace('/*', '')),
  },
  {
    service: 'notification-service',
    baseUrl: configService.getOrThrow<string>('gateway.services.notification'),
    prefixes: NOTIFICATION_ROUTES.map((route) => route.replace('/*', '')),
  },
  {
    service: 'chatbot-service',
    baseUrl: configService.getOrThrow<string>('gateway.services.chatbot'),
    prefixes: CHATBOT_ROUTES.map((route) => route.replace('/*', '')),
  },
];
