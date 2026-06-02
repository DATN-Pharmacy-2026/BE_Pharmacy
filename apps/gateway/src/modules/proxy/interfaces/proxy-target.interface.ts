export type ProxyServiceName =
  | 'identity-service'
  | 'commerce-service'
  | 'operation-service'
  | 'reporting-setting-service'
  | 'notification-service'
  | 'chatbot-service';

export interface ProxyRouteTarget {
  service: ProxyServiceName;
  baseUrl: string;
  prefixes: string[];
}
