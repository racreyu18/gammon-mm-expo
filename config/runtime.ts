// Runtime configuration mapping environment variables to a typed object.
// Values should originate from .env (not committed) or Expo config extras.

export interface AppRuntimeConfig {
  apiBaseUrl: string;
  env: string;
  feature: {
    approvals: boolean;
    attachments: boolean;
    offlineStaging: boolean;
  };
  updatesChannel: string;
  analyticsPublicKey?: string;
  logEndpoint: string;
  permissionsTtlMinutes: number;
  perf: {
    p90ColdStart: number;
    p90Search: number;
    p90ScanSubmit: number;
  };
}

function bool(val: string | undefined, fallback = false): boolean {
  if (!val) return fallback;
  return ['1', 'true', 'yes', 'on'].includes(val.toLowerCase());
}

function num(val: string | undefined, fallback: number): number {
  const n = Number(val);
  return isNaN(n) ? fallback : n;
}

export const runtimeConfig: AppRuntimeConfig = Object.freeze({
  apiBaseUrl: process.env.API_BASE_URL || 'http://localhost:7060/api',
  env: process.env.APP_ENV || 'DEV',
  feature: {
    approvals: bool(process.env.FEATURE_APPROVALS, true),
    attachments: bool(process.env.FEATURE_ATTACHMENTS, true),
    offlineStaging: bool(process.env.FEATURE_OFFLINE_STAGING, true)
  },
  updatesChannel: process.env.EXPO_UPDATE_CHANNEL || 'development',
  analyticsPublicKey: process.env.ANALYTICS_PUBLIC_KEY || undefined,
  logEndpoint: process.env.LOG_ENDPOINT || '/log/events',
  permissionsTtlMinutes: num(process.env.PERMISSIONS_TTL_MINUTES, 10),
  perf: {
    p90ColdStart: num(process.env.PERF_P90_COLD_START, 3200),
    p90Search: num(process.env.PERF_P90_SEARCH, 1500),
    p90ScanSubmit: num(process.env.PERF_P90_SCAN_SUBMIT, 1100)
  }
});

export default runtimeConfig;
