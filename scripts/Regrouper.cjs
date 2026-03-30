const fs = require('fs');
const path = require('path');

// On remonte de 3 niveaux pour atteindre la racine du monorepo
// car le script est dans apps/hub-api/scripts
const RACINE_PROJET = path.resolve(__dirname, '../');
const FICHIER_SORTIE = path.join(RACINE_PROJET, 'NOTRE_CODE_ILOT.md');

const IGNORE = [
  'node_modules', '.next', '.git', 'dist', 'build', 
  '.vercel', 'public', '.cache', '.next', 'package-lock.json'
];
const EXTENSIONS = ['.ts', '.tsx', '.json', '.cjs'];

let contenuGlobal = "# ARCHIVE DU PROJET ILOT ZOIZOS\n\n";
let compteurFichiers = 0;

function scan(dir) {
    try {
        const files = fs.readdirSync(dir);
        for (const file of files) {
            const fullPath = path.join(dir, file);
            const relativePath = path.relative(RACINE_PROJET, fullPath);
            
            if (IGNORE.some(term => relativePath.includes(term))) continue;

            const stat = fs.statSync(fullPath);
            if (stat.isDirectory()) {
                scan(fullPath);
            } else if (EXTENSIONS.includes(path.extname(fullPath))) {
                try {
                    const code = fs.readFileSync(fullPath, 'utf8');
                    contenuGlobal += `\n### FICHIER : ${relativePath}\n\n`;
                    contenuGlobal += "```" + path.extname(fullPath).slice(1) + "\n";
                    contenuGlobal += code;
                    contenuGlobal += "\n```\n\n---\n";
                    compteurFichiers++;
                } catch (e) {}
            }
        }
    } catch (e) {}
}

console.log("🛠️  Génération de l'archive en cours...");
scan(RACINE_PROJET);
fs.writeFileSync(FICHIER_SORTIE, contenuGlobal);
console.log(`✅ Succès ! ${compteurFichiers} fichiers regroupés.`);
console.log(`📍 Fichier disponible ici : ${FICHIER_SORTIE}`);