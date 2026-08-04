import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import CrazyMorpionLobbyOrRoom from '../../../../../components/games/crazymorpion/CrazyMorpionLobbyOrRoom';

export default async function CrazyMorpionPage({
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
    <CrazyMorpionLobbyOrRoom username={username} initialRoomId={initialRoomId} />
  );
}