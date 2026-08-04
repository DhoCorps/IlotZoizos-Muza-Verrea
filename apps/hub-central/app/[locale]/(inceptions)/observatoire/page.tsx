// apps/hub-central/app/[locale]/observatoire/page.tsx
import React from 'react';
import { ObservatoryContainer } from '../../../../components/observatory/ObservatoryContainer';
// Si tu utilises NextAuth pour récupérer l'utilisateur connecté :
// import { getServerSession } from 'next-auth';
// import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export const dynamic = 'force-dynamic';

export default async function ObservatoirePage({ params }: { params: { locale: string } }) {
    // 1. Récupération de la session de l'Oiseau souverain
    // const session = await getServerSession(authOptions);
    // const userId = session?.user?.id || "64a5f2e8b... (ID de test par défaut)";

    // 🛡️ Pour l'instant, on pose un ID de test ou issu de la session
    const mockUserId = "id_de_test_oiseau"; 

    return (
        <main className="min-h-screen bg-[#11161d] text-slate-100 p-6 md:p-12">
            <div className="max-w-4xl mx-auto">
                <header className="mb-8 border-b border-slate-800 pb-4">
                    <h1 className="text-3xl font-extrabold tracking-wider text-slate-100">
                        Observatoire des Fréquences
                    </h1>
                    <p className="text-sm text-slate-400 mt-1">
                        Sanctuaire métaphysique et lecture vibratoire de l'Îlot Zoizos.
                    </p>
                </header>

                {/* Le conteneur client qui va ausculter l'API */}
                <ObservatoryContainer userId={mockUserId} />
            </div>
        </main>
    );
}