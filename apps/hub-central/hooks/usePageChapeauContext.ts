// apps/hub-central/hooks/usePageChapeauContext.ts
'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useChapeau } from '@/context/ChapeauContext';

export interface PageContextOptions {
  recipientUid: string;
  recipientPseudo: string;
  targetTitle: string;
  storeUid?: string;
}

/**
 * 🦅 Hook de Détection du Contexte de Page
 * Analyse la route active ou applique les métadonnées de la ressource courante
 * pour associer dynamiquement le propriétaire au Chapeau.
 */
export function usePageChapeauContext(options?: PageContextOptions) {
  const { setChapeauData, resetChapeauData } = useChapeau();
  const pathname = usePathname();

  useEffect(() => {
    if (options && options.recipientUid) {
      // 1. Si la page fournit explicitement son contexte (ex: Fiche produit, Partition, Profil créateur)
      setChapeauData({
        recipientUid: options.recipientUid,
        recipientPseudo: options.recipientPseudo,
        targetTitle: options.targetTitle,
        storeUid: options.storeUid,
      });
    } else if (pathname) {
      // 2. Détection automatique par pattern de route si aucune option explicite n'est passée
      if (pathname.includes('/store/') || pathname.includes('/boutique/')) {
        setChapeauData({
          recipientUid: 'canopy_store_treasury',
          recipientPseudo: 'Boutique de la Canopée',
          targetTitle: 'cette échoppe',
        });
      } else if (pathname.includes('/profile/') || pathname.includes('/user/')) {
        // Extraction basique du slug/uid de l'URL si on est sur un profil
        const segments = pathname.split('/');
        const userSlug = segments[segments.length - 1] || 'créateur';
        setChapeauData({
          recipientUid: `user_${userSlug}`,
          recipientPseudo: `@${userSlug}`,
          targetTitle: 'le nid de cet oiseau',
        });
      } else {
        // Contexte par défaut de l'Îlot
        resetChapeauData();
      }
    }

    return () => {
      // Optionnel : réinitialiser lors du démontage de la page si besoin
    };
  }, [pathname, options, setChapeauData, resetChapeauData]);
}