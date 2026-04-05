# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: directory.lifecycle.spec.ts >> Navigation dans l’Annuaire >> les filtres de grade mettent à jour la liste
- Location: apps\hub-central\e2e\directory.lifecycle.spec.ts:23:7

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.selectOption: Test timeout of 30000ms exceeded.
Call log:
  - waiting for locator('select')

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e3]:
    - heading "404" [level=1] [ref=e4]
    - heading "This page could not be found." [level=2] [ref=e6]
  - alert [ref=e7]
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test.describe('Navigation dans l’Annuaire', () => {
  4  |   test('un utilisateur peut chercher et voir un profil', async ({ page }) => {
  5  |     // ⚠️ PELLE DE PATIENCE : Vérifie si la route de ton annuaire est bien /fr/directory ou /fr/users
  6  |     await page.goto('/fr/directory'); 
  7  |     await expect(page.locator('h1')).toContainText('Annuaire');
  8  | 
  9  |     const searchInput = page.locator('input[placeholder="Chercher un nom..."]');
  10 |     await searchInput.fill('OiseauDeFer');
  11 |     
  12 |     await page.waitForResponse(response => 
  13 |       response.url().includes('/api/users') && response.status() === 200
  14 |     );
  15 | 
  16 |     const userCard = page.locator('text=OiseauDeFer').first();
  17 |     await userCard.click();
  18 | 
  19 |     await expect(page).toHaveURL(/\/profile\/.+/);
  20 |     await expect(page.locator('h1')).toContainText('OiseauDeFer');
  21 |   });
  22 | 
  23 |   test('les filtres de grade mettent à jour la liste', async ({ page }) => {
  24 |     await page.goto('/fr/directory'); // ⚠️ Pareil ici
  25 |     
  26 |     const select = page.locator('select');
> 27 |     await select.selectOption('BATISSEUR');
     |                  ^ Error: locator.selectOption: Test timeout of 30000ms exceeded.
  28 | 
  29 |     const responsePromise = page.waitForResponse(r => r.url().includes('role=BATISSEUR'));
  30 |     await responsePromise;
  31 | 
  32 |     const count = await page.locator('text=BATISSEUR').count();
  33 |     expect(count).toBeGreaterThan(0);
  34 |   });
  35 | });
```