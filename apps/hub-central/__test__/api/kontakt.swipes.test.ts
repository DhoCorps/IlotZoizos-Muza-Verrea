import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '../../app/api/kontakt/swipes/route';
import { getServerSession } from 'next-auth/next';

vi.mock('next-auth/next', () => ({
  getServerSession: vi.fn()
}));

vi.mock('@ilot/infrastructure', () => ({
  connectToDatabase: vi.fn().mockResolvedValue(true)
}));

const mockRegisterSwipe = vi.fn();
vi.mock('@ilot/shared-core', () => ({
  KontaktOrchestrator: vi.fn().mockImplementation(() => ({
    registerSwipe: (...args: any[]) => mockRegisterSwipe(...args)
  }))
}));

describe('API Kontakt - Swipes (POST /api/kontakt/swipes)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('❌ doit rejeter si l’oiseau n’est pas connecté (401)', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(null);

    const req = new Request('http://localhost:3000/api/kontakt/swipes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetUid: 'bird_target', action: 'LIKE' })
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('❌ doit rejeter si les paramètres de swipe sont incomplets (400)', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { uid: 'bird_swiper', capabilities: [] }
    } as any);

    const req = new Request('http://localhost:3000/api/kontakt/swipes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetUid: 'bird_target' }) // action manquant
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('✅ doit enregistrer le swipe avec succès (200)', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { uid: 'bird_swiper', capabilities: [] }
    } as any);

    mockRegisterSwipe.mockResolvedValueOnce({ matched: true });

    const req = new Request('http://localhost:3000/api/kontakt/swipes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetUid: 'bird_target', action: 'LIKE' })
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.matched).toBe(true);
  });
});