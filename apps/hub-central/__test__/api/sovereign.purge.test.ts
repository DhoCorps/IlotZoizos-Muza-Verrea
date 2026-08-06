import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '../../app/api/sovereign/purge/route';
import { getServerSession } from 'next-auth/next';

vi.mock('next-auth/next', () => ({ getServerSession: vi.fn() }));
vi.mock('@ilot/infrastructure', () => ({ connectToDatabase: vi.fn().mockResolvedValue(true) }));

const mockExecuteSovereignPurge = vi.fn();
vi.mock('@ilot/shared-core', () => ({
  SovereignPurgeOrchestrator: vi.fn().mockImplementation(() => ({
    executeSovereignPurge: mockExecuteSovereignPurge
  }))
}));

describe('API Sovereign Purge - L’Évanescence (/api/sovereign/purge)', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('🔴 doit rejeter la dissolution si l\'Oiseau n\'est pas connecté (401)', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(null);
    const req = new Request('http://localhost/api', { method: 'POST' });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('🔴 doit rejeter la requête si le contexte est incomplet (400)', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({ user: { uid: 'bird_1' } } as any);
    const req = new Request('http://localhost/api', { 
      method: 'POST', body: JSON.stringify({ entityId: 'target_1' }) // Manque 'reason'
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('🔥 doit gérer avec élégance un échec de l\'orchestrateur (500)', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({ user: { uid: 'bird_1', capabilities: [] } } as any);
    mockExecuteSovereignPurge.mockRejectedValueOnce(new Error("L'entité résiste à l'anéantissement."));
    
    const req = new Request('http://localhost/api', { 
      method: 'POST', body: JSON.stringify({ entityId: 'target_1', reason: 'VITAL_COLLAPSE' }) 
    });
    const res = await POST(req);
    expect(res.status).toBe(500);
  });

  it('🟢 doit exécuter la purge souveraine avec succès (200)', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({ user: { uid: 'bird_1', capabilities: ['*'] } } as any);
    mockExecuteSovereignPurge.mockResolvedValueOnce({ success: true, tracesErased: 42 });
    
    const req = new Request('http://localhost/api', { 
      method: 'POST', body: JSON.stringify({ entityId: 'target_1', reason: 'VITAL_COLLAPSE' }) 
    });
    const res = await POST(req);
    const data = await res.json();
    
    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(mockExecuteSovereignPurge).toHaveBeenCalled();
  });
});