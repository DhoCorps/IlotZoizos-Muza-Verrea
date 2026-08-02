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
    '/abyss-blog/[slug]': '/abyss-blog/[slug]',
    '/partita': '/partita',
    '/partita/[slug]': '/partita/[slug]',
    '/letr-in': '/letr-in',
    '/kontakt': '/kontakt',
    '/tom-hat-toes': '/tom-hat-toes',
    // 🪡 Ajout de toutes les routes du Dashboard utilisées dans la NavBar
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
    '/auth/forgot-password': '/auth/forgot-password'
  }
});

export const { Link, redirect, usePathname, useRouter } = createNavigation(routing);