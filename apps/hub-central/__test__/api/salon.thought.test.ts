import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import { POST } from '@/app/api/salon/thought/route';
import { ConsciousnessSalonOrchestrator } from '@ilot/shared-core';

// Force l'environnement de test
beforeAll(() => {
  vi.stubEnv('NODE_ENV', 'test');
});

afterAll(() => {
  vi.unstubAllEnvs(); // Restaure les variables d'environnement après les tests
});

vi.mock('@ilot/shared-core', () => ({
  ConsciousnessSalonOrchestrator: {
    calculateEntanglementLevel: vi.fn(),
    sealThought: vi.fn(),
    unsealThought: vi.fn(),
  },
}));

describe('API Salon Privé - Pensées Quantiques', () => {
  it('🟢 ENTANGLEMENT : doit réussir (200)', async () => {
    vi.mocked(ConsciousnessSalonOrchestrator.calculateEntanglementLevel).mockReturnValue(95);
    const req = new Request('http://localhost/api', { 
      method: 'POST', body: JSON.stringify({ action: 'ENTANGLEMENT', resonanceScore: 10, mutualTrustIndex: 8 }) 
    });
    const res = await POST(req);
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.entanglementLevel).toBe(95);
  });

  it('🔥 UNSEAL : doit gérer les erreurs (500)', async () => {
    vi.mocked(ConsciousnessSalonOrchestrator.unsealThought).mockImplementationOnce(() => { throw new Error('Bad key'); });
    const req = new Request('http://localhost/api', { 
      method: 'POST', body: JSON.stringify({ 
        action: 'UNSEAL', 
        enactedThought: { encrypted: 'hash', iv: '123' }, 
        sharedSecretKey: 'WrongKey' 
      }) 
    });
    const res = await POST(req);
    expect(res.status).toBe(500); // Maintenant cela devrait être capturé proprement
  });
});