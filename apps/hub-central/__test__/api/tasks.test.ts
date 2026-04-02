import { describe, it, expect, vi } from 'vitest';
import { GET, POST } from '../../app/api/tasks/route';

describe('API Tasks - Flux de Travail', () => {
  it('doit rejeter la création si le projet parent est introuvable', async () => {
    const req = new Request('http://localhost/api/tasks', {
      method: 'POST',
      body: JSON.stringify({ projectUid: 'inconnu', content: { title: 'Bug' } })
    });

    const response = await POST(req);
    expect(response.status).toBe(500); // L'orchestrateur jette une erreur [cite: 2026-04-02]
  });
});