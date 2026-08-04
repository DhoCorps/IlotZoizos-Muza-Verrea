import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import KoOonTreeZLobbyOrRoom from '../../../../../components/games/kooontreez/KoOonTreeZLobbyOrRoom';

export default async function KoOonTreeZPage({
  params: { locale },
  searchParams
}: {
  params: { locale: string };
  searchParams: { room?: string };
}) {
  const session = await getServerSession();

  if (!session || !session.user) {
    redirect(`/${locale}/auth/login`);
  }

  const username = session.user.name || 'Oiseau Anonyme';
  const initialRoomId = searchParams.room || 'default-room';

  return (
    <KoOonTreeZLobbyOrRoom username={username} initialRoomId={initialRoomId} />
  );
}