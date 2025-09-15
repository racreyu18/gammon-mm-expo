/* Simple fetch mock utility for contract tests */
export interface MockCall { url: string; init?: RequestInit; }
export interface MockResponse { status?: number; body?: any; headers?: Record<string,string>; }

export function installMockFetch(sequence: Array<{ match: RegExp; response: MockResponse | ((url: string, init?: RequestInit) => MockResponse | Promise<MockResponse>) }>) {
  const calls: MockCall[] = [];
  const original = global.fetch as any;
  global.fetch = (async (url: string, init?: RequestInit) => {
    calls.push({ url, init });
    for (const entry of sequence) {
      if (entry.match.test(url)) {
        const r = typeof entry.response === 'function' ? await entry.response(url, init) : entry.response;
        const status = r.status ?? 200;
        const body = r.body ?? {};
        return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...(r.headers||{}) } });
      }
    }
    return new Response(JSON.stringify({ message: 'Not Mocked' }), { status: 501 });
  }) as any;
  return () => { global.fetch = original; return { calls }; };
}

export function lastCallUrl(calls: MockCall[]): string | undefined { return calls.at(-1)?.url; }
