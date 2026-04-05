import { test, expect } from '@playwright/test';

test('Cycle de vie : Création et visualisation d\'une tâche', async ({ page }) => {
  await page.goto('/fr/tom-hat-toes');
  
  // 1. Navigation vers les projets
  await page.click('text=Chantiers (Projets)');
  
  // 2. Ouverture d'un chantier existant
  await page.click('text=Ouvrir le Chantier');
  
  // 3. Création d'un atome [cite: 2026-04-02]
  await page.click('text=Nouvel Atome');
  await page.fill('input[name="title"]', 'Test E2E Task');
  await page.fill('input[name="mentalLoad"]', '50');
  await page.click('button:has-text("Sceller la Tâche")');
  
  // 4. Vérification visuelle dans le Hub
  await expect(page.locator('text=Test E2E Task')).toBeVisible();
  await expect(page.locator('text=50%')).toBeVisible(); // Charge mentale [cite: 2026-02-11]
});