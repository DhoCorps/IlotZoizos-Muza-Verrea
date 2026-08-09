// apps/hub-central/__test__/api/showcase.stream.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '../../app/api/showcase/stream/route';
import { ShowcaseOrchestrator } from '@ilot/shared-core';
import { NextRequest } from 'next/server';

// Mock de l'orchestrateur pour ne pas solliciter la vraie base de données ni le shuffler
vi.mock('@ilot/shared-core', () => ({
  ShowcaseOrchestrator: {
    getPersonalizedShowcase: vi.fn(),
  },
}));

describe('GET /api/showcase/stream - La Jonction de Diffusion', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('doit rejeter (401) si l\'identifiant de l\'oiseau (userUid) est absent', async () => {
    const req = new NextRequest('http://localhost/api/showcase/stream?apps=ABYSS');
    
    const response = await GET(req);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.success).toBe(false);
    expect(data.error).toContain('Aura non détectée');
    expect(ShowcaseOrchestrator.getPersonalizedShowcase).not.toHaveBeenCalled();
  });

  it('doit parser les filtres de l\'URL et retourner la playlist personnalisée (200)', async () => {
    // Simulation d'une playlist générée par l'orchestrateur
    const mockPlaylist = [
      { mediaId: 'item_1', title: 'Toile 1', sourceApp: 'ABYSS' },
      { mediaId: 'item_2', title: 'Son 1', sourceApp: 'PARTITA' }
    ];

    vi.mocked(ShowcaseOrchestrator.getPersonalizedShowcase).mockResolvedValueOnce(mockPlaylist as any);

    // Requête avec paramètres complexes (simulant ce que le lecteur UI enverra)
    const req = new NextRequest('http://localhost/api/showcase/stream?userUid=bird_test&apps=ABYSS,PARTITA&onlyTradable=true');
    
    const response = await GET(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.count).toBe(2);
    expect(data.data).toEqual(mockPlaylist);

    // Vérification stricte de la transmission des filtres castés à l'orchestrateur
    expect(ShowcaseOrchestrator.getPersonalizedShowcase).toHaveBeenCalledWith(
      'bird_test',
      {
        selectedApps: ['ABYSS', 'PARTITA'],
        onlyTradable: true
      }
    );
  });

  it('doit cascader proprement les erreurs 500 en cas de faille de l\'orchestrateur', async () => {
    vi.mocked(ShowcaseOrchestrator.getPersonalizedShowcase).mockRejectedValueOnce(
      new Error('Rupture du continuum espace-temps')
    );

    const req = new NextRequest('http://localhost/api/showcase/stream?userUid=bird_unlucky');
    
    const response = await GET(req);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.success).toBe(false);
    expect(data.error).toBe('Rupture du continuum espace-temps');
  });
});