import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import SoonArtLobbyOrRoom from '@/components/games/soonart/SoonArtLobbyOrRoom';

export default async function SoonArtPage({
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
    <SoonArtLobbyOrRoom username={username} initialRoomId={initialRoomId} />
  );
}