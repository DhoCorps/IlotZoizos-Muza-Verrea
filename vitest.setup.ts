// apps/hub-central/__test__/vitest.setup.ts

import { vi } from 'vitest';

// --- CORE SYMBIOTIQUE (FORGE DE L'OMEGA) ---

// Hoom. Remplacer 'testuser' et 'testpassword' par les credentials de ton local test DB
// Format : mongodb://user:password@host:port/database

process.env.MONGODB_URI = 'mongodb://admin:password1234@127.0.0.1:27017/ilotzoizos';

// --- FIN DE LA FORGE ---

// On peut aussi simuler d'autres variables si besoin (ex: NEXTAUTH_SECRET)
process.env.NEXTAUTH_SECRET = 'une_cle_tres_longue_et_stable_pour_mon_ilot_2026';