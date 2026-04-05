# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: project.lifecycle.spec.ts >> Un oiseau doit pouvoir sceller un nouveau chantier dans le Hub
- Location: apps\hub-central\e2e\project.lifecycle.spec.ts:4:5

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('.bio-card').filter({ hasText: 'Le Bordel de DhÖ' })
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for locator('.bio-card').filter({ hasText: 'Le Bordel de DhÖ' })

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
          - generic: Nexus Contextuel
        - generic [ref=e24]:
          - generic [ref=e25]:
            - heading "Tom-Hat-Toes / Hub" [level=1] [ref=e26]
            - paragraph [ref=e27]: Architecture des Escouades & Chantiers
          - button "Sceller un Projet" [ref=e28]:
            - img [ref=e29]
            - text: Sceller un Projet
        - navigation [ref=e30]:
          - button "Escouades (Nids)" [ref=e31]
          - button "Chantiers (Projets)" [ref=e32]: Chantiers (Projets)
          - button "Horizon (Temps)" [ref=e34]
        - main
        - generic [ref=e36]:
          - button [ref=e37]:
            - img [ref=e38]
          - heading "Sceller un Chantier" [level=3] [ref=e41]:
            - img [ref=e42]
            - text: Sceller un Chantier
          - generic [ref=e43]:
            - generic [ref=e44]:
              - heading "Identité & Hiérarchie" [level=4] [ref=e45]
              - textbox "Nom du projet" [ref=e46]: Le Bordel de DhÖ
              - generic [ref=e47]:
                - 'textbox "TAG (ex: RNWL)" [ref=e48]': BDD
                - combobox [ref=e49]:
                  - option "Projet Racine" [selected]
            - generic [ref=e50]:
              - combobox [ref=e51]:
                - option "Concept" [selected]
                - option "Actif"
              - combobox [ref=e52]:
                - option "Medium"
                - option "High" [selected]
              - combobox [ref=e53]:
                - option "Technique" [selected]
                - option "Artistique"
            - generic [ref=e54]:
              - heading "Actifs Numériques" [level=4] [ref=e55]
              - textbox "URLs des fichiers (séparées par des virgules)" [ref=e56]
            - generic [ref=e57]:
              - generic [ref=e58]:
                - text: Charge Mentale Initiale
                - slider [ref=e59]: "50"
              - generic [ref=e60]:
                - text: Couleur Organique
                - textbox [ref=e61]: "#e5484d"
            - generic [ref=e62]:
              - button "Sceller le Projet" [ref=e63]
              - button "Abandonner" [ref=e64]
  - alert [ref=e65]
```

# Test source

```ts
  1  | // project.lifecycle.spec.ts
  2  | import { test, expect } from '@playwright/test';
  3  | 
  4  | test('Un oiseau doit pouvoir sceller un nouveau chantier dans le Hub', async ({ page }) => {
  5  |   // Navigation vers la nouvelle architecture Next.js
  6  |   await page.goto('/fr/tom-hat-toes');
  7  | 
  8  |   // ⚠️ PELLE DE PATIENCE : Vérifie si le texte exact est bien "Chantiers (Projets)"
  9  |   await page.click('text=Chantiers (Projets)');
  10 |   await page.click('text=Sceller un Projet');
  11 | 
  12 |   await page.fill('input[name="name"]', 'Le Bordel de DhÖ');
  13 |   await page.fill('input[name="tag"]', 'BDD');
  14 |   await page.selectOption('select[name="priority"]', 'HIGH');
  15 |   
  16 |   await page.click('button:has-text("Sceller le Projet")');
  17 | 
  18 |   const projectCard = page.locator('.bio-card', { hasText: 'Le Bordel de DhÖ' });
> 19 |   await expect(projectCard).toBeVisible();
     |                             ^ Error: expect(locator).toBeVisible() failed
  20 | });
```