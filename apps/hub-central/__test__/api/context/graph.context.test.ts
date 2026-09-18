import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '@/app/api/graph/context/route';
import { NextRequest } from 'next/server';

const mockRun = vi.fn();
const mockClose = vi.fn().mockResolvedValue(true);

vi.mock('@ilot/infrastructure', () => ({
  connectToDatabase: vi.fn().mockResolvedValue(true),
  getNeo4jSession: vi.fn(() => ({
    run: mockRun,
    close: mockClose,
  })),
}));

vi.mock('next/cache', () => ({
  unstable_cache: vi.fn((cb: Function) => cb),
}));

vi.mock('@/lib/api-guards', () => ({
  withSilice: (handler: Function) => handler,
  handleRouteError: (error: unknown, context: string) => {
    const err = error as Error;
    console.error(`[${context}]`, err);
    return new Response(JSON.stringify({ success: false, error: err.message || 'Erreur interne.' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}));

describe('API Graph - Contexte relationnel (GET /api/graph/context)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('✅ doit retourner des tableaux vides si aucun uid n’est fourni', async () => {
    const req = new NextRequest('http://localhost:3000/api/graph/context');
    const res = await GET(req, { params: Promise.resolve({}) });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.nodes).toEqual([]);
    expect(data.links).toEqual([]);
  });

  it('✅ doit extraire et formuler les nœuds et liens du graphe Neo4j', async () => {
    mockRun.mockResolvedValueOnce({
      records: [
        {
          get: (key: string) => {
            if (key === 'root') return { properties: { uid: 'uid-root', name: 'Nid Principal' }, labels: ['Oiseau'] };
            if (key === 'neighbor') return { properties: { uid: 'uid-neighbor', pseudo: 'Voisin' }, labels: ['Oiseau'] };
            if (key === 'r') return { type: 'RESONATES_WITH' };
            return null;
          }
        }
      ]
    });

    const req = new NextRequest('http://localhost:3000/api/graph/context?uid=uid-root');
    const res = await GET(req, { params: Promise.resolve({}) });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.nodes.length).toBe(2);
    expect(data.links.length).toBe(1);
    expect(data.links[0].type).toBe('RESONATES_WITH');
    expect(mockClose).toHaveBeenCalled();
  });

  it('🔥 doit gérer les erreurs de la matrice Neo4j avec élégance (500)', async () => {
    mockRun.mockRejectedValueOnce(new Error('Neo4j disconnected'));

    const req = new NextRequest('http://localhost:3000/api/graph/context?uid=uid-root');
    const res = await GET(req, { params: Promise.resolve({}) });
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.success).toBe(false);
    expect(mockClose).toHaveBeenCalled();
  });
});