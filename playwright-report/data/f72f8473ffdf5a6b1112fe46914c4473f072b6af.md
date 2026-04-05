# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: hub.lifecycle.spec.ts >> Navigation du Hub Tom-Hat-Toes >> doit basculer sur la vue Horizon et afficher le calendrier
- Location: apps\hub-central\e2e\hub.lifecycle.spec.ts:4:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('button', { name: /Horizon/i })
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for getByRole('button', { name: /Horizon/i })

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e2]:
    - complementary [ref=e3]:
      - generic [ref=e4]:
        - generic [ref=e5]:
          - img [ref=e7]
          - generic [ref=e10]: Geoffroy
        - button "Reprendre sa Route" [ref=e12]:
          - img [ref=e14]
          - generic [ref=e17]: Reprendre sa Route
    - main [ref=e18]:
      - generic [ref=e19]:
        - generic [ref=e20]:
          - generic [ref=e21]:
            - heading "Tom-Hat-Toes / Hub" [level=1] [ref=e22]
            - paragraph [ref=e23]: Architecture des Escouades & Chantiers
          - button "Fonder un Nid" [ref=e24]:
            - img [ref=e25]
            - text: Fonder un Nid
        - navigation [ref=e26]:
          - button "Escouades (Nids)" [ref=e27]: Escouades (Nids)
          - button "Chantiers (Projets)" [ref=e29]
          - button "Horizon (Temps)" [ref=e30]
        - main
  - alert [ref=e31]
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test.describe('Navigation du Hub Tom-Hat-Toes', () => {
  4  |   test('doit basculer sur la vue Horizon et afficher le calendrier', async ({ page }) => {
  5  |     // 1. Connexion au Hub
  6  |     await page.goto('/fr/tom-hat-toes'); 
  7  | 
  8  |     // 2. Vérifier que l'onglet Horizon existe
  9  |     const horizonTab = page.getByRole('button', { name: /Horizon/i });
> 10 |     await expect(horizonTab).toBeVisible();
     |                              ^ Error: expect(locator).toBeVisible() failed
  11 | 
  12 |     // 3. Cliquer et vérifier le changement d'UI
  13 |     await horizonTab.click();
  14 |     
  15 |     // 4. Vérifier que le composant CalendarView est injecté
  16 |     const calendar = page.locator('.calendar-container'); // Ou un ID spécifique à ton composant
  17 |     await expect(calendar).toBeVisible();
  18 |   });
  19 | });
```