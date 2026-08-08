import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '@/app/api/auth/register/route';
import { revalidateTag } from 'next/cache';
import { OiseauOrchestrator } from '@ilot/shared-core';

// -------------------------------------------------------------------------
// 🎭 MOCKS GLOBAUX (Hissés automatiquement par Vitest)
// -------------------------------------------------------------------------
vi.mock('@/lib/api-guards', () => ({
  withSilice: (handler: any) => handler,
}));

vi.mock('next/cache', () => ({
  revalidateTag: vi.fn(),
}));

vi.mock('@ilot/shared-core', () => ({
  OiseauOrchestrator: vi.fn().mockImplementation(() => ({
    fosterOiseau: vi.fn(),
  })),
}));

describe('API Auth Register POST', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('🔴 [POST] doit rejeter (400) si les champs obligatoires manquent', async () => {
    const req = new Request('http://localhost/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email: 'test@ilot.fr' }) // pseudo/password manquant
    });

    const res = await POST(req as any);
    expect(res.status).toBe(400);
  });

  it('🟢 [POST] doit inscrire l\'oiseau (201) et invalider le cache', async () => {
    // On configure le succès pour cet appel spécifique
    const mockFoster = vi.fn().mockResolvedValue({
      mongo: { uid: 'bird_new', pseudo: 'NouveauPiaf', frequenceHEX: '#000000' }
    });
    vi.mocked(OiseauOrchestrator).mockImplementationOnce(() => ({
      fosterOiseau: mockFoster,
    } as any));

    const req = new Request('http://localhost/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ 
        email: 'test@ilot.fr', 
        password: 'secure', 
        pseudo: 'NouveauPiaf' 
      })
    });

    const res = await POST(req as any);
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json.oiseau.uid).toBe('bird_new');
    expect(revalidateTag).toHaveBeenCalledWith('oiseaux');
  });

  it('🔴 [POST] doit gérer les erreurs de l\'orchestrateur (500)', async () => {
    // On configure l'erreur pour cet appel spécifique
    const mockFoster = vi.fn().mockRejectedValue({ message: 'Erreur technique', statusCode: 500 });
    vi.mocked(OiseauOrchestrator).mockImplementationOnce(() => ({
      fosterOiseau: mockFoster,
    } as any));

    const req = new Request('http://localhost/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email: 'test@ilot.fr', password: 'pwd', pseudo: 'Piaf' })
    });

    const res = await POST(req as any);
    expect(res.status).toBe(500);
  });
});