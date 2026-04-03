import { test, expect } from '@playwright/test';

test.describe('Navigation du Hub Tom-Hat-Toes', () => {
  test('doit basculer sur la vue Horizon et afficher le calendrier', async ({ page }) => {
    // 1. Connexion au Hub
    await page.goto('/fr/tom-hat-toes'); 

    // 2. Vérifier que l'onglet Horizon existe
    const horizonTab = page.getByRole('button', { name: /Horizon/i });
    await expect(horizonTab).toBeVisible();

    // 3. Cliquer et vérifier le changement d'UI
    await horizonTab.click();
    
    // 4. Vérifier que le composant CalendarView est injecté
    const calendar = page.locator('.calendar-container'); // Ou un ID spécifique à ton composant
    await expect(calendar).toBeVisible();
  });
});