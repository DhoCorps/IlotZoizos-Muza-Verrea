import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import KoOonTreeZLobbyOrRoom from '../../../../../components/games/kooontreez/KoOonTreeZLobbyOrRoom';

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
  const initialRoomId = resolvedSearchParams.room || 'default-room';

  return (
    <KoOonTreeZLobbyOrRoom username={username} initialRoomId={initialRoomId} />
  );
}