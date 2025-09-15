import { describe, it, expect } from '@jest/globals';
import { createApprovalsService } from '@gammon/shared-core/services';
import { installMockFetch } from '../../src/test-utils/mockFetch';

describe('approvals service contract', () => {
  it('get returns approval detail with history', async () => {
    const restore = installMockFetch([
      { match: /\/approvals\/A123$/, response: { body: { id: 'A123', status: 'OPEN', history: [], entityType: 'MOVEMENT', entityId: 'M1', createdAt: '2024-01-01', updatedAt: '2024-01-01' } } }
    ]);
    const svc = createApprovalsService({ baseUrl: 'http://localhost:3000' });
    const detail = await svc.get('A123');
    expect(detail.id).toBe('A123');
    expect(detail).toHaveProperty('status');
    restore();
  });
  it('act PATCH sends action and returns updated approval', async () => {
    const restore = installMockFetch([
      { match: /\/approvals\/A123$/, response: { body: { id: 'A123', status: 'APPROVED', history: [{ action: 'APPROVE', user: 'u', timestamp: 't' }], entityType: 'MOVEMENT', entityId: 'M1', createdAt: 't', updatedAt: 't' } } }
    ]);
    const svc = createApprovalsService({ baseUrl: 'http://localhost:3000' });
    const updated = await svc.act('A123', 'APPROVE');
    expect(updated.status).toBe('APPROVED');
    restore();
  });
});
