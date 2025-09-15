import { describe, it, expect } from '@jest/globals';
import { createNotificationsService } from '@gammon/shared-core/services';
import { installMockFetch } from '../../src/test-utils/mockFetch';

describe('notifications service contract', () => {
  it('list returns notifications array', async () => {
    const restore = installMockFetch([
      { match: /\/notifications$/, response: { body: [{ id: 'N1', type: 'INFO', referenceType: 'MOVEMENT', referenceId: 'M1', message: 'hi', receivedAt: 't' }] } }
    ]);
    const svc = createNotificationsService({ baseUrl: 'http://localhost:3000' });
    const items = await svc.list();
    expect(items[0].id).toBe('N1');
    restore();
  });
  it('markRead posts to read endpoint', async () => {
    const restore = installMockFetch([
      { match: /\/notifications\/N1\/read$/, response: { body: {} } }
    ]);
    const svc = createNotificationsService({ baseUrl: 'http://localhost:3000' });
    await expect(svc.markRead('N1')).resolves.toBeUndefined();
    restore();
  });
});
