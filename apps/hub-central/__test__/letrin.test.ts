// apps/hub-central/__test__/api/letrin.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextResponse } from 'next/server';

// Simulation de la route API Letr'In
export async function GET() {
  const letters = [
    { uid: 'lettre-001', title: 'Abyss Sans', format: 'WOFF2' }
  ];
  return NextResponse.json(letters, { status: 200 });
}

export async function POST(req: Request) {
  const body = await req.json();
  if (!body.title) {
    return NextResponse.json({ error: "Titre requis" }, { status: 400 });
  }
  return NextResponse.json({ success: true, letter: body }, { status: 201 });
}

describe('API Letr\'In (/api/letrin)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('🟢 doit recenser toutes les typographies et publications', async () => {
    const res = await GET();
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(Array.isArray(data)).toBe(true);
    expect(data[0].title).toBe('Abyss Sans');
  });

  it('🟢 doit permettre de sceller une nouvelle police ou édition', async () => {
    const req = new Request('http://localhost/api/letrin', {
      method: 'POST',
      body: JSON.stringify({ uid: 'lettre-100', title: 'Serif Noir', format: 'OTF' })
    });
    const res = await POST(req);
    const data = await res.json();
    expect(res.status).toBe(201);
    expect(data.success).toBe(true);
    expect(data.letter.title).toBe('Serif Noir');
  });

  it('🔴 doit rejeter une publication sans titre', async () => {
    const req = new Request('http://localhost/api/letrin', {
      method: 'POST',
      body: JSON.stringify({ format: 'OTF' })
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});