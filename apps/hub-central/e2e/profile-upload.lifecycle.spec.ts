// Simulation d'un vol de Zoizo réel
import { test, expect } from '@playwright/test';

test('Un oiseau doit pouvoir uploader son avatar dans le Nexus', async ({ page }) => {
  await page.goto('/fr/profile'); // Passage par le SAS i18n
  
  // On sélectionne la brindille (le fichier)
  const fileChooserPromise = page.waitForEvent('filechooser');
  await page.click('label:has(input[type="file"])'); // Ton bouton caméra
  const fileChooser = await fileChooserPromise;
  await fileChooser.setFiles('./e2e/fixtures/avatar-test.png');

  // On attend la suture visuelle
  await expect(page.locator('img[alt="Avatar"]')).toBeVisible();
  const successMessage = page.locator('text=Ancrage réussi');
  await expect(successMessage).toBeVisible();
});