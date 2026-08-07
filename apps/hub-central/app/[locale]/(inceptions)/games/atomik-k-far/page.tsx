import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import AtomikLobbyOrRoom from '@/components/games/atomik-k-far/AtomikKFarLobbyOrRoom';

export default async function AtomikPage({
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

  const username = session.user.name || 'Artilleur Anonyme';
  const initialRoomId = resolvedSearchParams.room || '';

  return (
    <AtomikLobbyOrRoom username={username} initialRoomId={initialRoomId} />
  );
}