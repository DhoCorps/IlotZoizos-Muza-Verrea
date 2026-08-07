import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { ObservatoryContainer } from '@/components/observatory/ObservatoryContainer';

export default async function ObservatoryPage() {
    // Récupérer la session pour identifier l'oiseau
    const session = await getServerSession(authOptions);
    
    // Si l'oiseau n'est pas connecté, on le renvoie à l'accueil
    if (!session?.user) {
        redirect('/auth/login');
    }

    const userId = (session.user as any).slug || (session.user as any).uid;

    return (
        <div className="w-full max-w-4xl">
            <ObservatoryContainer userId={userId} />
        </div>
    );
}