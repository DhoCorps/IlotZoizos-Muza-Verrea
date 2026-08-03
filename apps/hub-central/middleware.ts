// apps/hub-central/middleware.ts
import createMiddleware from 'next-intl/middleware';
import { routing } from './navigation';
import { withAuth } from "next-auth/middleware";
import { NextResponse } from 'next/server';

const intlMiddleware = createMiddleware(routing);

export default withAuth(
  async function middleware(req) {
    const { pathname } = req.nextUrl;
    const isAuth = !!req.nextauth.token;

    const locales = routing.locales;
    const defaultLocale = routing.defaultLocale;

    // 1. Extraction de la locale active en amont
    const pathnameHasLocale = locales.some(l => pathname.startsWith(`/${l}/`) || pathname === `/${l}`);
    const currentLocale = pathnameHasLocale ? pathname.split('/')[1] : defaultLocale;

    // 2. 🌙 L'Agora : Sanctuaire permanent mais imposé comme refuge de minuit à 6h
    const now = new Date();
    const currentHour = now.getHours(); // 0 à 23
    const isSleepingTime = currentHour >= 0 && currentHour < 6;
    const isAgoraPage = pathname.includes('/agora');

    if (isSleepingTime && !isAgoraPage) {
      return NextResponse.redirect(new URL(`/${currentLocale}/agora`, req.url));
    }

    // 3. 🛡️ Pages d'authentification strictes
    const strictPublicPages = [
      '/auth/login', 
      '/auth/register',
      '/auth/forgot-password', 
      '/auth/reset-password'    
    ];
    
    // 4. Espaces publics autorisés à la volée (Agora incluse, accessible à tout moment)
    const publicPathnameRegex = RegExp(
      `^(/(${locales.join('|')}))?(${strictPublicPages.join('|')})/?$|^(/(${locales.join('|')}))?/(abyss-blog|partita|letr-in|le-bordel-de-dho|marchand|marketplace|ecommerce|agora)(/.*)?$`,
      'i'
    );
    
    const isPublicPage = publicPathnameRegex.test(pathname);
    const isAuthPage = strictPublicPages.some(page => pathname.includes(page));

    // --- LOGIQUE DE CIRCULATION ---

    // A. L'étranger tente d'entrer dans un espace non public sans aura
    if (!isAuth && !isPublicPage) {
      return NextResponse.redirect(new URL(`/${currentLocale}/auth/login`, req.url));
    }

    // B. L'Oiseau identifié tente de revenir sur une page d'auth
    if (isAuth && isAuthPage) {
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
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)']
};