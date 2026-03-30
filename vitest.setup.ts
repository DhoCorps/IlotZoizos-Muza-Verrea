import { vi } from 'vitest';

// On définit une URI fictive pour empêcher Mongoose de hurler pendant les tests
process.env.MONGODB_URI = 'mongodb://127.0.0.1:27017/ilot_zoizos_test';

// On peut aussi simuler d'autres variables si besoin (ex: NEXTAUTH_SECRET)
process.env.NEXTAUTH_SECRET = 'une_cle_tres_longue_et_stable_pour_mon_ilot_2026';