# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: kanban.lifecycle.spec.ts >> Poste de Pilotage - Module Kanban >> 💎 Le clic sur la Pierre Précieuse déploie le Kanban
- Location: apps\hub-central\e2e\kanban.lifecycle.spec.ts:14:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('button', { name: /Ouvrir le Kanban/i })
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for getByRole('button', { name: /Ouvrir le Kanban/i })

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
  3  | test.describe('Poste de Pilotage - Module Kanban', () => {
  4  |   test.beforeEach(async ({ page }) => {
  5  |     // On force l'atterrissage sur le QG multilingue
  6  |     await page.goto('/fr/tom-hat-toes');
  7  |   });
  8  |   
  9  |   test('👁️ Le tiroir Kanban doit rester caché au chargement', async ({ page }) => {
  10 |     const kanbanHeader = page.locator('h2:has-text("Tableau de Bord Zoizos")');
  11 |     await expect(kanbanHeader).toBeHidden();
  12 |   });
  13 | 
  14 |   test('💎 Le clic sur la Pierre Précieuse déploie le Kanban', async ({ page }) => {
  15 |     // 1. Il faut d'abord qu'un projet soit sélectionné pour voir le bouton Kanban
  16 |     // On simule le clic sur le premier projet disponible pour activer la zone contextuelle
  17 |     const firstProject = page.locator('.bio-card').first();
  18 |     await firstProject.click();
  19 | 
  20 |     // 2. On cible le bouton d'appel bionique
  21 |     const openKanbanBtn = page.getByRole('button', { name: /Ouvrir le Kanban/i });
> 22 |     await expect(openKanbanBtn).toBeVisible();
     |                                 ^ Error: expect(locator).toBeVisible() failed
  23 |     await openKanbanBtn.click();
  24 | 
  25 |     // 3. On vérifie que le tiroir a bien coulissé
  26 |     const kanbanHeader = page.locator('h2:has-text("Tableau de Bord")');
  27 |     await expect(kanbanHeader).toBeVisible();
  28 | 
  29 |     // 4. On vérifie que tes colonnes organiques sont bien là
  30 |     await expect(page.locator('h3', { hasText: 'XYX' })).toBeVisible();
  31 |     await expect(page.locator('h3', { hasText: '...' })).toBeVisible();
  32 |     await expect(page.locator('h3', { hasText: '!' })).toBeVisible();
  33 |   });
  34 | 
  35 |   test('❌ Le clic sur Fermer rétracte le tiroir', async ({ page }) => {
  36 |     // Raccourci pour ouvrir le Kanban
  37 |     await page.locator('.bio-card').first().click();
  38 |     await page.getByRole('button', { name: /Ouvrir le Kanban/i }).click();
  39 | 
  40 |     // On ferme
  41 |     const closeBtn = page.getByRole('button', { name: 'Fermer' });
  42 |     await closeBtn.click();
  43 | 
  44 |     // Le vide créateur est de retour
  45 |     const kanbanHeader = page.locator('h2:has-text("Tableau de Bord Zoizos")');
  46 |     await expect(kanbanHeader).toBeHidden();
  47 |   });
  48 | });
```