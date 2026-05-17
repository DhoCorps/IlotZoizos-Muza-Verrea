// tests/e2e/kanban-souverainete.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Poste de Pilotage - Souveraineté & Atomes', () => {
  
  test.beforeEach(async ({ page }) => {
    // 🛡️ SUTURE : Traversée du Middleware
    await page.goto('/fr/tom-hat-toes');
    
    if (page.url().includes('/auth/login')) {
      await page.fill('input[type="email"]', 'oiseau.libre@nexus.fr');
      await page.fill('input[type="password"]', 'motdepassepropre');
      await page.click('button[type="submit"]');
    }
  });

  test('👁️ Validation de l’ADN (Adieu les Rôles)', async ({ page }) => {
    // On vérifie que l'absurdité du rôle figé a laissé place à la liberté
    // "Oiseau Libre" est le label par défaut que nous avons suturé
    const freedomLabel = page.locator('span:has-text("Oiseau Libre")').first();
    await expect(freedomLabel).toBeVisible();
  });

  test('💎 L’Oiseau déploie ses Atomes (Flux Projet)', async ({ page }) => {
    // 1. Il faut basculer sur l'onglet "Chantiers" pour trouver un projet
    await page.getByRole('button', { name: /Chantiers/i }).click();

    // 2. Sélection d'un Chantier (Bio-card dans la vue projet)
    const firstChantier = page.locator('.bio-card').first();
    await expect(firstChantier).toBeVisible();
    await firstChantier.click();

    // 3. Appel du Tableau de Bord (Le bouton bionique apparaît enfin)
    const openKanbanBtn = page.getByRole('button', { name: /Ouvrir le Kanban/i });
    await expect(openKanbanBtn).toBeVisible();
    await openKanbanBtn.click();

    // 4. Vérification de la structure de la Silice (Les Atomes)
    await expect(page.locator('h3', { hasText: 'CONCEPT' })).toBeVisible();
    await expect(page.locator('h3', { hasText: 'IN_PROGRESS' })).toBeVisible();
  });

  test('💀 L’Oiseau acte sa sortie définitive (Souveraineté)', async ({ page }) => {
    // 🛡️ Vérification du bouton d'Exil (La Suture de Liberté)
    const leaveBtn = page.getByRole('button', { name: /Quitter Définitivement l'îlot/i });
    await expect(leaveBtn).toBeVisible();
    
    // On vérifie que le Nexus demande confirmation avant la désintégration
    page.on('dialog', dialog => {
      expect(dialog.message()).toContain("quitter définitivement l'îlot");
      dialog.dismiss(); 
    });
    
    await leaveBtn.click();
  });
});