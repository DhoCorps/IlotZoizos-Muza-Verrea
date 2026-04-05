import createMiddleware from 'next-intl/middleware';
import { locales, localePrefix, defaultLocale } from './i18n';
import { withAuth } from "next-auth/middleware";
import { NextResponse } from 'next/server';

// Middleware d'Internationalization
const intlMiddleware = createMiddleware({
  locales,
  defaultLocale,
  localePrefix,
});

export default withAuth(
  async function middleware(req) {
    const { pathname } = req.nextUrl;
    const isAuth = !!req.nextauth.token;

    // 1. Détection de la zone publique (Login, Register, etc.)
    // On vérifie si le chemin contient '/auth/' pour ne pas exiger d'auth sur ces pages
    const isPublicPage = pathname.includes('/auth/');

    // Suture de l'v1.3.1 : Vérification de la locale dans l'URL
    const pathnameHasLocale = locales.some(
      (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
    );

    // 2. LA BRÈCHE CORRIGÉE :
    // Si un Zoizo n'est pas identifié ET qu'il n'est pas déjà sur une page publique
    if (!isAuth && !isPublicPage) {
      const currentLocale = pathnameHasLocale ? pathname.split('/')[1] : defaultLocale;
      return NextResponse.redirect(new URL(`/${currentLocale}/auth/login`, req.url));
    }

    // Gérer les redirections basées sur la locale si absente
    if (!pathnameHasLocale && !pathname.includes('.')) {
      return NextResponse.redirect(
        new URL(`/${defaultLocale}${pathname.startsWith('/') ? '' : '/'}${pathname}`, req.url)
      );
    }

    // 3. Application du middleware d'internationalisation
    return intlMiddleware(req);
  },
  {
    callbacks: {
      authorized: () => true, // On garde le contrôle manuel dans la fonction ci-dessus
    },
  }
);

export const config = {
  // Suture de l'v1.3.1 : Matcher purifié pour les fichiers statiques
  matcher: ['/((?!api|favicon.ico|.*\\..*|_next/static|_next/image).*)']
};