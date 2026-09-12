// Fichier : app/api/salon/unread/route.ts
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { withAura, OiseauUser, ApiContext } from '@/lib/api-guards';
import { getCachedUnreadCount } from '@/lib/cache/messages.cache';

// ==========================================
// GET : Compter les murmures non lus (Strictement Privé / Aura)
// ==========================================
export const GET = withAura(async (_req: NextRequest, _context: ApiContext, currentUser: OiseauUser) => {
  try {
    const userSlug = currentUser.slug || currentUser.uid;
    if (!userSlug) {
      return NextResponse.json({ error: "Oiseau non identifié dans la canopée." }, { status: 400 });
    }

    const unreadCount = await getCachedUnreadCount(userSlug);
    return NextResponse.json({ success: true, unreadCount }, { status: 200 });
  } catch (error: any) {
    console.error("  [UNREAD COUNT ERROR] :", error);
    return NextResponse.json({ error: "Erreur de comptage des murmures." }, { status: 500 });
  }
});