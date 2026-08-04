import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import SoonArtLobbyOrRoom from '../../../../../components/games/soonart/SoonArtLobbyOrRoom';

export default async function SoonArtPage({
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
    <SoonArtLobbyOrRoom username={username} initialRoomId={initialRoomId} />
  );
}