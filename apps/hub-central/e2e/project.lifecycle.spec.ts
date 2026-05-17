// apps/hub-central/e2e/project.lifecycle.spec.ts
import { test, expect } from '@playwright/test';

test('Un oiseau doit pouvoir sceller un nouveau chantier dans le Hub', async ({ page }) => {
  await page.goto('/fr/tom-hat-toes');

  // 🛡️ NAVIGATION : On s'assure que le lien est bien celui-ci
  await page.click('text=Chantiers (Projets)');
  await page.click('text=Sceller un Projet');

  // 🛡️ DATA : On forge le projet
  await page.fill('input[name="name"]', 'Le Bordel de DhÖ');
  
  // Suture : Si 'tag' devient l'identifiant court (ex: BDD)
  await page.fill('input[name="tag"]', 'BDD'); 

  // Suture : Si 'priority' est géré par l'Aura du projet
  await page.selectOption('select[name="priority"]', 'HIGH');
  
  await page.click('button:has-text("Sceller le Projet")');

  // 🛡️ VERDICT : La carte bionique doit apparaître
  const projectCard = page.locator('.bio-card', { hasText: 'Le Bordel de DhÖ' });
  await expect(projectCard).toBeVisible();
});