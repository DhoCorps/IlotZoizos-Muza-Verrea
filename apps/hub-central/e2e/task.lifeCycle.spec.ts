// apps/hub-central/e2e/task.lifeCycle.spec.ts
import { test, expect } from '@playwright/test';

test('Cycle de vie : Création et visualisation d\'une tâche', async ({ page }) => {
  await page.goto('/fr/tom-hat-toes');
  
  await page.click('text=Chantiers (Projets)');
  await page.click('text=Ouvrir le Chantier');
  
  await page.click('text=Nouvel Atome');
  await page.fill('input[name="title"]', 'Test E2E Task');

  // 🛡️ SUTURE : Le champ mentalLoad correspond à l'estimation Pomodoro dans le Nexus
  await page.fill('input[name="mentalLoad"]', '4'); // On met 4 pomodoros (ex: 2h de focus)
  
  await page.click('button:has-text("Sceller la Tâche")');
  
  // 🛡️ VERDICT : On vérifie l'affichage organique
  await expect(page.locator('h4', { hasText: 'Test E2E Task' })).toBeVisible();
  
  // Suture : L'UI doit refléter la charge (ex: "Charge: 4" ou "4 🍅")
  await expect(page.locator('text=Charge: 4')).toBeVisible();
});