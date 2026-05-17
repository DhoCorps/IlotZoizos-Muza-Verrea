import { chromium, FullConfig } from '@playwright/test';
import path from 'path';
import { connectToDatabase } from '@ilot/infrastructure';
import { OiseauModel } from '@ilot/infrastructure/src/database/models/nosql/user.model';
import bcrypt from 'bcryptjs';

async function globalSetup(config: FullConfig) {
  console.log('🤖 [Playwright] Éveil de la Silice pour le Premier Zoizo...');
  
  // 1. SÉDIMENTATION : On s'assure que l'Oiseau de test existe avec la bonne Aura
  await connectToDatabase();
  const testEmail = 'a@b.free';
  const testPassword = '777MuSe!!!???';

  let bird = await OiseauModel.findOne({ email: testEmail });

  if (!bird) {
    console.log(`🐣 [Seed] Création de l'Oiseau pionnier...`);
    const hashedPassword = await bcrypt.hash(testPassword, 10);
    bird = await OiseauModel.create({
      uid: 'bird-test-playwright',
      email: testEmail,
      password: hashedPassword,
      pseudo: 'Premier Zoizo',
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
    console.log(`📡 Navigation vers le Sas : ${baseURL}/fr/auth/login`);
    await page.goto(`${baseURL}/fr/auth/login`);
    
    const emailInput = page.locator('input[name="email"]');
    await emailInput.waitFor({ state: 'visible' });

    // Remplissage du chant de sécurité
    await emailInput.fill(testEmail);
    await page.fill('input[name="password"]', testPassword);
    
    console.log('⚡ Tentative de décollage (clic sur Envol)...');
    await page.click('button[type="submit"]');

    // 🛡️ SUTURE : On augmente la patience à 45s pour laisser Next.js compiler le Hub
    // On attend soit le succès, soit l'erreur.
    await Promise.race([
      page.waitForURL(/\/fr\/tom-hat-toes/, { timeout: 45000 }),
      page.waitForSelector('.bg-red-500\\/10', { state: 'visible', timeout: 45000 })
    ]);

    if (page.url().includes('tom-hat-toes')) {
      // 🛡️ SUTURE : On attend que le Hub soit réellement vivant
      await page.waitForSelector('h1', { state: 'visible', timeout: 15000 });
      await page.context().storageState({ path: authPath });
      console.log('✅ [Playwright] Passe-Partout scellé dans le Nexus !');
    } else {
      const errorMsg = await page.locator('.bg-red-500\\/10').textContent();
      throw new Error(`Le Nexus a rejeté le chant de l'Oiseau : ${errorMsg}`);
    }

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