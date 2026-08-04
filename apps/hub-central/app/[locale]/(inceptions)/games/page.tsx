import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
// On importe le composant Nexus que l'on a créé précédemment.
// Assure-toi que le chemin correspond bien à l'emplacement de ton dossier components.
import GameNexus from '../../../../components/games/GameNexus'; 

export default async function GamesNexusPage({
  params: { locale }
}: {
  params: { locale: string }
}) {
  // 1. Récupération de l'Aura (Session) de l'Oiseau
  const session = await getServerSession();

  // 2. Sécurité : Si un oiseau fantôme arrive ici (bien que le middleware veille), on le renvoie
  if (!session || !session.user) {
    redirect(`/${locale}/auth/login`);
  }

  // 3. Extraction du nom d'utilisateur (fallback de sécurité au cas où)
  const username = session.user.name || 'Explorateur Anonyme';

  // 4. Invocation du Nexus Client
  return (
    <GameNexus username={username} />
  );
}