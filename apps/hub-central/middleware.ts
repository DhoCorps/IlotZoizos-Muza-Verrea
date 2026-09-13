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

    // 3. 🛡️ Pages d'authentification strictes
    const strictPublicPages = [
      '/auth/login', 
      '/auth/register',
      '/auth/forgot-password', 
      '/auth/reset-password'    
    ];
    const isAuthPage = strictPublicPages.some(page => pathname.includes(page));

    // ==========================================
    // 2. 🌙 Gestion de l'Agora (Refuge Nocturne Glissant par Fuseau Horaire)
    // ==========================================
    const isAgoraPage = pathname.includes('/agora');

    if (!isAgoraPage && !isAuthPage) {
      // Récupération dynamique du fuseau horaire de l'Oiseau (stocké dans un cookie ou en-tête, ex: 'Europe/Paris', 'America/New_York'...)
      // Si aucun cookie n'est présent, on tente de deviner via les headers ou on applique un repli universel sur UTC
      const clientTimezone = req.cookies.get('ilot_timezone')?.value || 
                             req.headers.get('x-vercel-ip-timezone') || 
                             'UTC';

      try {
        const userLocalHourStr = new Date().toLocaleString('en-US', { 
          timeZone: clientTimezone, 
          hour: 'numeric', 
          hour12: false 
        });
        const currentHour = parseInt(userLocalHourStr, 10);
        
        // Le refuge nocturne s'active entre 00:00 et 06:00 heure locale de l'Oiseau
        const isSleepingTime = currentHour >= 0 && currentHour < 6;

        if (isSleepingTime) {
          return NextResponse.redirect(new URL(`/${currentLocale}/agora`, req.url));
        }
      } catch (err) {
        // En cas de fuseau horaire corrompu ou invalide, repli de sécurité sur UTC
        const utcHour = new Date().getUTCHours();
        if (utcHour >= 0 && utcHour < 6) {
          return NextResponse.redirect(new URL(`/${currentLocale}/agora`, req.url));
        }
      }
    }

    // 4. Espaces publics autorisés par préfixes stricts
    const publicPrefixes = [
      '/abyss-blog', 
      '/partita', 
      '/letr-in', 
      '/le-bordel-de-dho', 
      '/marchand', 
      '/marketplace', 
      '/ecommerce', 
      '/agora'
    ];

    const isOtherPublicPage = pathname === `/${currentLocale}` || publicPrefixes.some(prefix => {
      const fullPrefix = `/${currentLocale}${prefix}`;
      return pathname === fullPrefix || pathname.startsWith(`${fullPrefix}/`);
    });

    const isPublicPage = isAuthPage || isOtherPublicPage;

    // --- LOGIQUE DE CIRCULATION ---
    if (!isAuth && !isPublicPage) {
      return NextResponse.redirect(new URL(`/${currentLocale}/auth/login`, req.url));
    }

    // Résonance Multilingue
    return intlMiddleware(req as any);
  },
  {
    callbacks: {
      authorized: () => true 
    }
  }
);

export const config = {
  // 🌟 MATCHER OPTIMISÉ : Exclut totalement les assets, images, favicons et routes statiques du middleware
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|images|icons|fonts|.*\\..*).*)']
};