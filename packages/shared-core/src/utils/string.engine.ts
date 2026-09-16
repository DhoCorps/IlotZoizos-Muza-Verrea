/**
 * 🔤 Convertit une chaîne de caractères en un slug URL-friendly propre.
 * Gère la suppression des accents, des caractères spéciaux et normalise les espaces.
 */
export function generateSlug(text: string): string {
  if (!text || typeof text !== 'string') {
    return '';
  }

  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/['’]/g, ' ') // L'apostrophe devient un espace
    .replace(/[^\w\s-]/g, '') 
    .replace(/[\s_-]+/g, '-') 
    .replace(/^-+|-+$/g, '');
}