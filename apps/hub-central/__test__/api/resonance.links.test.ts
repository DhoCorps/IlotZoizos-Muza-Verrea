// apps/hub-central/__test__/api/resonance.links.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '../../app/api/resonance/links/route';
import { getServerSession } from 'next-auth/next';
import { NextRequest } from 'next/server';

vi.mock('next-auth/next', () => ({ getServerSession: vi.fn() }));
vi.mock('@ilot/infrastructure', () => ({ connectToDatabase: vi.fn().mockResolvedValue(true) }));

const mockWeaveCrossDomainLink = vi.fn();

// 🪡 SUTURE : Mock direct de l'objet statique
vi.mock('@ilot/shared-core', () => ({
  ResonanceOrchestrator: {
    weaveCrossDomainLink: (...args: any[]) => mockWeaveCrossDomainLink(...args)
  }
}));

// Mock de Zod
vi.mock('@ilot/types', async (importOriginal) => {
  const actual = await importOriginal<any>();
  return {
    ...actual,
    WeaveLinkSchema: {
      safeParse: vi.fn((data) => {
        if (!data.sourceUid || !data.targetUid || !data.relationType) {
          return { success: false, error: { flatten: () => 'Erreur de validation' } };
        }
        return { success: true, data };
      })
    }
  };
});

describe('API Resonance - Links Weaving (POST)', () => {
  beforeEach(() => { 
    vi.clearAllMocks(); 
    // Par défaut, le mock de la méthode statique renvoie un succès
    mockWeaveCrossDomainLink.mockResolvedValue({ success: true });
  });

  it('🔴 doit rejeter le tissage si l\'oiseau est aveugle (401)', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(null);
    const req = new NextRequest('http://localhost/api', { method: 'POST' });
    const res = await POST(req as any);
    expect(res.status).toBe(401);
  });

  it('🔴 doit rejeter si la forme du pont est asymétrique (400)', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({ user: { uid: 'bird_1' } } as any);
    const req = new NextRequest('http://localhost/api', { 
      method: 'POST', 
      body: JSON.stringify({ sourceUid: 'src_1' }) 
    });
    const res = await POST(req as any);
    expect(res.status).toBe(400);
  });

  it('🔥 doit gérer le rejet de la matrice avec grâce (500)', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({ user: { uid: 'bird_1', capabilities: [] } } as any);
    mockWeaveCrossDomainLink.mockRejectedValueOnce(new Error("Conflit dimensionnel."));
    
    const payload = { sourceUid: 's_1', sourceLabel: 'User', targetUid: 't_1', targetLabel: 'Project', relationType: 'ILLUMINATES' };
    const req = new NextRequest('http://localhost/api', { method: 'POST', body: JSON.stringify(payload) });
    
    const res = await POST(req as any);
    expect(res.status).toBe(500);
  });

  it('🟢 doit tisser le pont avec succès dans le Graphe (201 ou 200)', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({ user: { uid: 'bird_1', capabilities: ['*'] } } as any);
    mockWeaveCrossDomainLink.mockResolvedValueOnce({ success: true, relation: 'ILLUMINATES' });

    const payload = { sourceUid: 's_1', sourceLabel: 'User', targetUid: 't_1', targetLabel: 'Project', relationType: 'ILLUMINATES' };
    const req = new NextRequest('http://localhost/api', { method: 'POST', body: JSON.stringify(payload) });
    
    const res = await POST(req as any);
    const data = await res.json();
    
    expect([200, 201]).toContain(res.status);
    expect(data.success).toBe(true);
    expect(mockWeaveCrossDomainLink).toHaveBeenCalled();
  });
});