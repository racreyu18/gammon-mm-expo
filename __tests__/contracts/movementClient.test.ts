import { describe, it, expect } from '@jest/globals';
import { createMovementClient } from '@gammon/shared-core/services/movementClient';
import { installMockFetch } from '../../src/test-utils/mockFetch';

describe('movement client contract', () => {
  it('lists movements returning array of movement-like objects', async () => {
    const restore = installMockFetch([
      { match: /\/movements$/, response: { body: [{ id: 'M1', status: 'DRAFT', createdAt: '2024-01-01T00:00:00Z' }] } }
    ]);
    const client = createMovementClient({ baseUrl: 'http://localhost:3000' });
    const result = await client.listMovements();
    expect(Array.isArray(result)).toBe(true);
    expect(result[0]).toHaveProperty('id', 'M1');
    restore();
  });
});

