import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PUT as putFontBySlug, DELETE as deleteFontBySlug } from '../../app/api/letrin/fonts/[slug]/route';
import { getServerSession } from 'next-auth/next';

// 🪡 Mock de la session
vi.mock('next-auth/next', () => ({
  getServerSession: vi.fn()
}));

// 🪡 Mocks granulaires pour manipuler les retours selon les scénarios
const mockFindByIdAndUpdateLean = vi.fn();
const mockFindByIdAndUpdate = vi.fn().mockImplementation(() => ({ lean: mockFindByIdAndUpdateLean }));
const mockFindByIdAndDelete = vi.fn();
const mockConnectToDatabase = vi.fn().mockResolvedValue(true);

vi.mock('@ilot/infrastructure', () => ({
  connectToDatabase: (...args: any[]) => mockConnectToDatabase(...args),
  FontProject: {
    findByIdAndUpdate: (...args: any[]) => mockFindByIdAndUpdate(...args),
    findByIdAndDelete: (...args: any[]) => mockFindByIdAndDelete(...args)
  }
}));

describe('API Letr\'In - Fonts par Slug (PUT / DELETE)', () => {
  const mockParams = { params: Promise.resolve({ slug: 'font_1' }) };

  beforeEach(() => {
    vi.clearAllMocks();
    mockConnectToDatabase.mockResolvedValue(true); // Réinitialise la connexion DB au vert par défaut
  });

  // ==========================================
  // TESTS POUR LE PUT
  // ==========================================
  describe('Mutation (PUT)', () => {
    it('❌ doit rejeter si l’oiseau n’est pas connecté (401)', async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce(null);
      
      const req = new Request('http://localhost/api', { 
        method: 'PUT', 
        body: JSON.stringify({ name: 'Updated' }) 
      });
      const res = await putFontBySlug(req, mockParams);
      expect(res.status).toBe(401);
    });

    it('❌ doit rejeter si le corps de la requête est illisible (400)', async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({ user: { uid: 'bird_1' } } as any);
      
      // On envoie un JSON volontairement cassé pour forcer le catch(parseErr)
      const req = new Request('http://localhost/api', { 
        method: 'PUT', 
        body: '{ json_casse: oui ' 
      });
      const res = await putFontBySlug(req, mockParams);
      expect(res.status).toBe(400);
    });

    it('🔴 doit renvoyer 404 si la police est introuvable pour la mutation', async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({ user: { uid: 'bird_1' } } as any);
      mockFindByIdAndUpdateLean.mockResolvedValueOnce(null); // Simule que la DB ne trouve rien
      
      const req = new Request('http://localhost/api', { 
        method: 'PUT', 
        body: JSON.stringify({ name: 'Updated' }) 
      });
      const res = await putFontBySlug(req, mockParams);
      expect(res.status).toBe(404);
    });

    it('🔥 doit gérer une fracture de la Silice (Base de données) avec élégance (500)', async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({ user: { uid: 'bird_1' } } as any);
      mockFindByIdAndUpdateLean.mockRejectedValueOnce(new Error("Erreur base de données fatale"));
      
      const req = new Request('http://localhost/api', { 
        method: 'PUT', 
        body: JSON.stringify({ name: 'Updated' }) 
      });
      const res = await putFontBySlug(req, mockParams);
      expect(res.status).toBe(500);
    });

    it('✅ doit mettre à jour le projet avec succès (200)', async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({ user: { uid: 'bird_1' } } as any);
      mockFindByIdAndUpdateLean.mockResolvedValueOnce({ id: 'font_1', name: 'Updated' });
      
      const req = new Request('http://localhost/api', { 
        method: 'PUT', 
        body: JSON.stringify({ name: 'Updated' }) 
      });
      const res = await putFontBySlug(req, mockParams);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.name).toBe('Updated');
    });
  });

  // ==========================================
  // TESTS POUR LE DELETE
  // ==========================================
  describe('Dissolution (DELETE)', () => {
    it('❌ doit rejeter si l’oiseau n’est pas connecté (401)', async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce(null);
      
      const req = new Request('http://localhost/api', { method: 'DELETE' });
      const res = await deleteFontBySlug(req, mockParams);
      expect(res.status).toBe(401);
    });

    it('🔴 doit renvoyer 404 si la police est introuvable pour la dissolution', async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({ user: { uid: 'bird_1' } } as any);
      mockFindByIdAndDelete.mockResolvedValueOnce(null); // Introuvable
      
      const req = new Request('http://localhost/api', { method: 'DELETE' });
      const res = await deleteFontBySlug(req, mockParams);
      expect(res.status).toBe(404);
    });

    it('🔥 doit gérer une erreur interne de suppression avec élégance (500)', async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({ user: { uid: 'bird_1' } } as any);
      mockFindByIdAndDelete.mockRejectedValueOnce(new Error("Impossible de supprimer le document"));
      
      const req = new Request('http://localhost/api', { method: 'DELETE' });
      const res = await deleteFontBySlug(req, mockParams);
      expect(res.status).toBe(500);
    });

    it('✅ doit dissoudre le projet avec succès (200)', async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({ user: { uid: 'bird_1' } } as any);
      mockFindByIdAndDelete.mockResolvedValueOnce(true); // Suppression validée
      
      const req = new Request('http://localhost/api', { method: 'DELETE' });
      const res = await deleteFontBySlug(req, mockParams);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockFindByIdAndDelete).toHaveBeenCalledWith('font_1');
    });
  });
});