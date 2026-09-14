// apps/hub-central/app/[locale]/(inceptions)/games/atomikkfarde/[slug]/page.tsx
import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import AtomikClient from '@/components/games/atomik-k-far/AtomikKFarClient';

export default async function AtomikRoomPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<{ wager?: string; currency?: string }>;
}) {
  const session = await getServerSession();
  const { locale, slug } = await params;
  const resolvedSearchParams = await searchParams;

  if (!session || !session.user) {
    redirect(`/${locale}/auth/login`);
  }

  const username = session.user.name || 'Artilleur Anonyme';
  const roomId = slug; // Le slug de l'URL correspond directement à l'ID de la room

  return (
    <main className="min-h-screen bg-[#05070A] p-6 flex flex-col items-center justify-center w-full">
      <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-red-400 mb-6 font-mono tracking-wider">
        ATOMI-K-FARD(E) ☢️
      </h1>
      <AtomikClient roomId={roomId} username={username} />
    </main>
  );
}