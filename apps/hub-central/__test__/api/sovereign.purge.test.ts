import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '@/app/api/sovereign/purge/route';
import { SystemPurgeJobModel } from '@ilot/infrastructure';
import { NextRequest, NextResponse } from 'next/server';

// -------------------------------------------------------------------------
// 🎭 MOCKS DE L'ENVIRONNEMENT
// -------------------------------------------------------------------------
vi.mock('@ilot/infrastructure', () => ({
  connectToDatabase: vi.fn().mockResolvedValue(true),
  SystemPurgeJobModel: {
    create: vi.fn().mockResolvedValue(true),
  },
}));

// Neutralisation de withAura pour les tests unitaires
vi.mock('@/lib/api-guards', () => ({
  withAura: (handler: Function) => async (req: NextRequest, context: unknown) => {
    const mockUser = global.__mockUser;
    if (!mockUser) {
      return NextResponse.json({ success: false, error: "Le Nexus est invisible aux étrangers." }, { status: 401 });
    }
    return await handler(req, context, mockUser);
  },
  handleRouteError: (error: unknown, context: string) => {
    const err = error as Error;
    console.error(`[${context}]`, err);
    return new Response(JSON.stringify({ success: false, error: err.message || 'Erreur interne.' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}));

declare global {
  var __mockUser: {
    uid: string;
    capabilities: string[];
    [key: string]: unknown;
  } | undefined;
}

// -------------------------------------------------------------------------
// 🧪 SUITE DE TESTS
// -------------------------------------------------------------------------
describe('Route API : Purge Souveraine (POST /api/sovereign/purge)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete global.__mockUser;
  });

  it('doit rejeter (401) si l\'utilisateur n\'a pas d\'Aura', async () => {
    delete global.__mockUser;

    const req = new NextRequest('http://localhost/api/sovereign/purge', {
      method: 'POST',
      body: JSON.stringify({ entityId: 'ent-1', reason: 'Obsolescence' }),
    });

    const response = await POST(req, { params: Promise.resolve({}) });
    const json = await response.json();

    expect(response.status).toBe(401);
    expect(json.error).toBe("Le Nexus est invisible aux étrangers.");
  });

  it('doit rejeter (400) si le contexte de purge est incomplet', async () => {
    global.__mockUser = { uid: 'u-123', capabilities: ['*'] };

    const req = new NextRequest('http://localhost/api/sovereign/purge', {
      method: 'POST',
      body: JSON.stringify({ entityId: 'ent-1' }), // Absence de 'reason'
    });

    const response = await POST(req, { params: Promise.resolve({}) });
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.error).toContain("Contexte de purge incomplet");
  });

  it('doit planifier la purge souveraine avec succès (202) et consigner le job dans la Silice', async () => {
    global.__mockUser = { uid: 'u-123', capabilities: ['ROLE_SOVEREIGN'] };

    const req = new NextRequest('http://localhost/api/sovereign/purge', {
      method: 'POST',
      body: JSON.stringify({ entityId: 'ent-1', reason: 'Nettoyage cosmique' }),
    });

    const response = await POST(req, { params: Promise.resolve({}) });
    const json = await response.json();

    // 🕊️ La route répond désormais en 202 Accepted (asynchrone)
    expect(response.status).toBe(202);
    expect(json.success).toBe(true);
    expect(json.message).toContain("abysses");

    // ⏳ Vérification que l'ordre a bien été enfilé dans la base NoSQL
    expect(SystemPurgeJobModel.create).toHaveBeenCalledWith({
      entityId: 'ent-1',
      reason: 'Nettoyage cosmique',
      actorUid: 'u-123',
      capabilities: ['ROLE_SOVEREIGN'],
      status: 'PENDING'
    });
  });
});