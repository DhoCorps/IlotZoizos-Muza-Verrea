import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST } from '@/app/api/canopy/subsidy/route';
import { SubsidyModel } from '@ilot/infrastructure';

vi.mock('@ilot/infrastructure', () => ({
  SubsidyModel: {
    find: vi.fn(),
    create: vi.fn()
  }
}));

vi.mock('@/lib/api-guards', () => ({
  withAura: (handler: any) => async (req: Request, context: any) => {
    const currentUser = (global as any).__mockUser !== undefined 
      ? (global as any).__mockUser 
      : { uid: 'bird_test_123' };
    return handler(req, context, currentUser);
  }
}));

describe('API Route - /api/canopy/subsidy (avec Cache Sécurisé)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete (global as any).__mockUser;
  });

  it('🟢 doit retourner la liste des subventions en mode GET (en contournant le cache en test)', async () => {
    const mockQuery = {
      sort: vi.fn().mockReturnThis(),
      lean: vi.fn().mockReturnThis(),
      exec: vi.fn().mockResolvedValue([{ title: 'Projet A' }])
    };
    vi.mocked(SubsidyModel.find).mockReturnValue(mockQuery as any);

    const req = new Request('http://localhost/api/canopy/subsidy', { method: 'GET' });
    const response = await GET(req, {} as any);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.subsidies).toHaveLength(1);
  });

  it('🟢 doit créer une nouvelle demande de subvention en mode POST', async () => {
    const mockCreated = { _id: 'sub_new', title: 'Nouveau Projet' };
    vi.mocked(SubsidyModel.create).mockResolvedValue(mockCreated as any);

    const req = new Request('http://localhost/api/canopy/subsidy', {
      method: 'POST',
      body: JSON.stringify({
        title: 'Nouveau Projet',
        motivation: 'Besoin de fonds',
        requestedAmount: 300,
        currency: 'TOX'
      })
    });

    const response = await POST(req, {} as any);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.success).toBe(true);
    expect(SubsidyModel.create).toHaveBeenCalled();
  });
});