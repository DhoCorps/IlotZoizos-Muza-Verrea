// apps/hub-central/app/api/canopy/stats/route.ts
import { NextResponse } from 'next/server';
import { MessageModel } from '@ilot/infrastructure';

export async function GET() {
  try {
    // Récupère la dernière Newsletter de la Canopée (le snapshot global)
    const latestBroadcast = await MessageModel.findOne({ isSystemBroadcast: true })
      .sort({ createdAt: -1 })
      .lean();

    if (!latestBroadcast || !latestBroadcast.metadata?.statsSnapshot) {
      return NextResponse.json({ success: false, message: "Aucun bilan de la canopée disponible pour le moment." }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      yearMonth: latestBroadcast.metadata.statsSnapshot.yearMonth,
      macroTotals: latestBroadcast.metadata.statsSnapshot.macroTotals,
      topSellers: latestBroadcast.metadata.statsSnapshot.topSellers,
      topBuyers: latestBroadcast.metadata.statsSnapshot.topBuyers,
      mostCommented: latestBroadcast.metadata.statsSnapshot.mostCommented,
      mostReactive: latestBroadcast.metadata.statsSnapshot.mostReactive,
      broadcastedAt: latestBroadcast.createdAt
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}