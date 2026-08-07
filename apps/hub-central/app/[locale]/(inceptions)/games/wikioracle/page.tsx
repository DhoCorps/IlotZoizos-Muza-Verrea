// apps/hub-central/app/[locale]/games/wikioracle/page.tsx
import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import WikiOracleLobbyOrRoom from '@/components/games/wikioracle/WikiOracleLobbyOrRoom';

export default async function WikiOraclePage({
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
  const initialRoomId = resolvedSearchParams.room || 'default-room';

  return (
    <WikiOracleLobbyOrRoom username={username} initialRoomId={initialRoomId} />
  );
}