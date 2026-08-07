// apps/hub-central/app/[locale]/games/leaderboard/page.tsx
import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import Leaderboard from '@/components/games/LeaderBoard';
import Link from 'next/link';

export default async function LeaderboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const session = await getServerSession();
  const { locale } = await params;

  if (!session || !session.user) {
    redirect(`/${locale}/auth/login`);
  }

  return (
    <div className="min-h-screen bg-[#05070A] text-slate-200 py-8 px-4">
      <div className="max-w-4xl mx-auto mb-6">
        <Link 
          href={`/${locale}/games/nexus`}
          className="inline-flex items-center gap-2 text-slate-400 hover:text-white bg-slate-800 px-4 py-2 rounded-lg text-sm transition-colors border border-slate-700"
        >
          <span>← Retour au Nexus des Jeux</span>
        </Link>
      </div>

      <Leaderboard />
    </div>
  );
}