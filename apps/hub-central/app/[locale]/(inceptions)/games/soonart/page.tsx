// apps/hub-central/app/[locale]/(inceptions)/games/soonart/[slug]/page.tsx
import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import SoonArtClient from '@/components/games/soonart/SoonArtClient';

export default async function SoonArtRoomPage({
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
  const roomId = slug; // Le slug de l'URL correspond directement à l'ID de la toile/salon

  return (
    <main className="min-h-screen bg-[#05070A] p-6 flex flex-col items-center justify-center">
      <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-rose-400 mb-6 font-mono tracking-wider">
        SOON'ART 🎨
      </h1>
      <SoonArtClient roomId={roomId} username={username} />
    </main>
  );
}