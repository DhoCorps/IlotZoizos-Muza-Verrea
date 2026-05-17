import { test, expect } from '@playwright/test';

test.describe('Hub - Gestion des Escouades', () => {

  test('un admin peut recruter un oiseau via le radar', async ({ page }) => {
    // 1. Connexion et accès au Hub [cite: 2026-02-25]
    await page.goto('/fr/tom-hat-toes'); 
    
    // 2. On cherche une équipe existante et on ouvre le recrutement
    const teamCard = page.locator('section.bio-card').first();
    await teamCard.locator('button[title="Recruter un oiseau"]').click();

    // 3. Test du Select Dynamique (Radar)
    const searchInput = page.locator('input[placeholder="Chercher un pseudo..."]');
    await searchInput.fill('OiseauDeFer');

    // On attend la réponse de la nouvelle route API
    await page.waitForResponse(r => r.url().includes('/api/users/recruitable'));

    // 4. On clique sur "Inviter"
    const inviteButton = page.locator('button:has-text("Inviter")').first();
    await inviteButton.click();

    // 5. Validation visuelle (La modale doit se fermer ou un message apparaître)
    await expect(searchInput).not.toBeVisible();
  });

  test('le bouton Reprendre sa Route fonctionne', async ({ page }) => {
    await page.goto('/fr/tom-hat-toes');
    
    // Test de ton bouton Logout dans la Sidebar [cite: 2026-03-27]
    await page.locator('button:has-text("Reprendre sa Route")').click();
    
    // On doit être redirigé vers la racine
    await expect(page).toHaveURL(/.*\/auth\/login/);
  });
});