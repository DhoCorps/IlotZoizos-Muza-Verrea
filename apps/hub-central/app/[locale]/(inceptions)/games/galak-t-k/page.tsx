import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import GalakTKLobbyOrRoom from '../../../../../components/games/galak-t-k/GalakTKLobbyOrRoom';

export default async function GalakTKPage({
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
    <GalakTKLobbyOrRoom username={username} initialRoomId={initialRoomId} />
  );
}