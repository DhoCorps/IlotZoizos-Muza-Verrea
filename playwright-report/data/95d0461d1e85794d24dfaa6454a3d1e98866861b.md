# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: recruitment.lifecycle.spec.ts >> Hub - Gestion des Escouades >> un admin peut recruter un oiseau via le radar
- Location: apps\hub-central\e2e\recruitment.lifecycle.spec.ts:5:7

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.click: Test timeout of 30000ms exceeded.
Call log:
  - waiting for locator('section.bio-card').first().locator('button[title="Recruter un oiseau"]')

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
  3  | test.describe('Hub - Gestion des Escouades', () => {
  4  | 
  5  |   test('un admin peut recruter un oiseau via le radar', async ({ page }) => {
  6  |     // 1. Connexion et accès au Hub [cite: 2026-02-25]
  7  |     await page.goto('/fr/tom-hat-toes'); 
  8  |     
  9  |     // 2. On cherche une équipe existante et on ouvre le recrutement
  10 |     const teamCard = page.locator('section.bio-card').first();
> 11 |     await teamCard.locator('button[title="Recruter un oiseau"]').click();
     |                                                                  ^ Error: locator.click: Test timeout of 30000ms exceeded.
  12 | 
  13 |     // 3. Test du Select Dynamique (Radar)
  14 |     const searchInput = page.locator('input[placeholder="Chercher un pseudo..."]');
  15 |     await searchInput.fill('OiseauDeFer');
  16 | 
  17 |     // On attend la réponse de la nouvelle route API
  18 |     await page.waitForResponse(r => r.url().includes('/api/users/recruitable'));
  19 | 
  20 |     // 4. On clique sur "Inviter"
  21 |     const inviteButton = page.locator('button:has-text("Inviter")').first();
  22 |     await inviteButton.click();
  23 | 
  24 |     // 5. Validation visuelle (La modale doit se fermer ou un message apparaître)
  25 |     await expect(searchInput).not.toBeVisible();
  26 |   });
  27 | 
  28 |   test('le bouton Reprendre sa Route fonctionne', async ({ page }) => {
  29 |     await page.goto('/fr/tom-hat-toes');
  30 |     
  31 |     // Test de ton bouton Logout dans la Sidebar [cite: 2026-03-27]
  32 |     await page.locator('button:has-text("Reprendre sa Route")').click();
  33 |     
  34 |     // On doit être redirigé vers la racine
  35 |     await expect(page).toHaveURL(/\/fr$/);
  36 |   });
  37 | });
```