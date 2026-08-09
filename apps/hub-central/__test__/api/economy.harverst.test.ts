import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '../../app/api/economy/harvest/route';
import { EconomyService } from '@ilot/infrastructure';

// 🛡️ MOCK GLOBAL : Next Cache
vi.mock('next/cache', () => ({
  revalidateTag: vi.fn(),
}));

// 🛡️ MOCK DE L'INFRASTRUCTURE
vi.mock('@ilot/infrastructure', async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    EconomyService: {
      addResources: vi.fn(),
    },
    IlotError: class extends Error { status: number; constructor(m: string, s: number) { super(m); this.status = s; } }
  };
});

// 🛡️ MOCK DU GARDE D'AURA
vi.mock('@/lib/api-guards', () => ({
  withAura: (handler: any) => async (req: any, context: any) => {
    return handler(req, context, { uid: 'bird_test_123', capabilities: ['*'] });
  },
}));

describe('POST /api/economy/harvest', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('doit verser des ressources dans l\'alvéole', async () => {
    vi.mocked(EconomyService.addResources).mockResolvedValue({ 
      parchemins: 10, 
      plumes: 0, 
      vinyles: 0, 
      sampleNotes: 0, 
      totamtoes: 0 
    } as any);
    
    // Test d'un envoi propre
    const req = new Request('http://localhost/api/economy/harvest', {
      method: 'POST',
      body: JSON.stringify({ parchemins: 5 })
    });

    const res = await POST(req, {} as any);
    const json = await res.json();
    
    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(EconomyService.addResources).toHaveBeenCalledWith(
      'bird_test_123', 
      expect.objectContaining({ parchemins: 5, plumes: 0 })
    );
  });

  it('doit rejeter une requête sans corps', async () => {
    // Test d'une erreur de parsing
    const req = new Request('http://localhost/api/economy/harvest', {
      method: 'POST'
      // Pas de body
    });

    const res = await POST(req, {} as any);
    const json = await res.json();
    
    expect(res.status).toBe(400);
    expect(json.error).toBe('Corps de requête illisible.');
  });
});