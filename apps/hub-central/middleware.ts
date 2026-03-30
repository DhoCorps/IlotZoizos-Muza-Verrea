import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

const locales = ['fr', 'en'];
const defaultLocale = 'fr'; 

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl;

    // 1. Analyse de la trajectoire : présence d'une locale ?
    const pathnameHasLocale = locales.some(
      (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
    );

    // 2. Redirection si pas de locale (ex: /dashboard -> /fr/dashboard)
    if (!pathnameHasLocale) {
      return NextResponse.redirect(
        new URL(`/${defaultLocale}${pathname}`, req.url)
      );
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ req, token }) => {
        const { pathname } = req.nextUrl;
        
        // ACCÈS PUBLIC : On autorise la racine et les pages d'accueil localisées
        const isPublicPage = pathname === '/' || locales.some(l => pathname === `/${l}`);
        if (isPublicPage) return true;

        // Pour tous les autres secteurs (Dashboard, Teams, Tom-Hat-Toes), token requis.
        return !!token;
      },
    },
    pages: {
      // Point d'entrée pour les oiseaux non identifiés
      signIn: `/${defaultLocale}/auth/login`, 
    },
  }
);

export const config = {
  matcher: [
    /*
     * 1. La Racine : indispensable pour que le middleware intercepte l'arrivée 
     * d'un oiseau et le redirige vers /fr ou /en.
     */
    "/",

    /*
     * 2. Les Secteurs Dashboard :
     * On ne met que "/dashboard/:path*" car cela couvre automatiquement 
     * /dashboard/projects, /dashboard/teams et leurs sous-dossiers [projectId], etc.
     */
    "/dashboard/:path*",
    "/:locale(fr|en)/dashboard/:path*",

    /*
     * 3. Les Inceptions (Hors Dashboard) :
     * Tom-Hat-Toes est à la racine dans ton dossier (inceptions).
     */
    "/tom-hat-toes/:path*",
    "/:locale(fr|en)/tom-hat-toes/:path*",

    /*
     * EXCLUSIONS CRUCIALES :
     * On évite de matcher les fichiers statiques (images, favicon) et les routes API 
     * pour ne pas créer de boucles de redirection infinies sur les données brutes.
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};