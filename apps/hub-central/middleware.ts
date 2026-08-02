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

    // 1. 🛡️ DÉTECTION ROBUSTE : Pages d'auth strictes et Espace Public
    const strictPublicPages = [
      '/auth/login', 
      '/auth/register',
      '/auth/forgot-password', // 👈 On autorise l'accès au formulaire d'oubli
      '/auth/reset-password'   // 👈 On autorise l'accès au lien reçu par email
    ];
    
    // Regex matche les pages d'auth OU n'importe quelle sous-route de /abyss-blog
    const publicPathnameRegex = RegExp(
      `^(/(${locales.join('|')}))?(${strictPublicPages.join('|')})/?$|^(/(${locales.join('|')}))?/abyss-blog(/.*)?$`,
      'i'
    );
    const isPublicPage = publicPathnameRegex.test(pathname);
    const isAuthPage = strictPublicPages.some(page => pathname.includes(page));

    // 2. EXTRACTION DE LA LOCALE
    const pathnameHasLocale = locales.some(l => pathname.startsWith(`/${l}/`) || pathname === `/${l}`);
    const currentLocale = pathnameHasLocale ? pathname.split('/')[1] : defaultLocale;

    // --- LOGIQUE DE CIRCULATION ---

    // A. L'étranger tente d'entrer dans le Sanctuaire protégé sans aura
    if (!isAuth && !isPublicPage) {
      // Redirection vers le login de la locale actuelle
      return NextResponse.redirect(new URL(`/${currentLocale}/auth/login`, req.url));
    }

    // B. L'Oiseau identifié tente de revenir sur une page d'auth
    if (isAuth && isAuthPage) {
      // On le ramène à la racine de sa fréquence
      return NextResponse.redirect(new URL(`/${currentLocale}/`, req.url));
    }

    // C. Résonance Multilingue
    return intlMiddleware(req);
  },
  {
    callbacks: {
      authorized: () => true 
    }
  }
);

export const config = {
  // 🛡️ MATCHER TOTAL
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)']
};