// apps/hub-central/app/[locale]/kooontreez/page.tsx
import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import KoOonTreezGameClient from '@/components/games/kooontreez/KoOonTreeZGameClient';

export default async function KoOonTreeZPage({
  params,
  searchParams
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ room?: string }>;
}) {
  const session = await getServerSession();
  const { locale } = await params;
  const resolvedSearchParams = await searchParams;

  if (!session || !session.user) {
    redirect(`/${locale}/auth/login`);
  }

  const username = session.user.name || 'Oiseau Anonyme';
  const isLearningMode = resolvedSearchParams.room !== 'competitive';

  return (
    <main className="min-h-screen bg-slate-950 py-8 px-4 flex flex-col justify-center">
      <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400 mb-6 text-center font-mono tracking-wider">
        KOÔONTREEZ 🌳
      </h1>
      <KoOonTreezGameClient username={username} isLearningMode={isLearningMode} />
    </main>
  );
}