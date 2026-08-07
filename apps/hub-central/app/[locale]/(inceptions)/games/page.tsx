// apps/hub-central/app/[locale]/wikioracle/page.tsx
import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import WikiOracleGameClient from '@/components/games/wikioracle/WikiOracleGameClient';

export default async function WikiOraclePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const session = await getServerSession();
  const { locale } = await params;

  if (!session || !session.user) {
    redirect(`/${locale}/auth/login`);
  }

  const username = session.user.name || 'Oracle Anonyme';

  return (
    <WikiOracleGameClient username={username} />
  );
}