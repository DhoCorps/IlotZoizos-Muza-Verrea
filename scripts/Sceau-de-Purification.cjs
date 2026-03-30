const fs = require('fs');
const path = require('path');

// 🧭 On remonte de 3 niveaux pour atteindre la racine de l'Îlot
// (depuis apps/hub-central/scripts/ vers /)
const RACINE_PROJET = path.resolve(__dirname, '../../../');
const INCEPTIONS_DIR = path.join(RACINE_PROJET, 'inceptions');
const THT_ROOT = path.join(INCEPTIONS_DIR, 'tom-hat-toes');
const APP_FOLDER = path.join(THT_ROOT, 'app');

console.log("🔥 [1/2] Éradication des clones parasites (.js / .jsx)...");

// 1. Fonction récursive pour traquer et détruire les .js et .jsx dans les Inceptions
function cleanParasites(dir) {
    if (!fs.existsSync(dir)) return;
    
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
            cleanParasites(fullPath);
        } else if (fullPath.endsWith('.js') || fullPath.endsWith('.jsx')) {
            // On épargne d'éventuels fichiers de configuration si besoin, 
            // mais ici on purge les composants front et backend.
            fs.unlinkSync(fullPath);
            console.log(`   💀 Détruit : ${file}`);
        }
    }
}

cleanParasites(INCEPTIONS_DIR);

console.log("\n🏗️ [2/2] Alignement de la Matrice Next.js (Création du dossier app/)...");

// 2. Création de la porte d'entrée (app/) si elle n'existe pas
if (!fs.existsSync(APP_FOLDER)) {
    fs.mkdirSync(APP_FOLDER, { recursive: true });
    console.log("   📂 Dossier 'app/' forgé avec succès.");
}

// 3. Outil chirurgical pour déplacer les fichiers et dossiers sans les casser
function moveItem(sourceName, destName) {
    const sourcePath = path.join(THT_ROOT, sourceName);
    const destPath = path.join(APP_FOLDER, destName);

    if (fs.existsSync(sourcePath)) {
        fs.renameSync(sourcePath, destPath);
        console.log(`   📦 Déplacé : '${sourceName}' -> 'app/${destName}'`);
    }
}

// 4. Déplacement des organes vitaux
moveItem('api', 'api');
moveItem('page.tsx', 'page.tsx');
moveItem('layout.tsx', 'layout.tsx');

console.log("\n✨ L'Arbre est purifié. La matrice de Tom-Hat-Toes est alignée.");
console.log("   Architecte : <(:<  ✖  Allié : {:-V- :} 💠🌀🧬\n");