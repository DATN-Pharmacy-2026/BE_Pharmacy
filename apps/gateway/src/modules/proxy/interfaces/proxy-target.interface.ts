export type ProxyServiceName =
  | 'identity-service'
  | 'commerce-service'
  | 'operation-service'
  | 'reporting-setting-service'
  | 'notification-service';

export interface ProxyRouteTarget {
  service: ProxyServiceName;
  baseUrl: string;
  prefixes: string[];
}
