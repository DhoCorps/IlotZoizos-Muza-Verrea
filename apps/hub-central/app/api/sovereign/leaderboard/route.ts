export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { OiseauModel } from '@ilot/infrastructure';
import { unstable_cache } from 'next/cache';
import { withSilice, ApiContext } from '@/lib/api-guards';

// 🧠 CACHE SÉCURISÉ : Mise en cache du Hall of Fame (60s) avec bypass en mode test
async function getCachedLeaderboard() {
  const fetcher = async () => {
    return await OiseauModel.find({ 
      profileStatus: 'RESPECTABLE',
      isBanned: { $ne: true }
    })
      .sort({ ifvScore: -1, createdAt: 1 })
      .limit(20)
      .select('uid pseudo nickname ifvScore profileStatus avatarUrl createdAt')
      .lean();
  };

  if (process.env.NODE_ENV === 'test') {
    return await fetcher();
  }

  return await unstable_cache(
    fetcher,
    ['sovereign-leaderboard-respectable'],
    { revalidate: 60, tags: ['leaderboard', 'respectable-birds'] }
  )();
}

// ==========================================
// 🏆 GET : Consulter le Hall of Fame de la Canopée (Public / Silice)
// ==========================================
export const GET = withSilice(async (_req: Request, _context: ApiContext) => {
  try {
    const eliteBirds = await getCachedLeaderboard();
    return NextResponse.json({ success: true, leaderboard: eliteBirds }, { status: 200 });

  } catch (error: unknown) {
    const err = error as Error;
    console.error("🔥 [LEADERBOARD GET ERROR] :", err);
    return NextResponse.json({ success: false, error: err.message || "Échec de la lecture du panthéon." }, { status: 500 });
  }
});