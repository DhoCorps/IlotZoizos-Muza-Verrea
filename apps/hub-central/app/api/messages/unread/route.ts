export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { MessageModel } from '@ilot/infrastructure';
import { unstable_cache } from 'next/cache';
import { withAura, OiseauUser, ApiContext } from '@/lib/api-guards';

// 🧠 CACHE SÉCURISÉ : Cache court (10s) tagué par utilisateur, avec bypass automatique en mode test
async function getCachedUnreadCount(userSlug: string) {
  const fetcher = async () => {
    return await MessageModel.countDocuments({
      senderSlug: { $ne: userSlug },
      "readBy.userSlug": { $ne: userSlug }
    });
  };

  if (process.env.NODE_ENV === 'test') {
    return await fetcher();
  }

  return await unstable_cache(
    fetcher,
    [`unread-count-${userSlug}`],
    { revalidate: 10, tags: ['messages', `unread-${userSlug}`] }
  )();
}

// ==========================================
// 🔍 GET : Compter les murmures non lus (Strictement Privé / Aura)
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
    console.error("🌊 [UNREAD COUNT ERROR] :", error);
    return NextResponse.json({ error: "Erreur de comptage des murmures." }, { status: 500 });
  }
});