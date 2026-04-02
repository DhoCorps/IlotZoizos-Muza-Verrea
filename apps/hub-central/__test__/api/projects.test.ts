import { describe, it, expect, vi } from 'vitest';
import { POST } from '../../app/api/projects/route';
import { ProjectOrchestrator } from '@ilot/shared-core';

vi.mock('@ilot/shared-core', () => ({
  ProjectOrchestrator: { fosterProject: vi.fn() }
}));

describe('API Projects - Routes', () => {
  it('POST /api/projects doit retourner 201 après fondation', async () => {
    (ProjectOrchestrator.fosterProject as any).mockResolvedValue({ success: true });

    const req = new Request('http://localhost/api/projects', {
      method: 'POST',
      body: JSON.stringify({ name: 'Projet Test', ownerUid: 'user-1' })
    });

    const response = await POST(req);
    expect(response.status).toBe(201);
  });
});