// tests/e2e/navigation-horizon.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Poste de Pilotage - Navigation & Temps', () => {
  
  test.beforeEach(async ({ page }) => {
    // 🛡️ SUTURE : Le Middleware redirige vers /auth/login si l'aura est absente
    await page.goto('/fr/tom-hat-toes'); 

    // Si nous sommes sur la page de login, l'Oiseau doit s'incarner
    if (page.url().includes('/auth/login')) {
      await page.fill('input[type="email"]', 'oiseau.libre@nexus.fr');
      await page.fill('input[type="password"]', 'motdepassepropre');
      await page.click('button[type="submit"]');
    }
    
    // On attend que le Hub soit chargé
    await expect(page.locator('h1')).toContainText('Tom-Hat-Toes');
  });

  test('👁️ Bascule sur la fréquence Horizon (Le Temps)', async ({ page }) => {
    // 1. Vérifier que l'onglet Horizon (Temps) est présent dans la navigation
    const horizonTab = page.getByRole('button', { name: /Horizon \(Temps\)/i });
    await expect(horizonTab).toBeVisible();

    // 2. Transition vers la vue temporelle
    await horizonTab.click();
    
    // 3. Vérifier que l'indicateur visuel de l'onglet actif est présent
    // L'onglet actif possède une div de shadow/border-bottom spécifique
    await expect(horizonTab).toHaveClass(/text-\[#E5484D\]/);

    // 4. Vérifier que le composant CalendarView (La Silice Temporelle) est injecté
    // On cherche le container du calendrier défini dans vos composants
    const calendar = page.locator('.calendar-view-container'); 
    await expect(calendar).toBeVisible();
  });

  test('🔄 Persistance du cycle de navigation', async ({ page }) => {
    // On s'assure qu'on peut revenir aux Escouades (Nids) après avoir vu l'Horizon
    await page.getByRole('button', { name: /Horizon/i }).click();
    await page.getByRole('button', { name: /Escouades \(Nids\)/i }).click();

    // On vérifie que les bio-cards des Nids sont de nouveau perceptibles
    const nestCard = page.locator('.bio-card').first();
    await expect(nestCard).toBeVisible();
  });
});