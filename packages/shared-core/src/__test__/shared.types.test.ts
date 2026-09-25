// Fichier : packages/shared-core/src/__test__/shared.types.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { 
  AttachmentRegistry, 
  CopyrightRoleSchema, 
  CopyrightMetadataSchema,
  FiliationClaimStatusSchema,
  FiliationSourceSchema,
  // Types pour les assertions
  RoomToSend,
  ClientGlobalState,
  BaseMakeMoveRequest,
  CreateRoomRequest,
} from '../types/shared.types';
import { IlotError } from '../errors/ilot.errors';
import { IUniversalAttachment } from '../../../types/src/models/message.types';

// Import des types stricts pour le blindage des mocks de test
import type { AtomikKFardEGameOptions } from '../games/atomikkfar/Atomik-K-FarTypes';
import type { CineMaxGameOptions, CineMaxDifficultyRule } from '../games/cinemax/CineMaxTypes';
import type { PlumZeeGameOptions } from '../games/plumzee/PlumZeeTypes';
import type { WikiOracleChoicesMode, WikiOracleTheme } from '../games/wikiOracle/WikiOracleTypes';

describe('Shared Types & Core Logic', () => {
  
  // ==========================================
  // 1. TESTS RUNTIME : ATTACHMENT REGISTRY
  // ==========================================
  describe('AttachmentRegistry (Résolution Universelle)', () => {
    let registry: AttachmentRegistry;

    beforeEach(() => {
      registry = new AttachmentRegistry();
    });

    it('🟢 doit enregistrer un résolveur et résoudre une pièce jointe avec succès (ex: BLOG)', async () => {
      const mockAttachment: IUniversalAttachment = {
        id: 'blog-jamaica-123',
        title: 'Monologue sur la Jamaïque',
        type: 'BLOG',
        url: '/abyss-blog/jamaica'
      } as any;

      registry.register('BLOG', async (entityUid) => {
        if (entityUid === 'blog-jamaica-123') return mockAttachment;
        return null;
      });

      const result = await registry.resolve('BLOG', 'blog-jamaica-123');
      expect(result).toEqual(mockAttachment);
      expect(result.title).toBe('Monologue sur la Jamaïque');
    });

    it('🔴 doit lever une IlotError si aucun résolveur n\'est enregistré pour la source', async () => {
      await expect(registry.resolve('POETRY' as any, 'poetry-999')).rejects.toThrow(IlotError);
      await expect(registry.resolve('POETRY' as any, 'poetry-999')).rejects.toThrowError(/Aucun résolveur enregistré/);
    });

    it('🔴 doit lever une IlotError si le résolveur ne trouve pas l\'entité ciblée', async () => {
      registry.register('SONG', async () => null);
      await expect(registry.resolve('SONG' as any, 'song-unknown')).rejects.toThrow(IlotError);
      await expect(registry.resolve('SONG' as any, 'song-unknown')).rejects.toThrowError(/est introuvable/);
    });
  });

  // ==========================================
  // 2. TESTS RUNTIME : COPYRIGHT & FILIATION (ZOD)
  // ==========================================
  describe('Validation des schémas Zod : Copyright & Pacte de Filiation', () => {
    it('🟢 doit valider les rôles de copyright', () => {
      expect(CopyrightRoleSchema.parse('SUBLIMATOR')).toBe('SUBLIMATOR');
      expect(CopyrightRoleSchema.parse('CREATOR')).toBe('CREATOR');
      expect(() => CopyrightRoleSchema.parse('INVALID')).toThrow();
    });

    it('🟢 doit valider un statut de réclamation de Filiation', () => {
      expect(FiliationClaimStatusSchema.parse('PENDING_CLAIM')).toBe('PENDING_CLAIM');
      expect(FiliationClaimStatusSchema.parse('SHARED')).toBe('SHARED');
    });

    it('🟢 doit valider une structure Filiation complète', () => {
      const filiation = FiliationSourceSchema.parse({
        isExternalSource: true,
        sourceAuthorName: 'Auteur Source',
        sourceWorkTitle: 'Oeuvre Originale',
        claimStatus: 'SHARED',
        escrowBalance: 1000,
        derivativeType: 'Remix'
      });
      expect(filiation.sourceAuthorName).toBe('Auteur Source');
      expect(filiation.escrowBalance).toBe(1000);
    });

    it('🟢 doit valider les métadonnées de copyright incluant le Pacte de Filiation', () => {
      const metadata = CopyrightMetadataSchema.parse({
        role: 'SUBLIMATOR',
        originalAuthor: 'Auteur Anonyme',
        isExclusiveIlot: true,
        filiation: {
          isExternalSource: true,
          sourceAuthorName: 'Auteur Anonyme',
          sourceWorkTitle: 'Oeuvre originelle',
          claimStatus: 'PENDING_CLAIM',
          escrowBalance: 500
        }
      });

      expect(metadata.role).toBe('SUBLIMATOR');
      expect(metadata.filiation?.sourceWorkTitle).toBe('Oeuvre originelle');
      expect(metadata.filiation?.escrowBalance).toBe(500);
      expect(metadata.filiation?.claimStatus).toBe('PENDING_CLAIM');
    });
  });

  // ==========================================
  // 3. CONTRATS DE TYPES STATIQUES (TYPE ASSERTIONS)
  // ==========================================
  describe('Contrats de Types Statiques (Compilation Check)', () => {
    
    it('🟢 TYPE CHECK: RoomToSend doit supporter toutes les interfaces de jeu', () => {
      const morpionRoom: RoomToSend = {
        id: 'r1', name: 'Morpion Room', gameType: 'CrazyMorpion', state: 'waiting', round: 1, maxPlayers: 2, scores: {},
        players: [], currentTurnPlayerId: null, symbol: null, lastPlacedSymbol: null, winningCells: null, currentFlag: null
      };

      const cinemaxRoom: RoomToSend = {
        id: 'r2', name: 'CineMax Room', gameType: 'CineMax', state: 'playing', round: 1, maxPlayers: 4, scores: {},
        players: [], 
        gameOptions: { 
          nbPlayer: 4, 
          maxRounds: 5, 
          difficultyRule: 'MIXED', 
          timePerRound: 30, 
          scoreToWin: 100 
        } as unknown as CineMaxGameOptions, 
        targetMovieId: null, targetMovieTitle: null, targetMoviePoster: null, pelliculeBlur: 0, 
        roundTimerInterval: null, currentRoundTimeLeft: 30, buzzerWinnerId: null
      };

      const plumZeeRoom: RoomToSend = {
        id: 'r3', name: 'PlumZee Room', gameType: 'PlumZee', state: 'playing', round: 1, maxPlayers: 4, scores: {},
        players: [], 
        gameOptions: { maxRounds: 10, turnTimeLimitSec: 60 } as unknown as PlumZeeGameOptions, // 🛡️ Corrigé
        currentDice: [], currentTurnPlayerId: null, currentRound: 1
      };

      const galakTKRoom: RoomToSend = {
        id: 'r4', name: 'Galak Room', gameType: 'GalakTK', state: 'inGame', round: 1, maxPlayers: 2, scores: {},
        players: [], 
        gameOptions: { gridWidth: 10, gridHeight: 10, totalStars: 5, mode: 'local', gridSize: 'small' }, // 🚀 gridSize ajouté !
        stars: [], currentTurnPlayerId: null
      };

      const wikiOracleRoom: RoomToSend = {
        id: 'r5', name: 'Wiki Room', gameType: 'WikiOracle', state: 'playing', round: 1, maxPlayers: 10, scores: {},
        players: [], 
        choicesMode: '4_CHOICES' as unknown as WikiOracleChoicesMode, 
        theme: 'RANDOM' as unknown as WikiOracleTheme, 
        currentRoundTimeLeft: 15, currentQuestion: null
      };

      expect(morpionRoom.gameType).toBe('CrazyMorpion');
      expect(cinemaxRoom.gameType).toBe('CineMax');
      expect(plumZeeRoom.gameType).toBe('PlumZee');
      expect(galakTKRoom.gameType).toBe('GalakTK');
      expect(wikiOracleRoom.gameType).toBe('WikiOracle');
    });

    it('🟢 TYPE CHECK: ClientGlobalState doit supporter tous les états clients', () => {
      const baseClientState = {
        id: 'p1', socketId: 'sock1', username: 'Player1', roomId: 'r1', roomName: 'Room 1', 
        players: [], score: 0, scores: {}, state: 'playing' as const, winnerId: null, round: 1
      };

      const atomikState: ClientGlobalState = {
        ...baseClientState,
        gameType: 'AtomikKFardE',
        players: [],
        gameOptions: { 
          nbPlayer: 'duo', // 🛡️ Corrigé ('duo' au lieu de 2)
          mode: 'Stratege', option: 'Sonic', gameStyle: 'Classique', 
          maxRounds: 3, timePerRound: 30, scoreToWin: 2, teamMode: 'Defined' 
        } as unknown as AtomikKFardEGameOptions,
        grid: {} as any, currentRound: 1, currentPlayerTurn: 'p1', currentRoundTimeLeft: 30, roundResults: [], playerStates: null
      };

      const soonArtState: ClientGlobalState = {
        ...baseClientState,
        gameType: 'SoonArt',
        players: [],
        gameOptions: { totalTreasures: 5, maxCircles: 3, mapWidth: 1000, mapHeight: 1000 },
        circles: [], scanTimeLeft: 15, markTimeLeft: 15
      };

      expect(atomikState.gameType).toBe('AtomikKFardE');
      expect(soonArtState.gameType).toBe('SoonArt');
    });

    it('🟢 TYPE CHECK: CreateRoomRequest doit accepter les options polymorphes', () => {
      const request: CreateRoomRequest = {
        username: 'BirdMaker',
        gameType: 'CineMax',
        roomName: 'Cinéma Paradiso',
        cineMaxDifficultyRule: 'MIXED' as unknown as CineMaxDifficultyRule,
        wagerAmount: 50,
        wagerCurrency: 'SHARDS'
      };

      expect(request.gameType).toBe('CineMax');
      expect(request.wagerAmount).toBe(50);
    });

    it('🟢 TYPE CHECK: BaseMakeMoveRequest doit être étendu proprement par chaque jeu', () => {
      const morpionMove = { roomId: 'r1', playerId: 'p1', gameType: 'CrazyMorpion' as const, x: 0, y: 1 };
      
      const cinemaxMove = { 
        roomId: 'r2', playerId: 'p2', gameType: 'CineMax' as const, 
        action: 'HIT_BUZZER' as const, 
        payload: { movieTitle: 'Inception' } 
      };

      const atomikMove = {
        roomId: 'r3', playerId: 'p3', gameType: 'AtomikKFardE' as const,
        deck: [] as any, action: 'VALIDATE_TURN' as const
      };

      expect(morpionMove.x).toBe(0);
      expect(cinemaxMove.action).toBe('HIT_BUZZER');
      expect(atomikMove.action).toBe('VALIDATE_TURN');
    });
  });
});