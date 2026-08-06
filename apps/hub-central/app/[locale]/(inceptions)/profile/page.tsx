import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../lib/auth';
import { redirect } from 'next/navigation';
import { BirdProfile } from '../../../../components/profile/BirdProfile';

export default async function ProfilePage() {
    const session = await getServerSession(authOptions);
    
    // Si l'Oiseau n'est pas authentifié, on le redirige vers l'accueil/login
    if (!session?.user) {
        redirect('/auth/login');
    }

    const birdName = session.user.name || "Oiseau Explorateur";

    return <BirdProfile birdName={birdName} />;
}