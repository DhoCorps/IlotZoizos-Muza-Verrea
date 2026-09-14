import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST, DELETE } from '@/app/api/kontakt/templates/[slug]/upload/route';
import { storageService } from '@/modules/storage/storage.service';
import { NextResponse, NextRequest } from 'next/server';

// -------------------------------------------------------------------------
// 🎭 MOCKS MINIMAUX ET PRÉCIS
// -------------------------------------------------------------------------
vi.mock('@/lib/api-guards', () => ({
  withAura: (handler: any) => async (req: any, context: any) => {
    const mockUser = global.__mockUser;
    if (!mockUser || !mockUser.uid) return NextResponse.json({ error: 'Accès non autorisé.' }, { status: 401 });
    return await handler(req, context, mockUser);
  },
}));

vi.mock('@/modules/security/rateLimiter', () => ({
  checkRateLimit: vi.fn().mockResolvedValue({ allowed: true }),
}));

vi.mock('@/lib/slugify', () => ({
  slugify: vi.fn((val) => val?.toLowerCase().trim().replace(/\s+/g, '-') || ''),
}));

declare global { var __mockUser: any; }

describe('POST /api/kontakt/templates/[slug]/upload avec Sceau SHA-256', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete (global as any).__mockUser;

    // 🛡️ Espionnage du Service de Stockage
    vi.spyOn(storageService, 'generateKey').mockReturnValue('mock-key');
    vi.spyOn(storageService, 'uploadFile').mockResolvedValue({
      success: true,
      publicUrl: 'https://cdn.ilot/doc.pdf',
      key: 'mock-key',
    } as any);
    vi.spyOn(storageService, 'extractKeyFromUrl').mockReturnValue('mock-key');
    vi.spyOn(storageService, 'deleteFile').mockResolvedValue({ success: true } as any);
  });

  it('doit réussir (201) l\'upload d\'un template, forger le Sceau SHA-256 et retourner les métadonnées', async () => {
    global.__mockUser = { uid: 'u-123' };

    const formData = new FormData();
    formData.append('file', new Blob(['content'], { type: 'image/jpeg' }), 'test.jpg');

    const req = {
      headers: { get: () => '127.0.0.1' },
      formData: async () => formData,
    } as unknown as NextRequest;

    const res = await POST(req, { params: Promise.resolve({ slug: 'mon-template' }) });
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json.success).toBe(true);
    expect(json.data.url).toBe('https://cdn.ilot/doc.pdf');
    expect(json.data.digitalSignature).toBeDefined();
    expect(typeof json.data.digitalSignature).toBe('string');
    expect(json.data.digitalSignature.length).toBe(64); // Validation de l'empreinte SHA-256
  });

  it('DELETE - doit réussir (200) la purge', async () => {
    global.__mockUser = { uid: 'u-123' };

    const req = new Request('http://localhost/api/kontakt/templates/mon-template/upload?url=https://cdn.ilot/doc.pdf', {
      method: 'DELETE',
    }) as unknown as NextRequest;

    const res = await DELETE(req, { params: Promise.resolve({ slug: 'mon-template' }) });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(storageService.deleteFile).toHaveBeenCalledWith('mock-key');
  });
});