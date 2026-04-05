import { chromium, FullConfig } from '@playwright/test';
import path from 'path';

async function globalSetup(config: FullConfig) {
  console.log('🤖 [Playwright] Le Premier Zoizo forge son Passe-Partout...');
  
  const { baseURL } = config.projects[0].use;
  const browser = await chromium.launch();
  // On crée un contexte isolé pour ne pas polluer les futures sessions
  const page = await browser.newPage();

  try {
    // 1. Navigation vers l'entrée du Hub
    await page.goto(`${baseURL}/fr/auth/login`);
    await page.waitForLoadState('load'); // Plus stable que networkidle dans certains environnements

    // 2. Identification (via variables d'env pour la pureté de la Silice)
    await page.fill('input[name="email"]', process.env.TEST_USER_EMAIL || 'geoffroydaillauddecaseneuve@gmail.com');
    await page.fill('input[name="password"]', process.env.TEST_USER_PASSWORD || '777MuSe!!!???');

    // 3. Le Grand Saut
    // On attend la navigation en parallèle du clic pour éviter les "race conditions"
    await Promise.all([
      page.waitForURL(`${baseURL}/fr/tom-hat-toes`, { timeout: 15000 }),
      page.click('button[type="submit"]')
    ]);

    // 4. Sauvegarde de l'état de la membrane (Session/Cookies)
    const authPath = path.join(__dirname, '.auth/user.json');
    await page.context().storageState({ path: authPath });
    
    console.log('✅ [Playwright] Passe-Partout scellé dans le Nexus !');
  } catch (error) {
    // En cas de brèche, on capture l'instant pour l'Artisan
    await page.screenshot({ path: path.join(__dirname, 'debug-collision-nexus.png') });
    console.error('🔥 [Playwright Error] La forge du Passe-Partout a échoué :', error);
    throw error; 
  } finally {
    await browser.close();
  }
}

export default globalSetup;