// apps/hub-central/app/[locale]/(inceptions)/games/atomikkfarde/[slug]/page.tsx (ou selon ton arborescence)
import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import AtomikClient from '@/components/games/atomik-k-far/AtomikKFarClient';

export default async function AtomikRoomPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const session = await getServerSession();
  const { locale, slug } = await params;

  if (!session || !session.user) {
    redirect(`/${locale}/auth/login`);
  }

  const username = session.user.name || 'Artilleur Anonyme';
  const roomId = slug; // Le slug de l'URL correspond directement à l'ID de la room

  return (
    <main className="min-h-screen bg-[#05070A] p-6 flex flex-col items-center justify-center">
      <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-red-400 mb-6 font-mono tracking-wider">
        ATOMI-K-FARD(E) ☢️
      </h1>
      <AtomikClient roomId={roomId} username={username} />
    </main>
  );
}