import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST } from '../../app/api/economy/alveole/route';
import { EconomyService } from '@ilot/infrastructure';

// 🛡️ MOCK GLOBAL : Empêche Next.js de chercher un store de cache
vi.mock('next/cache', () => ({
  unstable_cache: vi.fn((cb) => cb),
  revalidateTag: vi.fn(),
}));

// 🛡️ MOCK DE L'INFRASTRUCTURE
vi.mock('@ilot/infrastructure', async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    EconomyService: {
      getInventory: vi.fn(),
      upgradeAlveole: vi.fn(),
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

describe('Routes API /economy/alveole', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('GET - doit retourner l\'inventaire depuis le cache/service', async () => {
    vi.mocked(EconomyService.getInventory).mockResolvedValue({ alveoleLevel: 1, parchemins: 5 } as any);
    
    const req = new Request('http://localhost/api/economy/alveole');
    const res = await GET(req, {} as any);
    const json = await res.json();
    
    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data.parchemins).toBe(5);
  });

  it('POST - doit upgrade l\'alvéole et invalider le cache', async () => {
    vi.mocked(EconomyService.upgradeAlveole).mockResolvedValue({ alveoleLevel: 2, parchemins: 0 } as any);
    
    const req = new Request('http://localhost/api/economy/alveole', { method: 'POST' });
    const res = await POST(req, {} as any);
    const json = await res.json();
    
    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data.alveoleLevel).toBe(2);
    expect(EconomyService.upgradeAlveole).toHaveBeenCalledWith('bird_test_123');
  });
});