import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import PlumZeeLobbyOrRoom from '../../../../../components/games/plumzee/PlumZeeLobbyOrRoom';

export default async function PlumZeePage({
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
    <PlumZeeLobbyOrRoom username={username} initialRoomId={initialRoomId} />
  );
}