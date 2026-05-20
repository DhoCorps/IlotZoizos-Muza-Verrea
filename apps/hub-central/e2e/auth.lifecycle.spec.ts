import { test, expect } from '@playwright/test';

test('Un nouvel oiseau doit pouvoir rejoindre l’Îlot', async ({ page }) => {
  await page.goto('/fr/auth/login'); // Correction vers le login
  
  // Remplissage avec des sélecteurs robustes
  await page.fill('input[name="email"]', 'geoffroydaillauddecaseneuve@gmail.com');
  await page.fill('input[name="password"]', '777MuSe!!!???');
  
  // Clic ciblé par data-testid
  await page.getByTestId('auth-submit').click();

  // Attendre la redirection vers le Hub
  await expect(page).toHaveURL(/.*tom-hat-toes/);
});