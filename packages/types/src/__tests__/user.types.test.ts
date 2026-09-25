import { describe, it, expect } from 'vitest';
import { OiseauSchema, OiseauSeedSchema, OiseauLeafSchema } from '../core/user.types';

describe('Oiseau Zod Schemas (L\'Identité et le Sanctuaire)', () => {
    it('🟢 doit valider un profil d Oiseau complet et correct avec les valeurs par défaut', () => {
        const validData = {
            uid: 'bird_123',
            pseudo: 'Faucon Sélénite',
            email: 'oiseau@ilot.co',
            signature: 'sig_abcxyz',
        };

        const result = OiseauSchema.safeParse(validData);

        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.frequenceHEX).toBe('#2F4F4F'); // Valeur par défaut
            expect(result.data.entropieActive).toBe(100);
            expect(result.data.sanctuaireVerrouille).toBe(false);
            expect(result.data.teams).toEqual([]);
            expect(result.data.documents).toEqual([]);
        }
    });

    it('🔴 doit rejeter un pseudo trop court ou non conforme dans la Graine', () => {
        const invalidSeed = {
            uid: 'bird_123',
            pseudo: 'Fi', // Trop court (< 3 caractères)
            email: 'oiseau@ilot.co',
            signature: 'sig_abc',
        };

        const result = OiseauSeedSchema.safeParse(invalidSeed);
        expect(result.success).toBe(false);
    });

    it('🔴 doit rejeter un format de couleur HEX invalide pour frequenceHEX', () => {
        const invalidColor = {
            uid: 'bird_123',
            pseudo: 'Faucon Sélénite',
            email: 'oiseau@ilot.co',
            signature: 'sig_abc',
            frequenceHEX: 'invalid_color', // Pas un hexadécimal valide
        };

        const result = OiseauSeedSchema.safeParse(invalidColor);
        expect(result.success).toBe(false);
    });

    it('🟢 doit accepter un code HEX valide (court ou long)', () => {
        const validColorShort = {
            uid: 'bird_123',
            pseudo: 'Faucon Sélénite',
            email: 'oiseau@ilot.co',
            signature: 'sig_abc',
            frequenceHEX: '#FFF',
        };

        const validColorLong = {
            uid: 'bird_123',
            pseudo: 'Faucon Sélénite',
            email: 'oiseau@ilot.co',
            signature: 'sig_abc',
            frequenceHEX: '#2D3748',
        };

        expect(OiseauSeedSchema.safeParse(validColorShort).success).toBe(true);
        expect(OiseauSeedSchema.safeParse(validColorLong).success).toBe(true);
    });

    it('🟢 doit valider correctement le Sanctuaire polymorphe et ses nouveaux attributs', () => {
        const leafData = {
            sanctuaire: { citation: 'Libre comme l\'air', niveau: 42, actif: true, rien: null },
            sanctuaireVerrouille: true,
            entropieActive: 75,
            teams: [{ id: 'team_1', name: 'Canopée Principale', role: 'Architecte' }],
        };

        const result = OiseauLeafSchema.safeParse(leafData);

        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.sanctuaireVerrouille).toBe(true);
            expect(result.data.entropieActive).toBe(75);
            expect(result.data.teams[0].name).toBe('Canopée Principale');
        }
    });

    it('🔴 doit rejeter une entropie hors limites (supérieure à 100 ou inférieure à 0)', () => {
        const leafDataOutOfRange = {
            entropieActive: 150, // Max 100
        };

        const result = OiseauLeafSchema.safeParse(leafDataOutOfRange);
        expect(result.success).toBe(false);
    });

    describe('💼 Validation du Profil Professionnel (CV Source of Truth)', () => {
        it('🟢 doit valider un profil CV complet avec le TJM Freelance et préférences de télétravail', () => {
            const leafWithCv = {
                cvProfile: {
                    catchphrase: "Développeur full-stack passionné par les graphes.",
                    professionalStatus: "FREELANCE",
                    remotePreference: "FULL_REMOTE",
                    freelanceDailyRateCents: 45000, // 450€ / jour
                    isRateNegotiable: true,
                    experiences: [
                        {
                            title: "Lead Dev",
                            company: "Muza-Verrea",
                            startDate: "2023-01-01",
                            isVisibleInCv: true // Expérience publique
                        },
                        {
                            title: "Stagiaire",
                            company: "Ancienne Boite Nulle",
                            startDate: "2018-01-01",
                            endDate: "2018-06-30",
                            isVisibleInCv: false // 👁️ Masqué intelligemment du CV final
                        }
                    ],
                    hobbies: ["Origami", "Guitare"]
                }
            };

            const result = OiseauLeafSchema.safeParse(leafWithCv);
            expect(result.success).toBe(true);

            if (result.success && result.data.cvProfile) {
                expect(result.data.cvProfile.professionalStatus).toBe("FREELANCE");
                expect(result.data.cvProfile.freelanceDailyRateCents).toBe(45000);
                expect(result.data.cvProfile.experiences[1].isVisibleInCv).toBe(false);
            }
        });

        it('🔴 doit rejeter une expérience pro si les dates ou informations clés sont invalides', () => {
            const badCvLeaf = {
                cvProfile: {
                    experiences: [
                        {
                            title: "D", // Trop court
                            company: "", // Vide
                            startDate: "not-a-date"
                        }
                    ]
                }
            };

            const result = OiseauLeafSchema.safeParse(badCvLeaf);
            expect(result.success).toBe(false);
        });
    });
});