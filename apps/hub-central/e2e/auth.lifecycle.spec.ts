// apps/hub-central/e2e/auth.spec.ts
import { test, expect } from '@playwright/test';

test('Un nouvel oiseau doit pouvoir rejoindre l’Îlot', async ({ page }) => {
  // 🎧 LA BOÎTE NOIRE : On écoute ce que l'API répond lors de la soumission
  page.on('response', async (response) => {
    if (response.url().includes('/api/auth/register')) {
      console.log(`[API Register] Statut: ${response.status()}`);
      try {
        const body = await response.json();
        console.log(`[API Register] Réponse:`, body);
      } catch (e) {
        console.log(`[API Register] Pas de JSON retourné.`);
      }
    }
  });

  await page.goto('/fr/auth/register');
  
  const uniqueId = Date.now();
  
  // Remplissage des champs (Assure-toi que tes inputs ont bien ces attributs 'name')
await page.fill('input[name="username"]', `OiseauDeFer_${uniqueId}`);
  await page.fill('input[name="email"]', `iron_${uniqueId}@zoizos.io`);
  await page.fill('input[name="password"]', 'NexusStable2026!');
  await page.fill('input[name="confirmPassword"]', 'NexusStable2026!');
  
  await page.click('button[type="submit"]');

  // On vérifie que la redirection vers le login (ou dashboard selon ta logique) opère
  // Sur notre dernier code de register, on redirigeait vers /auth/login?registered=true
  await expect(page).toHaveURL(/.*\/auth\/login.*/);
});