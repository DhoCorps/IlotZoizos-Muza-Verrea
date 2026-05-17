// apps/hub-central/middleware.ts
import createMiddleware from 'next-intl/middleware';
import { locales, localePrefix, defaultLocale } from './i18n';
import { withAuth } from "next-auth/middleware";
import { NextResponse } from 'next/server';

const intlMiddleware = createMiddleware({
  locales,
  defaultLocale,
  localePrefix,
});

export default withAuth(
  async function middleware(req) {
    const { pathname } = req.nextUrl;
    const isAuth = !!req.nextauth.token;

    // 1. 🛡️ DÉTECTION ROBUSTE : On utilise une Regex pour inclure les locales
    // Cette regex matche /auth/login, /fr/auth/login, /en/auth/login, etc.
    const publicPages = ['/auth/login', '/auth/register'];
    const publicPathnameRegex = RegExp(
      `^(/(${locales.join('|')}))?(${publicPages.join('|')})/?$`,
      'i'
    );
    const isPublicPage = publicPathnameRegex.test(pathname);

    // 2. EXTRACTION DE LA LOCALE (Pour les redirections propres)
    const pathnameHasLocale = locales.some(l => pathname.startsWith(`/${l}/`) || pathname === `/${l}`);
    const currentLocale = pathnameHasLocale ? pathname.split('/')[1] : defaultLocale;

    // --- LOGIQUE DE CIRCULATION ---

    // A. L'étranger tente d'entrer dans le Sanctuaire sans aura
    if (!isAuth && !isPublicPage) {
      // Redirection vers le login de la locale actuelle
      return NextResponse.redirect(new URL(`/${currentLocale}/auth/login`, req.url));
    }

    // B. L'Oiseau identifié tente de revenir sur une page d'auth (le simulacre)
    if (isAuth && isPublicPage) {
      // On le ramène à la racine de sa fréquence
      return NextResponse.redirect(new URL(`/${currentLocale}/`, req.url));
    }

    // C. Résonance Multilingue : intl prend le relais pour le reste
    return intlMiddleware(req);
  },
  {
    callbacks: {
      // On délègue la décision à la fonction middleware ci-dessus
      authorized: () => true 
    }
  }
);

export const config = {
  // 🛡️ MATCHER TOTAL : On protège tout sauf le moteur interne et les fichiers statiques
  // La regex exclut l'API, les fichiers statiques Next, et tout fichier avec une extension (images, etc.)
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)']
};