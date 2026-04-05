// project.lifecycle.spec.ts
import { test, expect } from '@playwright/test';

test('Un oiseau doit pouvoir sceller un nouveau chantier dans le Hub', async ({ page }) => {
  // Navigation vers la nouvelle architecture Next.js
  await page.goto('/fr/tom-hat-toes');

  // ⚠️ PELLE DE PATIENCE : Vérifie si le texte exact est bien "Chantiers (Projets)"
  await page.click('text=Chantiers (Projets)');
  await page.click('text=Sceller un Projet');

  await page.fill('input[name="name"]', 'Le Bordel de DhÖ');
  await page.fill('input[name="tag"]', 'BDD');
  await page.selectOption('select[name="priority"]', 'HIGH');
  
  await page.click('button:has-text("Sceller le Projet")');

  const projectCard = page.locator('.bio-card', { hasText: 'Le Bordel de DhÖ' });
  await expect(projectCard).toBeVisible();
});