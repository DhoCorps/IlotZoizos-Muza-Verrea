import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../lib/auth';
import { redirect } from 'next/navigation';
import { ModerationTower } from '../../../../components/dashboard/ModerationTower';

export default async function ModerationPage() {
    const session = await getServerSession(authOptions);
    
    // Vérification de sécurité absolue
    if (!session?.user) {
        redirect('/auth/login');
    }

    // Optionnel : vérifier si l'oiseau a le rôle "Modérateur" ou "Admin" ici plus tard
    
    return <ModerationTower />;
}