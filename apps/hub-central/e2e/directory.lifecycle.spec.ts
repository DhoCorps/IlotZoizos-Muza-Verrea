import { test, expect } from '@playwright/test';

test.describe('Navigation dans l’Annuaire', () => {
  test('un utilisateur peut chercher et voir un profil', async ({ page }) => {
    // ⚠️ PELLE DE PATIENCE : Vérifie si la route de ton annuaire est bien /fr/directory ou /fr/users
    await page.goto('/fr/directory'); 
    await expect(page.locator('h1')).toContainText('Annuaire');

    const searchInput = page.locator('input[placeholder="Chercher un nom..."]');
    await searchInput.fill('OiseauDeFer');
    
    await page.waitForResponse(response => 
      response.url().includes('/api/users') && response.status() === 200
    );

    const userCard = page.locator('text=OiseauDeFer').first();
    await userCard.click();

    await expect(page).toHaveURL(/\/profile\/.+/);
    await expect(page.locator('h1')).toContainText('OiseauDeFer');
  });

  test('les filtres de grade mettent à jour la liste', async ({ page }) => {
    await page.goto('/fr/directory'); // ⚠️ Pareil ici
    
    const select = page.locator('select');
    await select.selectOption('BATISSEUR');

    const responsePromise = page.waitForResponse(r => r.url().includes('role=BATISSEUR'));
    await responsePromise;

    const count = await page.locator('text=BATISSEUR').count();
    expect(count).toBeGreaterThan(0);
  });
});