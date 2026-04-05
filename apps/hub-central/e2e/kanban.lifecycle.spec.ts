import { test, expect } from '@playwright/test';

test.describe('Poste de Pilotage - Module Kanban', () => {
  test.beforeEach(async ({ page }) => {
    // On force l'atterrissage sur le QG multilingue
    await page.goto('/fr/tom-hat-toes');
  });
  
  test('👁️ Le tiroir Kanban doit rester caché au chargement', async ({ page }) => {
    const kanbanHeader = page.locator('h2:has-text("Tableau de Bord Zoizos")');
    await expect(kanbanHeader).toBeHidden();
  });

  test('💎 Le clic sur la Pierre Précieuse déploie le Kanban', async ({ page }) => {
    // 1. Il faut d'abord qu'un projet soit sélectionné pour voir le bouton Kanban
    // On simule le clic sur le premier projet disponible pour activer la zone contextuelle
    const firstProject = page.locator('.bio-card').first();
    await firstProject.click();

    // 2. On cible le bouton d'appel bionique
    const openKanbanBtn = page.getByRole('button', { name: /Ouvrir le Kanban/i });
    await expect(openKanbanBtn).toBeVisible();
    await openKanbanBtn.click();

    // 3. On vérifie que le tiroir a bien coulissé
    const kanbanHeader = page.locator('h2:has-text("Tableau de Bord")');
    await expect(kanbanHeader).toBeVisible();

    // 4. On vérifie que tes colonnes organiques sont bien là
    await expect(page.locator('h3', { hasText: 'XYX' })).toBeVisible();
    await expect(page.locator('h3', { hasText: '...' })).toBeVisible();
    await expect(page.locator('h3', { hasText: '!' })).toBeVisible();
  });

  test('❌ Le clic sur Fermer rétracte le tiroir', async ({ page }) => {
    // Raccourci pour ouvrir le Kanban
    await page.locator('.bio-card').first().click();
    await page.getByRole('button', { name: /Ouvrir le Kanban/i }).click();

    // On ferme
    const closeBtn = page.getByRole('button', { name: 'Fermer' });
    await closeBtn.click();

    // Le vide créateur est de retour
    const kanbanHeader = page.locator('h2:has-text("Tableau de Bord Zoizos")');
    await expect(kanbanHeader).toBeHidden();
  });
});