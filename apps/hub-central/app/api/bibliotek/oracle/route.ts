export const dynamic = 'force-dynamic';

import { NextResponse, NextRequest } from 'next/server';
import { withOptionalAura, OiseauUser, ApiContext, handleRouteError } from '@/lib/api-guards';
import { getCachedBookBySignature } from '@/lib/cache/bibliotek.cache';

// ==========================================
// GET : L'Oracle du Sceau (Vérification Publique d'Antériorité par SHA-256)
// ==========================================
export const GET = withOptionalAura(async (req: NextRequest, _context: ApiContext, _currentUser?: OiseauUser) => {
  try {
    let url: URL;
    try {
      url = new URL(req.url);
    } catch {
      return NextResponse.json({ success: false, error: "URL de requête invalide." }, { status: 400 });
    }

    const signature = url.searchParams.get('signature') || url.searchParams.get('hash');

    if (!signature || signature.trim().length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: "Veuillez fournir un sceau cryptographique (signature SHA-256) valide à ausculter." 
      }, { status: 400 });
    }

    // 🔍 Recherche de l'ouvrage via le système de cache de l'Oracle
    const book = await getCachedBookBySignature(signature.trim());

    if (!book) {
      return NextResponse.json({ 
        success: false, 
        verified: false,
        error: "Aucun ouvrage ne correspond à ce sceau dans le Sanctuaire. Antériorité non certifiée." 
      }, { status: 404 });
    }

    const safeBook = JSON.parse(JSON.stringify(book));

    return NextResponse.json({
      success: true,
      verified: true,
      message: "Sceau SHA-256 authentifié avec succès dans la matrice.",
      data: {
        uid: safeBook.uid,
        title: safeBook.title,
        authorSlug: safeBook.authorSlug,
        writingType: safeBook.writingType,
        style: safeBook.style,
        digitalSignature: safeBook.digitalSignature,
        timestampedAt: safeBook.timestampedAt,
        createdAt: safeBook.createdAt,
      }
    }, { status: 200 });

  } catch (error: unknown) {
    return handleRouteError(error, "Erreur interne lors de la consultation de l'Oracle.");
  }
});