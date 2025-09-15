import { describe, it, expect } from '@jest/globals';
import { createAttachmentsService } from '@gammon/shared-core/services';
import { installMockFetch } from '../../src/test-utils/mockFetch';

describe('attachments service contract', () => {
  it('get returns attachment metadata', async () => {
    const restore = installMockFetch([
      { match: /\/attachments\/AT1$/, response: { body: { id: 'AT1', filename: 'f.txt', mimeType: 'text/plain', size: 10 } } }
    ]);
    const svc = createAttachmentsService({ baseUrl: 'http://localhost:3000' });
    const meta = await svc.get('AT1');
    expect(meta.id).toBe('AT1');
    restore();
  });
  it('listFor returns array of attachments', async () => {
    const restore = installMockFetch([
      { match: /\/entities\/MOVEMENT\/M1\/attachments$/, response: { body: [{ id: 'AT1' }] } }
    ]);
    const svc = createAttachmentsService({ baseUrl: 'http://localhost:3000' });
    const list = await svc.listFor('MOVEMENT', 'M1');
    expect(list.length).toBe(1);
    restore();
  });
});
