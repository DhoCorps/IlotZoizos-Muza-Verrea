// apps/hub-central/app/[locale]/(inceptions)/games/nexus/page.tsx
import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import GameNexus from '../../../../../components/games/GameNexus';

export default async function GameNexusPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const session = await getServerSession();
  const { locale } = await params;

  if (!session || !session.user) {
    redirect(`/${locale}/auth/login`);
  }

  const username = session.user.name || 'Oiseau Anonyme';

  return (
    <main className="min-h-screen bg-[#05070A]">
      <GameNexus username={username} locale={locale} />
    </main>
  );
}