# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: recruitment.lifecycle.spec.ts >> Hub - Gestion des Escouades >> le bouton Reprendre sa Route fonctionne
- Location: apps\hub-central\e2e\recruitment.lifecycle.spec.ts:28:7

# Error details

```
Error: expect(page).toHaveURL(expected) failed

Expected pattern: /\/fr$/
Received string:  "http://127.0.0.1:3000/fr/auth/login"
Timeout: 5000ms

Call log:
  - Expect "toHaveURL" with timeout 5000ms
    2 × unexpected value "http://localhost:3000/fr/tom-hat-toes"
    - waiting for" http://127.0.0.1:3000/fr/auth/login" navigation to finish...
    - navigated to "http://127.0.0.1:3000/fr/auth/login"
    6 × unexpected value "http://127.0.0.1:3000/fr/auth/login"

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e4]:
    - generic [ref=e5]:
      - heading "Identification" [level=1] [ref=e6]
      - paragraph [ref=e7]: Entre dans la matrice de l'Îlot Zoizos
    - generic [ref=e8]:
      - generic [ref=e9]:
        - generic [ref=e10]: Email de l'oiseau
        - textbox "Email de l'oiseau" [ref=e11]:
          - /placeholder: oiseau@ilot.zoizos
      - generic [ref=e12]:
        - generic [ref=e13]: Chant de sécurité (Mot de passe)
        - textbox "Chant de sécurité (Mot de passe)" [ref=e14]:
          - /placeholder: ••••••••
      - button "Prendre son envol" [ref=e15]
    - generic [ref=e16]:
      - text: Nouveau dans la volée ?
      - link "Créer un profil" [ref=e17] [cursor=pointer]:
        - /url: /fr/auth/register
  - alert [ref=e18]
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
  11 |     await teamCard.locator('button[title="Recruter un oiseau"]').click();
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
> 35 |     await expect(page).toHaveURL(/\/fr$/);
     |                        ^ Error: expect(page).toHaveURL(expected) failed
  36 |   });
  37 | });
```