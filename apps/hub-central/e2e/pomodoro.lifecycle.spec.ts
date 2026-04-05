// pomodoro.lifecycle.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Horlogerie Bionique - Module Pomodoro', () => {
  test.beforeEach(async ({ page }) => {
    // On force l'atterrissage sur le QG multilingue
    await page.goto('/fr/tom-hat-toes');
    await page.locator('.bio-card').first().click();
  });

  test('👁️ Le HUD Pomodoro doit être invisible par défaut', async ({ page }) => {
    const hud = page.locator('text=Phase de Focus');
    await expect(hud).toBeHidden();
  });

  test('⏱️ Le clic sur "30mn" déploie le HUD', async ({ page }) => {
    // 1. On clique sur le bouton "Play" de la première carte
    const startBtn = page.getByRole('button', { name: /30mn/i }).first();
    await startBtn.click();

    // 2. On vérifie que le HUD apparaît avec le bon timer (25:00)
    const timerText = page.getByText('25:00');
    await expect(timerText).toBeVisible();
    
    // 3. On vérifie que le texte "Phase de Focus" est présent
    await expect(page.getByText('Phase de Focus')).toBeVisible();
  });

  test('❌ Le clic sur la croix annule le Focus et cache le HUD', async ({ page }) => {
    // On lance le chrono
    await page.getByRole('button', { name: /30mn/i }).first().click();
    await expect(page.getByText('25:00')).toBeVisible();

    // On trouve le bouton "X" du HUD (souvent le seul bouton dans le HUD flottant)
    // On cible spécifiquement la modale en bas de l'écran
    const hudCloseBtn = page.locator('.fixed.bottom-8 button').first();
    await hudCloseBtn.click();

    // Le vide créateur est de retour
    await expect(page.getByText('Phase de Focus')).toBeHidden();
  });
});