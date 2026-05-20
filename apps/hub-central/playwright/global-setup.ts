// apps/hub-central/playwright/global-setup.ts
import { chromium, FullConfig, expect } from '@playwright/test';
import path from 'path';
import { connectToDatabase } from '@ilot/infrastructure';
import { OiseauModel } from '@ilot/infrastructure/src/database/models/nosql/user.model';
import bcrypt from 'bcryptjs';

process.env.NEXTAUTH_SECRET = 'une_cle_tres_longue_et_stable_pour_mon_ilot_2026'; 
process.env.NEXTAUTH_URL = 'http://localhost:3000';

async function globalSetup(config: FullConfig) {
  console.log('🤖 [Playwright] Éveil de la Silice pour le Premier Zoizo...');
  
  // 1. SÉDIMENTATION : On s'assure que l'Oiseau de test existe avec la bonne Aura
  await connectToDatabase();
  const testEmail = 'c@d.free';
  const testPassword = '777MuSe!!!???';

  let bird = await OiseauModel.findOne({ email: testEmail });

  await OiseauModel.deleteOne({ email: testEmail });
  if (!bird) {
    console.log(`🐣 [Seed] Création de l'Oiseau pionnier...`);
    const hashedPassword = await bcrypt.hash(testPassword, 10);
    bird = await OiseauModel.create({
      uid: 'oiseau-test-playwright',
      email: testEmail,
      password: hashedPassword,
      pseudo: 'Deuxieme Zoizo',
      capabilities: ['*'], // Aura de l'Architecte
      status: 'ACTIVE',
      dates: { createdAt: new Date(), updatedAt: new Date() }
    });
  } else {
    console.log(`💎 [Seed] L'Oiseau pionnier est déjà présent dans la Silice.`);
  }

  // 2. FORGE DU PASSE-PARTOUT
  const { baseURL } = config.projects[0].use;
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const authPath = path.join(process.cwd(), 'apps/hub-central/playwright/.auth/user.json');

  try {
    console.log('🛡️ SUTURE : Authentification organique via le portail...');
    
    // 1. On va sur la page de login
    await page.goto(`${baseURL}/fr/auth/login`);

    // 🛡️ SUTURE ANTI-CSRF : On force le robot à attendre que NextAuth ait chargé son bouclier
    await page.waitForLoadState('networkidle'); // Attend que toutes les requêtes réseau (dont le fetch CSRF) soient terminées
    await page.waitForTimeout(1000); // Une seconde de respiration artificielle pour laisser React s'hydrater

    // 2. On remplit les champs...
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', testPassword);
    
    // 3. On clique ET on écoute
    const [response] = await Promise.all([
      page.waitForResponse(res => res.url().includes('/api/auth/callback/credentials')),
      page.getByTestId('auth-submit').click()
    ]);

    const responseBody = await response.json();
    console.log("🔍 [Debug Auth] Réponse de NextAuth :", responseBody);

    if (responseBody.url && responseBody.url.includes('error')) {
      throw new Error(`❌ NextAuth a rejeté le mot de passe ou l'Oiseau. Regarde la capture d'écran ! URL: ${responseBody.url}`);
    }

    // 4. On attend la redirection vers le Hub
    await page.waitForURL(/.*tom-hat-toes/);
    // 5. BOUM ! Le vrai cookie crypté JWE est maintenant dans le navigateur. On le sauvegarde.
    await page.context().storageState({ path: authPath });
    console.log('✅ Passe-Partout cryptographique généré et sauvegardé.');

  } catch (error: any) {
    const screenshotPath = path.join(process.cwd(), 'apps/hub-central/playwright/debug-collision-nexus.png');
    await page.screenshot({ path: screenshotPath });
    console.error('🔥 [Playwright Error] La forge a échoué :', error.message);
    throw error; 
  } finally {
    await browser.close();
  }
}

export default globalSetup;