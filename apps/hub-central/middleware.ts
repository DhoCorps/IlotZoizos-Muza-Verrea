// apps/hub-central/middleware.ts
import createMiddleware from 'next-intl/middleware';
import { routing } from './navigation';
import { withAuth } from "next-auth/middleware";
import { NextResponse } from 'next/server';

// 1. Initialisation du middleware i18n
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

    // 3. 🛡️ Pages d'authentification strictes (définies en amont pour le refuge nocturne)
    const strictPublicPages = [
      '/auth/login', 
      '/auth/register',
      '/auth/forgot-password', 
      '/auth/reset-password'    
    ];
    // Vérification si le chemin actuel inclut une page d'authentification
    const isAuthPage = strictPublicPages.some(page => pathname.includes(page));

    // ==========================================
    // 2. 🌙 Gestion de l'Agora (Sanctuaire & Refuge nocturne)
    // ==========================================
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Europe/Paris',
      hour: 'numeric',
      hour12: false,
    });
    const currentHour = parseInt(formatter.format(now), 10);
    
    const isSleepingTime = currentHour >= 0 && currentHour < 6;
    const isAgoraPage = pathname.includes('/agora');

    // Règle du refuge : Si c'est l'heure de sommeil, hors de l'Agora ET hors pages de login
    if (isSleepingTime && !isAgoraPage && !isAuthPage) {
      return NextResponse.redirect(new URL(`/${currentLocale}/agora`, req.url));
    }

    // 4. Espaces publics autorisés à la volée (avec correction pour les pages d'auth sans locale)
    const publicPathnameRegex = RegExp(
      `^(/(${locales.join('|')}))?/(abyss-blog|partita|letr-in|le-bordel-de-dho|marchand|marketplace|ecommerce|agora)(/.*)?$`,
      'i'
    );
    
    const isOtherPublicPage = publicPathnameRegex.test(pathname);
    // La page est publique si elle est dans la liste d'auth OU dans la liste des autres pages autorisées
    const isPublicPage = isAuthPage || isOtherPublicPage;

    // --- LOGIQUE DE CIRCULATION ---

    // A. L'étranger tente d'entrer dans un espace non public sans aura
    if (!isAuth && !isPublicPage) {
      return NextResponse.redirect(new URL(`/${currentLocale}/auth/login`, req.url));
    }

    // B. (Supprimée pour éviter le piège du token fantôme : l'accès aux pages d'auth 
    // est désormais toujours autorisé, permettant à l'Oiseau de se ré-identifier ou de purger un ancien cookie).

    // C. Résonance Multilingue (indispensable pour que Next-Intl traite les routes)
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