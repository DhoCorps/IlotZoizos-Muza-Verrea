# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: auth.lifecycle.spec.ts >> Un nouvel oiseau doit pouvoir rejoindre l’Îlot
- Location: apps\hub-central\e2e\auth.lifecycle.spec.ts:4:5

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: page.fill: Test timeout of 30000ms exceeded.
Call log:
  - waiting for locator('input[name="username"]')

```

# Page snapshot

```yaml
- dialog "Unhandled Runtime Error" [ref=e3]:
  - generic [ref=e4]:
    - generic [ref=e5]:
      - generic [ref=e6]:
        - navigation [ref=e7]:
          - button "previous" [disabled] [ref=e8]:
            - img "previous" [ref=e9]
          - button "next" [disabled] [ref=e11]:
            - img "next" [ref=e12]
          - generic [ref=e14]: 1 of 1 error
          - generic [ref=e15]:
            - text: Next.js (14.2.3) is outdated
            - link "(learn more)" [ref=e17] [cursor=pointer]:
              - /url: https://nextjs.org/docs/messages/version-staleness
        - button "Close" [ref=e18] [cursor=pointer]:
          - img [ref=e20]
      - heading "Unhandled Runtime Error" [level=1] [ref=e23]
      - paragraph [ref=e24]: "Error: Failed to call `useTranslations` because the context from `NextIntlClientProvider` was not found. This can happen because: 1) You intended to render this component as a Server Component, the render failed, and therefore React attempted to render the component on the client instead. If this is the case, check the console for server errors. 2) You intended to render this component on the client side, but no context was found. Learn more about this error here: https://next-intl.dev/docs/environments/server-client-components#missing-context"
    - generic [ref=e25]:
      - heading "Source" [level=2] [ref=e26]
      - generic [ref=e27]:
        - link "app\\[locale]\\auth\\register\\page.tsx (10:29) @ RegisterPage" [ref=e29] [cursor=pointer]:
          - generic [ref=e30]: app\[locale]\auth\register\page.tsx (10:29) @ RegisterPage
          - img [ref=e31]
        - generic [ref=e35]: "8 | 9 | export default function RegisterPage() { > 10 | const t = useTranslations('auth'); | ^ 11 | const router = useRouter(); 12 | const { mode } = useVibe(); 13 |"
      - heading "Call Stack" [level=2] [ref=e36]
      - button "Show collapsed frames" [ref=e37] [cursor=pointer]
```

# Test source

```ts
  1  | // apps/hub-central/e2e/auth.spec.ts
  2  | import { test, expect } from '@playwright/test';
  3  | 
  4  | test('Un nouvel oiseau doit pouvoir rejoindre l’Îlot', async ({ page }) => {
  5  |   // 🎧 LA BOÎTE NOIRE : On écoute ce que l'API répond lors de la soumission
  6  |   page.on('response', async (response) => {
  7  |     if (response.url().includes('/api/auth/register')) {
  8  |       console.log(`[API Register] Statut: ${response.status()}`);
  9  |       try {
  10 |         const body = await response.json();
  11 |         console.log(`[API Register] Réponse:`, body);
  12 |       } catch (e) {
  13 |         console.log(`[API Register] Pas de JSON retourné.`);
  14 |       }
  15 |     }
  16 |   });
  17 | 
  18 |   await page.goto('/fr/auth/register');
  19 |   
  20 |   const uniqueId = Date.now();
  21 |   
  22 |   // Remplissage des champs (Assure-toi que tes inputs ont bien ces attributs 'name')
> 23 | await page.fill('input[name="username"]', `OiseauDeFer_${uniqueId}`);
     |            ^ Error: page.fill: Test timeout of 30000ms exceeded.
  24 |   await page.fill('input[name="email"]', `iron_${uniqueId}@zoizos.io`);
  25 |   await page.fill('input[name="password"]', 'NexusStable2026!');
  26 |   await page.fill('input[name="confirmPassword"]', 'NexusStable2026!');
  27 |   
  28 |   await page.click('button[type="submit"]');
  29 | 
  30 |   // On vérifie que la redirection vers le login (ou dashboard selon ta logique) opère
  31 |   // Sur notre dernier code de register, on redirigeait vers /auth/login?registered=true
  32 |   await expect(page).toHaveURL(/.*\/auth\/login.*/);
  33 | });
```