// apps/hub-central/app/[locale]/(inceptions)/games/crazymorpion/[slug]/page.tsx
import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import CrazyMorpionClient from '@/components/games/crazymorpion/CrazyMorpionClient';

export default async function CrazyMorpionRoomPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const session = await getServerSession();
  const { locale, slug } = await params;

  if (!session || !session.user) {
    redirect(`/${locale}/auth/login`);
  }

  const username = session.user.name || 'Oiseau Anonyme';
  const roomId = slug; // Le slug de l'URL correspond directement à l'ID du salon

  return (
    <main className="min-h-screen bg-[#05070A] p-6 flex flex-col items-center justify-center">
      <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400 mb-6 font-mono tracking-wider">
        CRAZY MORPION ❌⭕
      </h1>
      <CrazyMorpionClient roomId={roomId} username={username} />
    </main>
  );
}