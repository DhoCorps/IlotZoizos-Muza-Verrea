import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '../../app/api/salon/thought/route';
import { ConsciousnessSalonOrchestrator } from '@ilot/shared-core';

vi.mock('@ilot/shared-core', () => ({
  ConsciousnessSalonOrchestrator: {
    calculateEntanglementLevel: vi.fn(),
    sealThought: vi.fn(),
    unsealThought: vi.fn()
  }
}));

describe('API Salon Privé - Pensées Quantiques (POST /api/salon/thought)', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('🔴 doit rejeter une requête sans corps JSON valide (400)', async () => {
    const req = new Request('http://localhost/api/salon/thought', { method: 'POST', body: '{ broken: ' });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('🔴 doit rejeter une action inconnue (400)', async () => {
    const req = new Request('http://localhost/api', { method: 'POST', body: JSON.stringify({ action: 'UNKNOWN' }) });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('🟢 ENTANGLEMENT : doit calculer l\'intrication avec succès (200)', async () => {
    vi.mocked(ConsciousnessSalonOrchestrator.calculateEntanglementLevel).mockReturnValueOnce(95);
    const req = new Request('http://localhost/api', { 
      method: 'POST', body: JSON.stringify({ action: 'ENTANGLEMENT', resonanceScore: 10, mutualTrustIndex: 8 }) 
    });
    const res = await POST(req);
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.entanglementLevel).toBe(95);
  });

  it('🔴 SEAL : doit rejeter si la clé manque (400)', async () => {
    const req = new Request('http://localhost/api', { 
      method: 'POST', body: JSON.stringify({ action: 'SEAL', plainThought: 'Secret' }) 
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('🟢 SEAL : doit sceller la pensée avec succès (200)', async () => {
    // On simule le retour d'un objet EnactedThought (chiffré)
    vi.mocked(ConsciousnessSalonOrchestrator.sealThought).mockReturnValueOnce({ encrypted: 'hash', iv: '123' } as any);
    const req = new Request('http://localhost/api', { 
      method: 'POST', body: JSON.stringify({ action: 'SEAL', plainThought: 'Secret', sharedSecretKey: 'Key' }) 
    });
    const res = await POST(req);
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.sealed.encrypted).toBe('hash');
  });

  it('🔥 UNSEAL : doit gérer les erreurs de déchiffrement avec élégance (500)', async () => {
    vi.mocked(ConsciousnessSalonOrchestrator.unsealThought).mockImplementationOnce(() => { throw new Error('Bad key'); });
    const req = new Request('http://localhost/api', { 
      method: 'POST', body: JSON.stringify({ 
        action: 'UNSEAL', 
        enactedThought: { encrypted: 'hash', iv: '123' }, // On passe un objet et pas une simple string
        sharedSecretKey: 'WrongKey' 
      }) 
    });
    const res = await POST(req);
    expect(res.status).toBe(500);
  });
});