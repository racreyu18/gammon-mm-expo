export interface MovementClientConfig { baseUrl: string; tokenProvider?: () => Promise<string>; }

export interface MovementClient {
  listMovements(): Promise<unknown[]>;
}

export function createMovementClient(config: MovementClientConfig): MovementClient {
  async function doFetch(path: string) {
    const headers: Record<string, string> = { 'Accept': 'application/json' };
    if (config.tokenProvider) {
      try { headers['Authorization'] = `Bearer ${await config.tokenProvider()}`; } catch {/* ignore */}
    }
    const res = await fetch(`${config.baseUrl.replace(/\/$/, '')}${path}` , { headers });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`HTTP ${res.status} ${res.statusText}: ${text}`);
    }
    return res.json();
  }
  return {
    async listMovements() {
      return doFetch('/movements');
    }
  };
}
