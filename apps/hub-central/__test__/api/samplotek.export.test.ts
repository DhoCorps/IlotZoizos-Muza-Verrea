import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '@/app/api/samplotek/export/route';
import { SampleModel } from '@ilot/infrastructure';
import { NextRequest } from 'next/server';

// 1. Mock de l'infrastructure en préservant le reste
vi.mock('@ilot/infrastructure', async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    SampleModel: { find: vi.fn() }
  };
});

// 2. Mock de l'Orchestrateur sous forme de VRAIE CLASSE pour que le "new" fonctionne parfaitement
vi.mock('@ilot/shared-core', async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    SamplotekOrchestrator: class {
      exportProject = vi.fn().mockResolvedValue({ 
        success: true, 
        mongo: { uid: 'mix_123', title: 'Mon Mix' } 
      });
    }
  };
});

vi.mock('next/cache', () => ({ revalidateTag: vi.fn() }));

vi.mock('@/lib/api-guards', () => ({
  withAura: (handler: any) => async (req: any, context: any) => handler(req, context, { uid: 'bird_dj', capabilities: [] })
}));

describe('API SamploTek - Export Project (POST)', () => {
  beforeEach(() => {
      vi.clearAllMocks();
  });

  it('🟢 doit calculer les permissions restrictives et déléguer à l\'Orchestrateur', async () => {
    vi.mocked(SampleModel.find).mockReturnValue({
      lean: vi.fn().mockResolvedValue([
        { uid: 's1', permissions: { allowRadio: true, allowBlindTest: true, allowShowcase: false } }
      ])
    } as any);

    const payload = { title: 'Track 1', bpm: 120, tracks: [{ id: 1, sampleUid: 's1', volume: 1, isMuted: false }] };
    const req = new NextRequest('http://localhost/api/samplotek/export', { method: 'POST', body: JSON.stringify(payload) });
    
    const res = await POST(req, {} as any);
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json.success).toBe(true);
    expect(json.data.title).toBe('Mon Mix');
  });
});