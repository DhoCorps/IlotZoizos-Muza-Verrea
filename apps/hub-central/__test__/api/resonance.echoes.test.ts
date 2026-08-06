// apps/hub-central/__test__/api/resonance.echoes.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST } from '../../app/api/resonance/echoes/route';
import { getServerSession } from 'next-auth/next';
import { NextRequest } from 'next/server';

vi.mock('next-auth/next', () => ({ getServerSession: vi.fn() }));

const mockLean = vi.fn();
const mockLimit = vi.fn().mockImplementation(() => ({ lean: mockLean }));
const mockSort = vi.fn().mockImplementation(() => ({ limit: mockLimit }));
const mockFind = vi.fn().mockImplementation(() => ({ sort: mockSort }));
const mockCreate = vi.fn();

vi.mock('@ilot/infrastructure', () => ({
  connectToDatabase: vi.fn().mockResolvedValue(true),
  ResonanceModel: {
    find: (...args: any[]) => mockFind(...args),
    create: (...args: any[]) => mockCreate(...args)
  }
}));

const mockAddSocialEcho = vi.fn();
vi.mock('@ilot/shared-core', () => ({
  ResonanceOrchestrator: {
    addSocialEcho: (...args: any[]) => mockAddSocialEcho(...args)
  }
}));

// On by-passe Zod pour se concentrer sur la logique de la route
vi.mock('@ilot/types', async (importOriginal) => {
  const actual = await importOriginal<any>();
  return {
    ...actual,
    EchoSchema: {
      safeParse: vi.fn((data) => {
        if (!data.targetUid) return { success: false, error: { flatten: () => 'Erreur' } };
        return { success: true, data };
      })
    }
  };
});

describe('API Resonance - Echoes (GET / POST)', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('🔴 GET : doit rejeter si la cible (targetUid) manque (400)', async () => {
    const req = new NextRequest('http://localhost/api/resonance/echoes');
    const res = await GET(req as any);
    expect(res.status).toBe(400);
  });

  it('🟢 GET : doit capter les échos de la Silice (200)', async () => {
    mockLean.mockResolvedValueOnce([{ uid: 'echo_1', content: 'Bravo !' }]);
    const req = new NextRequest('http://localhost/api/resonance/echoes?targetUid=bird_42');
    const res = await GET(req as any);
    const data = await res.json();
    
    expect(res.status).toBe(200);
    expect(data[0].content).toBe('Bravo !');
  });

  it('🔴 POST : doit rejeter l\'Oiseau non identifié (401)', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(null);
    const req = new NextRequest('http://localhost/api/resonance/echoes', { method: 'POST' });
    const res = await POST(req as any);
    expect(res.status).toBe(401);
  });

  it('🔴 POST : doit rejeter un écho malformé (400)', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({ user: { uid: 'bird_1' } } as any);
    const req = new NextRequest('http://localhost/api', { method: 'POST', body: JSON.stringify({}) }); // Manque targetUid
    const res = await POST(req as any);
    expect(res.status).toBe(400);
  });

  it('🟢 POST : doit propager un écho TEXT et le sédimenter dans la Silice (201)', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({ user: { uid: 'bird_1', capabilities: [] } } as any);
    mockAddSocialEcho.mockResolvedValueOnce({ echoUid: 'echo_neo_1' });
    mockCreate.mockResolvedValueOnce([{ uid: 'echo_neo_1', content: 'Hello' }]); // Mock Mongo Create

    const payload = { targetUid: 'post_1', targetLabel: 'Post', echoType: 'TEXT', content: 'Hello' };
    const req = new NextRequest('http://localhost/api', { method: 'POST', body: JSON.stringify(payload) });
    
    const res = await POST(req as any);
    const data = await res.json();
    
    expect(res.status).toBe(201);
    expect(data.success).toBe(true);
    expect(mockAddSocialEcho).toHaveBeenCalled();
    expect(mockCreate).toHaveBeenCalled();
  });
});