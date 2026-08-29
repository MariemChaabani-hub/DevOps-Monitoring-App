/**
 * Type declarations for apiService.js. Every method's runtime return value
 * is already unwrapped to the response body by the axios response
 * interceptor in apiService.js — these signatures reflect that, since
 * axios's own types would otherwise infer AxiosResponse<any>.
 */

export declare function setSession(
  session: { token: string | null; email: string | null } | null
): void;

export declare const apiService: {
  login: (email: string, password: string) => Promise<any>;
  getMe: () => Promise<any>;

  getServers: () => Promise<any>;
  getServer: (serverId: string) => Promise<any>;
  getServerMetrics: (
    serverId: string,
    opts?: { limit?: number; minutes?: number }
  ) => Promise<any>;

  getDashboardSummary: () => Promise<any>;

  getAlerts: (opts?: {
    status?: string;
    severity?: string;
    server_id?: string;
    limit?: number;
  }) => Promise<any>;
  acknowledgeAlert: (alertId: string, acknowledgedBy: string) => Promise<any>;

  getServicesStatus: (serverId: string) => Promise<any>;
  restartService: (serverId: string, serviceName: string) => Promise<any>;
  stopService: (serverId: string, serviceName: string) => Promise<any>;
  restartServer: (serverId: string, delay?: number) => Promise<any>;
};

export default apiService;
