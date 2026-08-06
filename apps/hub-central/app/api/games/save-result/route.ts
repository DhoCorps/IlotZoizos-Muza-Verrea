// apps/hub-central/app/api/games/save-result/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { GameResultModel } from '@ilot/infrastructure';

export async function POST(req: Request) {
  const session = await getServerSession();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { gameType, score, trophies, maxStreak } = await req.json();

  try {
    // Utilisation de finalScore pour correspondre au schéma MongoDB
    const result = await GameResultModel.create({
      username: session.user.name,
      gameType,
      finalScore: score, // <--- Correction ici
      trophies,
      maxStreak
    });
    return NextResponse.json({ success: true, id: result._id });
  } catch (err) {
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}