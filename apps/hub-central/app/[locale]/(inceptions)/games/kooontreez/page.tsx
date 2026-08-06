// apps/hub-central/app/[locale]/kooontreez/page.tsx
import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import KoOonTreezGameClient from '../../../../../components/games/kooontreez/KoOonTreeZGameClient';

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
  // Tu peux récupérer d'éventuels paramètres d'URL si besoin (ex: mode d'apprentissage actif par défaut)
  const isLearningMode = resolvedSearchParams.room !== 'competitive';

  return (
    <div className="min-h-screen bg-slate-950 py-8 px-4 flex flex-col justify-center">
      <KoOonTreezGameClient username={username} isLearningMode={isLearningMode} />
    </div>
  );
}