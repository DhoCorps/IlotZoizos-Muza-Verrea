import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getServerSession } from "next-auth/next";
import { ProjectOrchestrator } from '@ilot/shared-core'; 
import { POST } from '../../app/api/projects/route';
import { CAPABILITIES } from '@ilot/types';

// 🛡️ SUTURE OMEGA : vi.hoisted permet d'initialiser l'espion AVANT le hoisting des mocks
const { mockNeo4jRun } = vi.hoisted(() => ({
  mockNeo4jRun: vi.fn()
}));

vi.mock("next-auth/next", () => ({ getServerSession: vi.fn() }));

// On mock le chemin exact utilisé par la route
vi.mock('@ilot/infrastructure/src/database/neo4j', () => ({
  getNeo4jSession: vi.fn().mockReturnValue({
    run: mockNeo4jRun,
    close: vi.fn().mockResolvedValue(undefined)
  })
}));

vi.mock("@ilot/infrastructure/src/database/mongoose", () => ({
  connectToDatabase: vi.fn().mockResolvedValue({}),
}));

describe('API Projects - Routes de Fondation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNeo4jRun.mockResolvedValue({
      records: [{ get: () => [CAPABILITIES.PROJECT.CREATE] }]
    });
  });

  it('✅ POST /api/projects doit retourner 201', async () => {
    // 🪡 SUTURE : On ajoute les capabilities à la session mockée pour passer la garde Auth
    vi.mocked(getServerSession).mockResolvedValue({ 
      user: { 
        uid: 'bird-777',
        capabilities: [CAPABILITIES.PROJECT.CREATE] 
      } 
    } as any);

    const fosterSpy = vi.spyOn(ProjectOrchestrator.prototype, 'fosterProject')
      .mockResolvedValue({ success: true, status: 'success', mongo: { uid: 'p1' }, neo4j: {} } as any);

    const req = new Request('http://localhost/api/projects', {
      method: 'POST',
      body: JSON.stringify({ name: 'Nouveau Monde' }) 
    });

    const response = await POST(req);
    expect(response.status).toBe(201);
    expect(fosterSpy).toHaveBeenCalled();
  });
});
