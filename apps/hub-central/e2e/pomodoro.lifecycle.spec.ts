// tests/e2e/pomodoro.lifecycle.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Horlogerie Bionique - Focus Souverain', () => {
  
  test.beforeEach(async ({ page }) => {
    // 🛡️ SUTURE : Traversée de la porte du Sanctuaire
    await page.goto('/fr/tom-hat-toes');
    
    if (page.url().includes('/auth/login')) {
      await page.fill('input[type="email"]', 'oiseau.libre@nexus.fr');
      await page.fill('input[type="password"]', 'motdepassepropre');
      await page.click('button[type="submit"]');
    }

    // 🛡️ NAVIGATION : Accès à la fréquence des Chantiers pour voir les Atomes
    await page.getByRole('button', { name: /Chantiers/i }).click();
    
    // Sélection du premier Chantier pour matérialiser les tâches
    const firstChantier = page.locator('.bio-card').first();
    await firstChantier.click();
  });

  test('👁️ Le HUD de Focus doit rester en stase par défaut', async ({ page }) => {
    // Le HUD (PomodoroHUD) ne doit pas encombrer la vision au repos
    const hud = page.locator('text=Phase de Focus');
    await expect(hud).toBeHidden();
  });

  test('⏱️ L’Oiseau amorce un cycle de Focus sur un Atome', async ({ page }) => {
    // 1. On cible le bouton de déclenchement dans un TaskCard (Atome)
    // On cherche le bouton "30mn" ou l'icône de temps
    const startFocusBtn = page.getByRole('button', { name: /30mn/i }).first();
    await expect(startFocusBtn).toBeVisible();
    await startFocusBtn.click();

    // 2. Vérification du déploiement du HUD bionique
    const timerDisplay = page.getByText('25:00'); // Temps de focus standard
    await expect(timerDisplay).toBeVisible();
    
    const statusText = page.getByText('Phase de Focus');
    await expect(statusText).toBeVisible();
  });

  test('❌ Annulation du cycle et retour au Silence', async ({ page }) => {
    // Lancement du cycle
    await page.getByRole('button', { name: /30mn/i }).first().click();
    
    // 🛡️ SUTURE : Cible du bouton d'annulation dans le PomodoroHUD
    // On utilise les labels cohérents avec ton Hub
    const closeHudBtn = page.locator('button:has-text("Fermer")').or(page.locator('.fixed.bottom-8 button')).first();
    await closeHudBtn.click();

    // Le HUD retourne dans le Néant créateur
    await expect(page.getByText('Phase de Focus')).toBeHidden();
  });
});