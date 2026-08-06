import { defineRouting } from 'next-intl/routing';
import { createNavigation } from 'next-intl/navigation';

export const routing = defineRouting({
  locales: ['fr', 'en'], 
  defaultLocale: 'fr',   
  localePrefix: 'always',
  pathnames: {
    '/': '/',
    // 💬 Messagerie Universelle de la Canopée
    '/message': '/message',
    '/le-bordel-de-dho': '/le-bordel-de-dho',
    '/abyss-blog': '/abyss-blog',
    '/abyss-blog/editor': '/abyss-blog/editor',
    '/abyss-blog/[slug]': '/abyss-blog/[slug]',
    '/marketplace': '/marketplace',
    '/ecommerce': '/ecommerce',
    '/ecommerce/editor': '/ecommerce/editor',
    '/ecommerce/[slug]': '/ecommerce/[slug]',
    '/partita': '/partita',
    '/partita/[slug]': '/partita/[slug]',
    '/letrinSprite': '/letrinSprite',
    '/kontakt': '/kontakt',
    '/kontakt/cv-editor': '/kontakt/cv-editor',
    '/tom-hat-toes': '/tom-hat-toes',
    // 🔭 Observatoire des Fréquences
    '/observatoire': '/observatoire',
    // 🌌 Salon Privé (E2EE)
    '/salon': '/salon',
    // Routes du Dashboard et des Nids
    '/dashboard': '/dashboard',
    '/dashboard/teams': '/dashboard/teams',
    '/dashboard/flock': '/dashboard/flock',
    '/dashboard/projects': '/dashboard/projects',
    '/dashboard/tasks': '/dashboard/tasks',
    '/dashboard/wellbeing': '/dashboard/wellbeing',
    '/dashboard/moderation': '/dashboard/moderation',
    '/dashboard/settings': '/dashboard/settings',
    // 🪶 Profil de l'Oiseau
    '/profile': '/profile',
    '/settings': '/settings',
    '/auth/login': '/auth/login',
    '/auth/register': '/auth/register',
    '/auth/forgot-password': '/auth/forgot-password',
    // 🎮 ROUTES DU NEXUS DES JEUX
    '/games': '/games',
    '/games/crazymorpion': '/games/crazymorpion',
    '/games/kooontreez': '/games/kooontreez',
    '/games/atomik-k-far': '/games/atomik-k-far',
    '/games/atomik-k-far/[slug]': '/games/atomik-k-far/[slug]',
    // 🎬 ROUTES DE CINÉ-MAX
    '/games/cinemax': '/games/cinemax',
    '/games/cinemax/[slug]': '/games/cinemax/[slug]',
    // 🎨 ROUTES DE SOON'ART
    '/games/soonart': '/games/soonart',
    '/games/soonart/[slug]': '/games/soonart/[slug]',
    // 🚀 ROUTES DE GALAK-T-K
    '/games/galak-t-k': '/games/galak-t-k',
    '/games/galak-t-k/[slug]': '/games/galak-t-k/[slug]',
    // 🎲 ROUTES DE PLUM'ZEE
    '/games/plumzee': '/games/plumzee',
    '/games/plumzee/[slug]': '/games/plumzee/[slug]',
    // 🔮 ROUTES DE L'ORACLE DE WIKIPÉDIA
    '/games/wikioracle': '/games/wikioracle',
    '/games/wikioracle/[slug]': '/games/wikioracle/[slug]'
  }
});

export const { Link, redirect, usePathname, useRouter } = createNavigation(routing);