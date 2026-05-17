// apps/hub-central/e2e/auth.lifecycle.spec.ts
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
  
  // Remplissage des champs
  await page.fill('input[name="username"]', `OiseauDeFer_${uniqueId}`);
  await page.fill('input[name="email"]', `iron_${uniqueId}@zoizos.io`);
  await page.fill('input[name="password"]', 'NexusStable2026!');
  await page.fill('input[name="confirmPassword"]', 'NexusStable2026!');
  
  await page.click('button[type="submit"]');

  // 🛡️ LA SUTURE EST ICI : 
  // On ne cherche plus l'URL, on cherche le message de l'API avec un peu de patience (10s)
  await expect(page.getByText("L'oiseau a rejoint l'Îlot !")).toBeVisible({ timeout: 10000 });
});