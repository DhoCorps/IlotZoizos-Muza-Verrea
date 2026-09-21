import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '@/app/api/resonance/follow/route'; // Ajuste le chemin relatif si besoin
import { weaveFollowLink, severFollowLink } from '@ilot/infrastructure';
import { revalidateTag } from 'next/cache';

// ==========================================
// 🎭 MOCKS DE L'ENVIRONNEMENT NEXT.JS & INFRA
// ==========================================
vi.mock('next/server', () => ({
  NextResponse: {
    json: vi.fn((body, init) => ({ body, status: init?.status || 200 })),
  }
}));

vi.mock('next/cache', () => ({
  revalidateTag: vi.fn(),
}));

// Mock avec les noms anglais
vi.mock('@ilot/infrastructure', () => ({
  weaveFollowLink: vi.fn().mockResolvedValue({}),
  severFollowLink: vi.fn().mockResolvedValue(true),
}));

// Mock du gardien d'Aura pour simuler un utilisateur connecté
vi.mock('@/lib/api-guards', () => ({
  withAura: vi.fn((handler) => async (req: any, context: any) => {
    return handler(req, context, { uid: 'bird_subscriber_1', capabilities: [] });
  }),
  handleRouteError: vi.fn((error, msg) => ({ error: msg, details: error })),
}));

// ==========================================
// 🧪 TESTS : ROUTE ABONNEMENT (FOLLOW)
// ==========================================
describe('POST /api/resonance/follow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('🔴 doit rejeter (400) si l\'Oiseau tente de s\'abonner à lui-même', async () => {
    const req = {
      json: vi.fn().mockResolvedValue({
        targetUid: 'bird_subscriber_1', // Identique au currentUser simulé
        targetType: 'USER',
        action: 'FOLLOW'
      })
    } as any;

    const res: any = await POST(req, {} as any);
    
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('paradoxale');
    expect(weaveFollowLink).not.toHaveBeenCalled();
  });

  it('🔴 doit rejeter (400) si la cible n\'est pas supportée par la matrice', async () => {
    const req = {
      json: vi.fn().mockResolvedValue({
        targetUid: 'target_99',
        targetType: 'GHOST_ENTITY', // Type illégal
        action: 'FOLLOW'
      })
    } as any;

    const res: any = await POST(req, {} as any);
    
    expect(res.status).toBe(400);
    // 🌿 C'est ici que la vérification se fait en français désormais !
    expect(res.body.error).toContain("Paramètres d'abonnement invalides"); 
  });

  it('🟢 doit tisser un lien d\'abonnement dans le Graphe et invalider le cache', async () => {
    const req = {
      json: vi.fn().mockResolvedValue({
        targetUid: 'sujet_42',
        targetType: 'BLOG',
        action: 'FOLLOW'
      })
    } as any;

    const res: any = await POST(req, {} as any);
    
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    expect(weaveFollowLink).toHaveBeenCalledTimes(1);
    expect(weaveFollowLink).toHaveBeenCalledWith('bird_subscriber_1', 'sujet_42', 'BLOG');
    
    // Vérification de la cascade de purge de cache
    expect(revalidateTag).toHaveBeenCalledWith('followers-sujet_42');
    expect(revalidateTag).toHaveBeenCalledWith('following-bird_subscriber_1');
  });

  it('🟢 doit rompre un lien d\'abonnement et invalider le cache (UNFOLLOW)', async () => {
    const req = {
      json: vi.fn().mockResolvedValue({
        targetUid: 'project_7',
        targetType: 'PROJECT',
        action: 'UNFOLLOW'
      })
    } as any;

    const res: any = await POST(req, {} as any);
    
    expect(res.status).toBe(200);
    expect(res.body.message).toContain('rompu');

    expect(severFollowLink).toHaveBeenCalledTimes(1);
    expect(severFollowLink).toHaveBeenCalledWith('bird_subscriber_1', 'project_7');
    expect(revalidateTag).toHaveBeenCalled();
  });
});