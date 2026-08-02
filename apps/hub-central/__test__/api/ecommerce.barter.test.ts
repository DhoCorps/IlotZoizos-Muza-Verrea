import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getServerSession } from "next-auth/next";
import { GET, PATCH } from '../../../../apps/hub-central/app/api/ecommerce/barter/[slug]/route';
import { EcommerceOrchestrator } from '@ilot/shared-core';

// 1. MOCK DE LA DOUANE (NextAuth)
vi.mock("next-auth/next", () => ({ getServerSession: vi.fn() }));

// 2. MOCK DE L'INFRASTRUCTURE
vi.mock('@ilot/infrastructure', () => ({
  connectToDatabase: vi.fn().mockResolvedValue(true),
  BarterOfferModel: {
    findOne: vi.fn().mockReturnValue({
      lean: vi.fn().mockResolvedValue({
        uid: 'barter_1',
        status: 'PENDING',
        proposerUid: 'bird_alpha',
        receiverUid: 'bird_beta'
      })
    })
  },
  BarterModel: {
    findOne: vi.fn().mockReturnValue({
      lean: vi.fn().mockResolvedValue({
        uid: 'barter_1',
        status: 'PENDING',
        proposerUid: 'bird_alpha',
        receiverUid: 'bird_beta'
      })
    })
  }
}));

describe('API Ecommerce Barter [slug] (/api/ecommerce/barter/[slug])', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('🟢 doit ausculter une offre de troc spécifique (GET)', async () => {
    vi.mocked(getServerSession).mockResolvedValue({ 
      user: { uid: 'bird_beta', capabilities: [] } 
    } as any);

    const req = new Request('http://localhost/api/ecommerce/barter/barter_1');
    const res = await GET(req, { params: Promise.resolve({ barterId: 'barter_1' }) as any });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.uid).toBe('barter_1');
    expect(data.status).toBe('PENDING');
  });

  it('🟢 doit résoudre (accepter) une offre de troc (PATCH)', async () => {
    vi.mocked(getServerSession).mockResolvedValue({ 
      user: { uid: 'bird_beta', capabilities: [] } 
    } as any);

    vi.spyOn(EcommerceOrchestrator.prototype, 'resolveBarter')
      .mockResolvedValue({ success: true, status: 'ACCEPTED' } as any);

    const req = new Request('http://localhost/api/ecommerce/barter/barter_1', {
      method: 'PATCH',
      body: JSON.stringify({
        action: 'ACCEPT'
      })
    });

    const res = await PATCH(req, { params: Promise.resolve({ barterId: 'barter_1' }) as any });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.status).toBe('ACCEPTED');
  });
});