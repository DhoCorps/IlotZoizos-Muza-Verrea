// apps/hub-central/lib/slugify.ts

/**
 * Transforme n'importe quelle chaîne de caractères en une URL propre (SEO-friendly).
 * Ex: "La Forge Typographique 2026 !" -> "la-forge-typographique-2026"
 */
export function slugify(text: string): string {
  if (!text) return '';
  
  return text
    .toString()
    .normalize('NFD')                   // Sépare les accents de leurs lettres de base (ex: é -> e + ´)
    .replace(/[\u0300-\u036f]/g, '')    // Supprime les accents
    .toLowerCase()                      // Tout en minuscules
    .trim()                             // Retire les espaces au début et à la fin
    .replace(/\s+/g, '-')               // Remplace les espaces par des tirets
    .replace(/[^\w\-]+/g, '')           // Supprime tous les caractères qui ne sont pas des mots ou des tirets
    .replace(/\-\-+/g, '-');            // Remplace les multiples tirets par un seul tiret
}