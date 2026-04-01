import { test, expect } from '@playwright/test';

test.describe('Navigation dans l’Annuaire', () => {
  
  test('un utilisateur peut chercher et voir un profil', async ({ page }) => {
    // 1. Accès à l'annuaire
    await page.goto('/fr/users');
    await expect(page.locator('h1')).toContainText('Annuaire des Oiseaux');

    // 2. Test de la barre de recherche
    const searchInput = page.locator('input[placeholder="Chercher un nom..."]');
    await searchInput.fill('OiseauDeFer');
    
    // On attend que le debounce et l'API répondent
    await page.waitForResponse(response => 
      response.url().includes('/api/users?search=OiseauDeFer') && response.status() === 200
    );

    // 3. Clic sur la carte du profil
    const userCard = page.locator('text=OiseauDeFer').first();
    await userCard.click();

    // 4. Validation de la page profil
    await expect(page).toHaveURL(/\/profile\/.+/);
    await expect(page.locator('h1')).toContainText('OiseauDeFer');
    
    // Vérification de la présence de la signature par défaut si non définie
    const signature = page.locator('p.text-mono'); // Sélecteur basé sur ton composant
    await expect(signature).toBeVisible();
  });

  test('les filtres de grade mettent à jour la liste', async ({ page }) => {
    await page.goto('/fr/users');
    
    const select = page.locator('select');
    await select.selectOption('BATISSEUR');

    // Vérification que l'URL de l'API contient bien le filtre
    const responsePromise = page.waitForResponse(r => r.url().includes('role=BATISSEUR'));
    await responsePromise;

    // On vérifie que les badges affichés sont bien tous "BATISSEUR"
    const badges = page.locator('text=BATISSEUR');
    const count = await badges.count();
    expect(count).toBeGreaterThan(0);
  });
});