import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '@/app/api/users/[slug]/resonance/route';
import { getServerSession } from 'next-auth/next';
import { connectToDatabase, OiseauModel } from '@ilot/infrastructure';
import { TaskResonanceOrchestrator, ResonanceOrchestrator } from '@ilot/shared-core';
import { NextRequest } from 'next/server';

// --- MOCKS ---
vi.mock('next-auth/next', () => ({ getServerSession: vi.fn() }));
vi.mock('@ilot/infrastructure', () => ({
  connectToDatabase: vi.fn().mockResolvedValue(true),
  OiseauModel: { findOne: vi.fn(), updateOne: vi.fn() },
}));
vi.mock('@ilot/shared-core', () => ({
  TaskResonanceOrchestrator: vi.fn().mockImplementation(() => ({
    processUserTaskResonance: vi.fn(),
  })),
  ResonanceOrchestrator: {
    weaveResonance: vi.fn(),
    severResonance: vi.fn(),
  },
}));

describe('User Resonance Slug API [POST]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('devrait retourner 401 si l oiseau n est pas authentifié', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(null);

    const req = { text: vi.fn().mockResolvedValue('') } as unknown as NextRequest;
    const res = await POST(req, { params: Promise.resolve({ slug: 'cible' }) });
    
    expect(res.status).toBe(401);
  });

  it('devrait réussir (200) le mode WEAVE en appliquant le slugify', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { uid: 'oiseau-1' },
    } as any);

    vi.mocked(OiseauModel.findOne).mockReturnValueOnce({
      lean: vi.fn().mockResolvedValueOnce({ uid: 'oiseau-2' }),
    } as any);

    vi.mocked(ResonanceOrchestrator.weaveResonance).mockResolvedValueOnce(true);

    const body = JSON.stringify({ action: 'WEAVE', type: 'FOLLOWS_GLOBAL' });
    const req = { text: vi.fn().mockResolvedValue(body) } as unknown as NextRequest;

    const res = await POST(req, { params: Promise.resolve({ slug: 'Mon Oiseau Test!' }) });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    // Vérifie que le slugify a été appliqué (Mon Oiseau Test! -> mon-oiseau-test)
    expect(OiseauModel.findOne).toHaveBeenCalledWith({
      $or: [{ slug: 'mon-oiseau-test' }, { uid: 'mon-oiseau-test' }]
    });
  });

  it('devrait réussir (200) le calcul de resonance par défaut en appliquant le slugify', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { uid: 'oiseau-1' },
    } as any);

    const mockResonance = { value: 0.8 };
    const mockProcess = vi.fn().mockResolvedValueOnce(mockResonance);
    vi.mocked(TaskResonanceOrchestrator).mockImplementationOnce(() => ({
        processUserTaskResonance: mockProcess,
    } as any));

    const req = { text: vi.fn().mockResolvedValue('') } as unknown as NextRequest;
    const res = await POST(req, { params: Promise.resolve({ slug: 'Mon Oiseau Test!' }) });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(mockProcess).toHaveBeenCalledWith('mon-oiseau-test', expect.any(Object));
  });
});