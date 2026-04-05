# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: profile-upload.lifecycle.spec.ts >> Un oiseau doit pouvoir uploader son avatar dans le Nexus
- Location: apps\hub-central\e2e\profile-upload.lifecycle.spec.ts:4:5

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: page.waitForEvent: Test timeout of 30000ms exceeded.
=========================== logs ===========================
waiting for event "filechooser"
============================================================
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
  1  | // Simulation d'un vol de Zoizo réel
  2  | import { test, expect } from '@playwright/test';
  3  | 
  4  | test('Un oiseau doit pouvoir uploader son avatar dans le Nexus', async ({ page }) => {
  5  |   await page.goto('/fr/dashboard/profile'); // Passage par le SAS i18n
  6  |   
  7  |   // On sélectionne la brindille (le fichier)
> 8  |   const fileChooserPromise = page.waitForEvent('filechooser');
     |                                   ^ Error: page.waitForEvent: Test timeout of 30000ms exceeded.
  9  |   await page.click('label:has(input[type="file"])'); // Ton bouton caméra
  10 |   const fileChooser = await fileChooserPromise;
  11 |   await fileChooser.setFiles('./e2e/fixtures/avatar-test.png');
  12 | 
  13 |   // On attend la suture visuelle
  14 |   await expect(page.locator('img[alt="Avatar"]')).toBeVisible();
  15 |   const successMessage = page.locator('text=Ancrage réussi');
  16 |   await expect(successMessage).toBeVisible();
  17 | });
```