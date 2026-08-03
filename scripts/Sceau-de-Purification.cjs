// scripts/Sceau-de-Purification-Global.cjs
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const neo4j = require('neo4j-driver');

// 🧭 Chemins et ancrages de l'Îlot
const RACINE_PROJET = path.resolve(__dirname, '../../../');
const INCEPTIONS_DIR = path.join(RACINE_PROJET, 'inceptions');
const THT_ROOT = path.join(INCEPTIONS_DIR, 'tom-hat-toes');
const APP_FOLDER = path.join(THT_ROOT, 'app');

async function lancerPurificationGlobale() {
    console.log("🔥 [1/3] Éradication des clones parasites (.js / .jsx)...");

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
                fs.unlinkSync(fullPath);
                console.log(`   💀 Détruit : ${file}`);
            }
        }
    }

    cleanParasites(INCEPTIONS_DIR);

    console.log("\n🏗️ [2/3] Alignement de la Matrice Next.js (Création du dossier app/)...");

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

    console.log("\n🔮 [3/3] Sceau de Purification des Arêtes (Audit Silice ↔ Neo4j)...");

    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/ilot-zoizos';
    const neo4jUri = process.env.NEO4J_URI || 'bolt://localhost:7687';
    const neo4jUser = process.env.NEO4J_USER || 'neo4j';
    const neo4jPassword = process.env.NEO4J_PASSWORD || 'password';

    let driver = null;
    try {
        // Connexion Silice (MongoDB)
        await mongoose.connect(mongoUri);
        console.log("   🟢 Connexion à la Silice (MongoDB) établie pour l'audit.");

        // Connexion Graphe (Neo4j)
        driver = neo4j.driver(neo4jUri, neo4j.auth.basic(neo4jUser, neo4jPassword));
        const session = driver.session();

        try {
            // Audit des Partitas orphelines dans le Graphe
            const partitaResult = await session.run(`
                MATCH (p:Partita)
                RETURN p.uid AS uid
            `);
            const partitaUidsInGraph = partitaResult.records.map(r => r.get('uid'));
            
            const PartitaModel = mongoose.models.Partita || mongoose.model('Partita', new mongoose.Schema({ uid: String }));
            const existingPartitas = await PartitaModel.find({ uid: { $in: partitaUidsInGraph } }).lean();
            const existingPartitaUids = new Set(existingPartitas.map(p => p.uid));

            let purgedPartitas = 0;
            for (const uid of partitaUidsInGraph) {
                if (!existingPartitaUids.has(uid)) {
                    await session.run(`MATCH (p:Partita {uid: $uid}) DETACH DELETE p`, { uid });
                    purgedPartitas++;
                }
            }
            console.log(`   🧹 Partitas orphelines purgées du graphe : ${purgedPartitas}`);

            // Audit des Sujets orphelins dans le Graphe
            const sujetResult = await session.run(`
                MATCH (s:Sujet)
                RETURN s.uid AS uid
            `);
            const sujetUidsInGraph = sujetResult.records.map(r => r.get('uid'));

            const SujetModel = mongoose.models.Sujet || mongoose.model('Sujet', new mongoose.Schema({ uid: String }));
            const existingSujets = await SujetModel.find({ uid: { $in: sujetUidsInGraph } }).lean();
            const existingSujetUids = new Set(existingSujets.map(s => s.uid));

            let purgedSujets = 0;
            for (const uid of sujetUidsInGraph) {
                if (!existingSujetUids.has(uid)) {
                    await session.run(`MATCH (s:Sujet {uid: $uid}) DETACH DELETE s`, { uid });
                    purgedSujets++;
                }
            }
            console.log(`   🧹 Sujets orphelins purgés du graphe : ${purgedSujets}`);

        } finally {
            await session.close();
        }

    } catch (err) {
        console.warn("   ⚠️ Avertissement d'audit (bases de données non jointes ou éteintes) :", err.message);
    } finally {
        if (driver) await driver.close();
        await mongoose.disconnect();
    }

    console.log("\n✨ L'Îlot est purifié, structuré et harmonisé.");
    console.log("   Architecte : <(:<  ✖  Allié : {:-V- :} 💠🌀🧬\n");
}

lancerPurificationGlobale();