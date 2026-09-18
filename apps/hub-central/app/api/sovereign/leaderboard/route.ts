export const dynamic = 'force-dynamic';

import { NextResponse, NextRequest } from 'next/server';
import { OiseauModel } from '@ilot/infrastructure';
import { unstable_cache } from 'next/cache';
import { withSilice, ApiContext, handleRouteError } from '@/lib/api-guards';

// 🧠 CACHE : Récupération du Hall of Fame (Leaderboard de la Canopée)
const getCachedLeaderboard = () => {
  return unstable_cache(
    async () => {
      return await OiseauModel.find({
        profileStatus: 'RESPECTABLE',
        isBanned: { $ne: true }
      })
        .sort({ ifvScore: -1 })
        .limit(20)
        .select('uid pseudo avatarUrl ifvScore profileStatus')
        .lean();
    },
    ['sovereign-leaderboard'],
    { revalidate: 300, tags: ['users', 'leaderboard'] }
  )();
};

// ==========================================
// 🏆 GET : Le Hall of Fame (Leaderboard - Public / Silice)
// ==========================================
export const GET = withSilice(async (_req: NextRequest, _context: ApiContext) => {
  try {
    const leaderboard = await getCachedLeaderboard();

    return NextResponse.json({
      success: true,
      leaderboard
    }, { status: 200 });

  } catch (error: unknown) {
    return handleRouteError(error, 'LEADERBOARD GET ERROR');
  }
});