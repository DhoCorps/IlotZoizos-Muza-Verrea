import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '@/app/api/salon/thought/route';
import { ConsciousnessSalonOrchestrator } from '@ilot/shared-core';
import { getServerSession } from "next-auth/next";
import { connectToDatabase } from '@ilot/infrastructure';

vi.mock('next-auth/next', () => ({
  getServerSession: vi.fn(),
}));

vi.mock('@ilot/infrastructure', () => ({
  connectToDatabase: vi.fn().mockResolvedValue(true),
}));

vi.mock('@ilot/shared-core', () => ({
  ConsciousnessSalonOrchestrator: {
    calculateEntanglementLevel: vi.fn(),
    sealThought: vi.fn(),
    unsealThought: vi.fn(),
  },
}));

describe('API Salon Privé - Pensées Quantiques', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Simulation d'une session utilisateur valide par défaut
    vi.mocked(getServerSession).mockResolvedValue({
      user: { uid: 'test-user', capabilities: ['*'] }
    } as any);
  });

  it('🟢 ENTANGLEMENT : doit réussir (200)', async () => {
    vi.mocked(ConsciousnessSalonOrchestrator.calculateEntanglementLevel).mockReturnValue(95);
    const req = new Request('http://localhost/api', { 
      method: 'POST', body: JSON.stringify({ action: 'ENTANGLEMENT', resonanceScore: 10, mutualTrustIndex: 8 }) 
    });
    const res = await POST(req);
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.entanglementLevel).toBe(95);
    expect(connectToDatabase).toHaveBeenCalled();
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
    expect(res.status).toBe(500);
  });
});