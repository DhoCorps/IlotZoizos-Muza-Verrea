// apps/hub-central/i18n.ts
import { defineRouting } from 'next-intl/routing';
import { createNavigation } from 'next-intl/navigation';

export const routing = defineRouting({
  locales: ['fr', 'en'], 
  defaultLocale: 'fr',   
  localePrefix: 'always',
  pathnames: {
    '/': '/',
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
    '/profile': '/profile',
    '/settings': '/settings',
    '/auth/login': '/auth/login',
    '/auth/register': '/auth/register',
    '/auth/forgot-password': '/auth/forgot-password',
    // 🎮 ROUTES DU NEXUS DES JEUX
    '/games': '/games',
    '/games/crazymorpion': '/games/crazymorpion',
    '/games/kooontreez': '/games/kooontreez',
    '/games/atomikkfarde': '/games/atomikkfarde'
  }
});

export const { Link, redirect, usePathname, useRouter } = createNavigation(routing);