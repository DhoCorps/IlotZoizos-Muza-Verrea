import { defineRouting } from 'next-intl/routing';
import { createNavigation } from 'next-intl/navigation';

// Définition des règles de navigation multilingue de l'Îlot
export const routing = defineRouting({
  locales: ['fr', 'en'], // Les langues supportées
  defaultLocale: 'fr',   // La langue par défaut
  localePrefix: 'always' // Optionnel : 'always' (ex: /fr/auth) ou 'as-needed' (ex: /auth)
});

// On génère nos outils de navigation magiques flambant neufs
export const { Link, redirect, usePathname, useRouter } = createNavigation(routing);