import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '../../app/api/showcase/preferences/route';
import { UniversalMediaModel } from '@ilot/infrastructure';

// 🛡️ MOCK GLOBAL : Empêche Next.js de paniquer sur le cache
vi.mock('next/cache', () => ({
  revalidateTag: vi.fn(),
}));

// 🛡️ MOCK INTELLIGENT DE L'INFRASTRUCTURE (LA CORRECTION EST ICI)
vi.mock('@ilot/infrastructure', async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual, // Garde "connectToDatabase" et le reste intacts !
    UniversalMediaModel: {
      updateMany: vi.fn(),
    }
  };
});

// 🛡️ MOCK DU GARDE D'AURA
vi.mock('@/lib/api-guards', () => ({
  withAura: (handler: any) => async (req: any, context: any) => {
    // Simule un oiseau connecté avec l'UID 'bird_alpha'
    return handler(req, context, { uid: 'bird_alpha', capabilities: ['*'] });
  },
}));

describe('POST /api/showcase/preferences - Route API de Configuration Granulaire', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.__mockUser = undefined;
  });

  it('doit mettre à jour les préférences de consentement avec succès (200)', async () => {
    vi.mocked(UniversalMediaModel.updateMany).mockResolvedValue({ modifiedCount: 1 } as any);

    const req = new Request('http://localhost/api/showcase/preferences', {
      method: 'POST',
      body: JSON.stringify({ consentForShowcase: true, sourceApp: 'DHO' })
    });

    const response = await POST(req, {} as any);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.ownerUid).toBe('bird_alpha');
    
    // Vérifie que le bon filtre a été passé à Mongoose
    expect(UniversalMediaModel.updateMany).toHaveBeenCalledWith(
      { ownerUid: 'bird_alpha', sourceApp: 'DHO' },
      { $set: { consentForShowcase: true } }
    );
  });

  it('doit retourner une erreur 400 si le corps de requête est illisible', async () => {
    const req = new Request('http://localhost/api/showcase/preferences', {
      method: 'POST'
      // Body intentionnellement omis
    });

    const response = await POST(req, {} as any);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toContain('illisible');
  });

  it('doit retourner une erreur 500 en cas de défaillance interne de la Silice', async () => {
    // Simule un crash de la base de données
    vi.mocked(UniversalMediaModel.updateMany).mockRejectedValue(new Error('Erreur Silice MongoDB'));

    const req = new Request('http://localhost/api/showcase/preferences', {
      method: 'POST',
      body: JSON.stringify({ consentForShowcase: false })
    });

    const response = await POST(req, {} as any);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.success).toBe(false);
    expect(data.error).toBe('Erreur Silice MongoDB');
  });
});