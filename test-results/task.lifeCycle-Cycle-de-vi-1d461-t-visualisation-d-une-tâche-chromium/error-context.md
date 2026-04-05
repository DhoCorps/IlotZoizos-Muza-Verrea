# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: task.lifeCycle.spec.ts >> Cycle de vie : Création et visualisation d'une tâche
- Location: apps\hub-central\e2e\task.lifeCycle.spec.ts:3:5

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: page.click: Test timeout of 30000ms exceeded.
Call log:
  - waiting for locator('text=Chantiers (Projets)')

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
  3  | test('Cycle de vie : Création et visualisation d\'une tâche', async ({ page }) => {
  4  |   await page.goto('/hub');
  5  |   
  6  |   // 1. Navigation vers les projets
> 7  |   await page.click('text=Chantiers (Projets)');
     |              ^ Error: page.click: Test timeout of 30000ms exceeded.
  8  |   
  9  |   // 2. Ouverture d'un chantier existant
  10 |   await page.click('text=Ouvrir le Chantier');
  11 |   
  12 |   // 3. Création d'un atome [cite: 2026-04-02]
  13 |   await page.click('text=Nouvel Atome');
  14 |   await page.fill('input[name="title"]', 'Test E2E Task');
  15 |   await page.fill('input[name="mentalLoad"]', '50');
  16 |   await page.click('button:has-text("Sceller la Tâche")');
  17 |   
  18 |   // 4. Vérification visuelle dans le Hub
  19 |   await expect(page.locator('text=Test E2E Task')).toBeVisible();
  20 |   await expect(page.locator('text=50%')).toBeVisible(); // Charge mentale [cite: 2026-02-11]
  21 | });
```