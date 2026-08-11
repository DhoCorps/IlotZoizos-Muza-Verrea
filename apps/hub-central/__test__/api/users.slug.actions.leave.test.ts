import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST } from '@/app/api/users/[slug]/actions/leave/route';
import { getServerSession } from 'next-auth/next';
import { OiseauModel } from '@ilot/infrastructure';
import { TeamOrchestrator } from '@ilot/shared-core';
import { revalidateTag } from 'next/cache';

vi.mock('next/cache', () => ({
  unstable_cache: vi.fn((cb) => cb),
  revalidateTag: vi.fn(),
}));

vi.mock('next-auth/next', () => ({
  getServerSession: vi.fn(),
}));

vi.mock('@ilot/infrastructure', () => ({
  connectToDatabase: vi.fn().mockResolvedValue(true),
  OiseauModel: {
    findOne: vi.fn(),
  },
}));

describe('Route API : Miroir & Envol (GET / POST)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete (global as any).__mockUser;

    // 🛡️ SUTURE CHIRURGICALE : Espionnage direct sur le prototype de TeamOrchestrator
    vi.spyOn(TeamOrchestrator.prototype, 'leaveTeam').mockResolvedValue({
      success: true,
      message: "Envol réussi.",
    } as any);
  });

  describe('GET - Miroir', () => {
    it('doit renvoyer les données privées si c\'est le propriétaire', async () => {
      vi.mocked(getServerSession).mockResolvedValue({ user: { uid: 'dho' } } as any);
      vi.mocked(OiseauModel.findOne).mockReturnValue({
        lean: vi.fn().mockResolvedValue({ uid: 'dho', pseudo: 'DhÖ', email: 'secret@zoizos.fr' }),
      } as any);

      const req = new Request('http://localhost/api/users/dho');
      const response = await GET(req as any, { params: Promise.resolve({ slug: 'dho' }) });
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.email).toBe('secret@zoizos.fr');
    });

    it('doit masquer l\'email pour un visiteur anonyme', async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);
      vi.mocked(OiseauModel.findOne).mockReturnValue({
        lean: vi.fn().mockResolvedValue({ uid: 'dho', pseudo: 'DhÖ', email: 'secret@zoizos.fr' }),
      } as any);

      const req = new Request('http://localhost/api/users/dho');
      const response = await GET(req as any, { params: Promise.resolve({ slug: 'dho' }) });
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.email).toBeUndefined();
    });
  });

  describe('POST - Envol', () => {
    it('doit rejeter (403) si l\'utilisateur tente de forcer l\'exil d\'un autre', async () => {
      vi.mocked(getServerSession).mockResolvedValue({ user: { uid: 'intrus', capabilities: [] } } as any);

      const req = new Request('http://localhost/api/users/dho', {
        method: 'POST',
        body: JSON.stringify({ mode: 'CLEAN', teamId: 't-1' }),
      });

      const response = await POST(req as any, { params: Promise.resolve({ slug: 'dho' }) });
      expect(response.status).toBe(403);
    });

    it('doit réussir (200) l\'envol et invalider le cache', async () => {
      vi.mocked(getServerSession).mockResolvedValue({ user: { uid: 'dho', capabilities: [] } } as any);

      const req = new Request('http://localhost/api/users/dho', {
        method: 'POST',
        body: JSON.stringify({ mode: 'CLEAN', teamId: 't-1' }),
      });

      const response = await POST(req as any, { params: Promise.resolve({ slug: 'dho' }) });
      
      expect(response.status).toBe(200);
      expect(revalidateTag).toHaveBeenCalledWith('profile-dho');
    });
  });
});