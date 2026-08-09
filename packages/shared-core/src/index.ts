/**
 * @file packages/shared-core/src/index.ts
 * Point d'entrée centralisé des exportations pour @ilot/shared-core
 */

// --- 1. ERREURS & TYPES GLOBAUX ---
export * from './errors/ilot.errors';
export * from '../src/types/shared.types';
export * from '../../types/src/core/bloc.types';
export type { UniversalGridCanvasProps } from '../../types/src/core/bloc.types';

// --- 2. INTEGRITY & MOTEURS MÉTIER ---
export * from './integrity/moral.checker';
export * from './utils/seve.engine';
export * from './utils/observatory.engine';

// --- 3. BLOC ENGINE & CANVAS ---
export * from './bloc-engine/useBlockEngine';
export * from './bloc-engine/UniversalBlockEngine';
export { UniversalGridCanvas } from '../src/bloc-engine/UniversalGridCanvas';

// --- 4. ECOMMERCE STORES ---
export * from '../src/ecommerce/useCartStore';
export * from '../src/ecommerce/useWishListStore';


// --- 5. SYNCHRONISATION & ORCHESTRATEURS ---
export * from './sync-engine/transactionManager';
export * from './sync-engine/user.orchestrator';
export * from './sync-engine/team.orchestrator';
export * from './sync-engine/project.orchestrator';
export * from './sync-engine/task.orchestrator';
export * from './sync-engine/kanban.orchestrator';
export * from './sync-engine/sujet.orchestrator';
export * from './sync-engine/partita.orchestrator';
export * from './sync-engine/letrinSprite.orchestrator';
export * from './sync-engine/kontakt.orchestrator';
export * from './sync-engine/ecommerce.orchestrator';
export * from './sync-engine/task.irrigation.orchestrator';
export * from './sync-engine/task.resonance.orchestrator';
export * from './sync-engine/resonance.orchestrator';
export * from './sync-engine/demopraxy.orchestrator';
export * from './sync-engine/sovereign.purge.orchestrator';
export * from './sync-engine/market.regulation.orchestrator';
export * from './sync-engine/consciousness.salon.orchestrator';
export * from './sync-engine/paymentTokenisation.orchestrator';
export * from './sync-engine/komptaPayment.orchestrator';

// --- 6. JEUX (LOGIQUE & TYPES) ---

export * from './games/engine/QuizScoringEngine'

// CrazyMorpion
export * from './games/crazymorpion/CrazyMorpionTypes';
export * from './games/crazymorpion/CrazyMorpionLogic';

// KoOonTreez
export * from './games/kooontreez/KoOonTreeZLogic';
export type { 
    QuizQuestion as KoOonTreezQuizQuestion, 
    KoOonTreezSoloMode, 
    KoOonTreezMode, 
    KoOonTreezLevel, 
    KoOonTreezOption, 
    KoOonTreezNbPlayer, 
    KoOonTreeZPlayer,
    FullCountryData 
} from './games/kooontreez/KoOonTreeZTypes';

// Atomik-K-Far
export * from './games/atomikkfar/Atomik-K-FarTypes';
export * from './games/atomikkfar/Atomik-K-FarLogic';

// CineMax
export * from './games/cinemax/CineMaxTypes';
export * from './games/cinemax/CineMaxLogic';

// Soon'Art
export * from './games/soonart/SoonArtTypes';
export * from './games/soonart/SoonArtLogic';

// Galak-T-K
export * from './games/galak-t-k/GalakTKTypes';
export * from './games/galak-t-k/GalakTKLogic';

// Plum'Zee
export * from './games/plumzee/PlumZeeTypes';
export * from './games/plumzee/PlumZeeLogic';

// L'Oracle de Wikipédia (WikiOracle)
export * from './games/wikiOracle/WikiOracleLogic';
export type { 
    QuizQuestion as WikiQuizQuestion, 
    WikiOracleChoicesMode, 
    WikiOracleTheme 
} from './games/wikiOracle/WikiOracleTypes';

export * from './sync-engine/monthlyStats.orchestrator';
export * from './sync-engine/komptaStats.orchestrator';

export * from './sync-engine/showcase.orchestrator';