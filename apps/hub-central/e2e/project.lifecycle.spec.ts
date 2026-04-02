import { test, expect } from '@playwright/test';

test('Un oiseau doit pouvoir sceller un nouveau chantier dans le Hub', async ({ page }) => {
  await page.goto('/hub');

  // Passage sur l'onglet Chantiers
  await page.click('text=Chantiers (Projets)');

  // Ouverture de la modale de fondation
  await page.click('text=Sceller un Projet');

  // Remplissage du formulaire gargantuesque
  await page.fill('input[name="name"]', 'Le Bordel de DhÖ');
  await page.fill('input[name="tag"]', 'BDD');
  await page.selectOption('select[name="priority"]', 'HIGH');
  
  // Validation
  await page.click('button:has-text("Sceller le Projet")');

  // Vérification de l'apparition dans la liste
  const projectCard = page.locator('.bio-card', { hasText: 'Le Bordel de DhÖ' });
  await expect(projectCard).toBeVisible();
  await expect(projectCard).toContainText('HIGH');
});