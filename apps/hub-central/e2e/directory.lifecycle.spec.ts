// apps/hub-central/e2e/directory.lifecycle.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Navigation dans l’Annuaire (Résonance)', () => {
  
  test('un utilisateur peut chercher et voir un profil par son pseudo', async ({ page }) => {
    await page.goto('/fr/users');
    await expect(page.locator('h1')).toContainText('Annuaire des Oiseaux');

    const searchInput = page.locator('input[placeholder="Chercher un nom..."]');
    await searchInput.fill('OiseauDeFer');
    
    await page.waitForResponse(r => r.url().includes('search=OiseauDeFer'));

    const userCard = page.locator('text=OiseauDeFer').first();
    await userCard.click();

    await expect(page).toHaveURL(/\/profile\/.+/);
    await expect(page.locator('h1')).toContainText('OiseauDeFer');
  });

  // 🛡️ ADAPTATION : Le test de grade est remplacé par le test d'Aura
  test('la recherche par Aura (talent) doit filtrer la volière', async ({ page }) => {
    await page.goto('/fr/users');
    
    const searchInput = page.locator('input[placeholder="Chercher un nom..."]');
    // On cherche une fréquence ou un talent (ex: "TypeScript")
    await searchInput.fill('TypeScript');

    const responsePromise = page.waitForResponse(r => r.url().includes('search=TypeScript'));
    await responsePromise;

    // On vérifie qu'un oiseau possédant cette aura est affiché
    // (Le test suppose qu'au moins un oiseau a "TypeScript" dans son aura)
    const cards = page.locator('.bio-card'); 
    await expect(cards.first()).toBeVisible();
  });
});