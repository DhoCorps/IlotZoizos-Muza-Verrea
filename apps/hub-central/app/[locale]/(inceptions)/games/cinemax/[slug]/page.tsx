// apps/hub-central/app/[locale]/(inceptions)/games/cinemax/[slug]/page.tsx[cite: 1]
import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import CineMaxRoomClient from '@/components/games/cinemax/CineMaxRoomClient';

export default async function CineMaxRoomPage({
  params,
  searchParams
}: {
  params: Promise<{ locale: string; roomId: string }>;
  searchParams: Promise<{ wager?: string; currency?: string }>;
}) {
  const session = await getServerSession();
  const { locale, roomId } = await params;
  const resolvedSearchParams = await searchParams;

  if (!session || !session.user) {
    redirect(`/${locale}/auth/login`);
  }

  const username = session.user.name || 'Oiseau Anonyme';
  const playerId = session.user.email || username; // Identifiant unique pour le socket

  return (
    <main className="min-h-screen bg-[#0A0D14] p-6 flex flex-col items-center justify-center w-full">
      <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400 mb-6 font-mono tracking-wider">
        CINÉ-QUIZZ-CINÉ-MAX 🎬
      </h1>
      <CineMaxRoomClient roomId={roomId} username={username} playerId={playerId} />
    </main>
  );
}