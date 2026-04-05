# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: pomodoro.lifecycle.spec.ts >> Horlogerie Bionique - Module Pomodoro >> ⏱️ Le clic sur "30mn" déploie le HUD
- Location: apps\hub-central\e2e\pomodoro.lifecycle.spec.ts:16:7

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.click: Test timeout of 30000ms exceeded.
Call log:
  - waiting for getByRole('button', { name: /30mn/i }).first()

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
  1  | // pomodoro.lifecycle.spec.ts
  2  | import { test, expect } from '@playwright/test';
  3  | 
  4  | test.describe('Horlogerie Bionique - Module Pomodoro', () => {
  5  |   test.beforeEach(async ({ page }) => {
  6  |     // On force l'atterrissage sur le QG multilingue
  7  |     await page.goto('/fr/tom-hat-toes');
  8  |     await page.locator('.bio-card').first().click();
  9  |   });
  10 | 
  11 |   test('👁️ Le HUD Pomodoro doit être invisible par défaut', async ({ page }) => {
  12 |     const hud = page.locator('text=Phase de Focus');
  13 |     await expect(hud).toBeHidden();
  14 |   });
  15 | 
  16 |   test('⏱️ Le clic sur "30mn" déploie le HUD', async ({ page }) => {
  17 |     // 1. On clique sur le bouton "Play" de la première carte
  18 |     const startBtn = page.getByRole('button', { name: /30mn/i }).first();
> 19 |     await startBtn.click();
     |                    ^ Error: locator.click: Test timeout of 30000ms exceeded.
  20 | 
  21 |     // 2. On vérifie que le HUD apparaît avec le bon timer (25:00)
  22 |     const timerText = page.getByText('25:00');
  23 |     await expect(timerText).toBeVisible();
  24 |     
  25 |     // 3. On vérifie que le texte "Phase de Focus" est présent
  26 |     await expect(page.getByText('Phase de Focus')).toBeVisible();
  27 |   });
  28 | 
  29 |   test('❌ Le clic sur la croix annule le Focus et cache le HUD', async ({ page }) => {
  30 |     // On lance le chrono
  31 |     await page.getByRole('button', { name: /30mn/i }).first().click();
  32 |     await expect(page.getByText('25:00')).toBeVisible();
  33 | 
  34 |     // On trouve le bouton "X" du HUD (souvent le seul bouton dans le HUD flottant)
  35 |     // On cible spécifiquement la modale en bas de l'écran
  36 |     const hudCloseBtn = page.locator('.fixed.bottom-8 button').first();
  37 |     await hudCloseBtn.click();
  38 | 
  39 |     // Le vide créateur est de retour
  40 |     await expect(page.getByText('Phase de Focus')).toBeHidden();
  41 |   });
  42 | });
```