// Fichier : packages/shared-core/src/games/kooontreez/__test__/KoOonTreeZTypes.test.ts
import { describe, it, expect } from 'vitest';
import type {
    CurrentFlag,
    FullCountryData,
    QuizQuestion,
    KoOonTreeZGameRoom
} from '../../games/kooontreez/KoOonTreeZTypes';

describe('KoOonTreeZ Types & Contracts', () => {

    describe('Contrats de Types Statiques (Compilation Check)', () => {

        it('🟢 TYPE CHECK: CurrentFlag doit structurer les informations visuelles et textuelles d\'un drapeau', () => {
            const flag: CurrentFlag = {
                id: 'fr',
                countryName: 'France',
                countryCapital: 'Paris',
                imageUrl: 'https://flagcdn.com/fr.svg',
                alt: 'Drapeau de la France'
            };

            expect(flag.id).toBe('fr');
            expect(flag.countryCapital).toBe('Paris');
        });

        it('🟢 TYPE CHECK: FullCountryData doit intégrer les métadonnées géographiques et monétaires', () => {
            const country: FullCountryData = {
                cca2: 'FR',
                name: {
                    common: 'France',
                    official: 'République française'
                },
                capital: ['Paris'],
                flags: {
                    svg: 'https://flagcdn.com/fr.svg',
                    alt: 'Drapeau de la France'
                },
                region: 'Europe',
                population: 67000000,
                continents: ['Europe'],
                currencies: {
                    EUR: { name: 'Euro', symbol: '€' }
                }
            };

            expect(country.cca2).toBe('FR');
            expect(country.capital?.[0]).toBe('Paris');
            expect(country.currencies?.EUR.symbol).toBe('€');
        });

        it('🟢 TYPE CHECK: QuizQuestion doit lier une question de drapeau aux propositions', () => {
            const question: QuizQuestion = {
                question: 'Quel est ce pays ?',
                correctAnswer: 'France',
                options: ['France', 'Italie', 'Espagne', 'Allemagne'],
                currentFlag: {
                    id: 'fr',
                    countryName: 'France',
                    countryCapital: 'Paris',
                    imageUrl: 'https://flagcdn.com/fr.svg',
                    alt: 'Drapeau'
                },
                mode: 'DvsP'
            };

            expect(question.correctAnswer).toBe('France');
            expect(question.options.length).toBe(4);
            expect(question.mode).toBe('DvsP');
        });

        it('🟢 TYPE CHECK: KoOonTreeZGameRoom doit encapsuler l\'état global et les ensembles de suivi (Sets, Maps)', () => {
            const room: KoOonTreeZGameRoom = {
                gameType: 'KoOonTreeZ',
                id: 'room_koon_1',
                name: 'Front Européen',
                state: 'playing',
                round: 1,
                maxPlayers: 4,
                scores: { 'player_1': 50 },
                players: [],
                winnerId: null,
                expectedAnswer: 'Paris',
                kooonTreezNbPlayer: 'duo',
                kooonTreezMode: 'DvsP',
                kooonTreezOption: 'Blitzkrieg',
                kooonTreezLevel: 'normal',
                kooonTreezSoloMode: 'challenge',
                currentRoundTimeLeft: 20,
                roundTimerInterval: null,
                playerDisconnectTimers: new Map(),
                totalFlagsRecognized: 3,
                targetFlagsCount: 10,
                currentFlag: {
                    id: 'fr',
                    countryName: 'France',
                    countryCapital: 'Paris',
                    imageUrl: 'https://flagcdn.com/fr.svg',
                    alt: 'Drapeau'
                },
                allCountries: [],
                usedCountryIds: new Set(['fr']),
                playersAnsweredThisRound: new Set(['player_1']),
                correctAnswerGivenThisRound: true,
                lastCorrectAnswererId: 'player_1'
            };

            expect(room.gameType).toBe('KoOonTreeZ');
            expect(room.kooonTreezNbPlayer).toBe('duo');
            expect(room.usedCountryIds.has('fr')).toBe(true);
            expect(room.playerDisconnectTimers).toBeInstanceOf(Map);
        });
    });
});