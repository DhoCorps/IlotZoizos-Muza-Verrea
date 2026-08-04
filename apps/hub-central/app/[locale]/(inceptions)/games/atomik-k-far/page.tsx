import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import AtomikLobbyOrRoom from '../../../../../components/games/atomik-k-far/AtomikKFarLobbyOrRoom';

export default async function AtomikPage({
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

  const username = session.user.name || 'Artilleur Anonyme';
  const initialRoomId = searchParams.room || '';

  return (
    <AtomikLobbyOrRoom username={username} initialRoomId={initialRoomId} />
  );
}