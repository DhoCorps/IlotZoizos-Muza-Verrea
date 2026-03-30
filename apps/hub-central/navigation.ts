import { createSharedPathnamesNavigation } from 'next-intl/navigation';

// Définis ici toutes les langues que l'Îlot va supporter
export const locales = ['fr', 'en'] as const; 

// On génère nos outils de navigation magiques
export const { Link, redirect, usePathname, useRouter } = createSharedPathnamesNavigation({ locales });