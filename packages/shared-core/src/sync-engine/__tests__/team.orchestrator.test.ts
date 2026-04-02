import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TeamOrchestrator } from '../team.orchestrator';
import { TeamModel, UserModel } from '@ilot/infrastructure';

// Mock des modèles pour ne pas polluer la vraie base de données
vi.mock('@ilot/infrastructure');



describe('TeamOrchestrator - Logique Métier', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

    it('doit valider le nom d’une escouade via le MoralChecker', async () => {
  // Assure-toi que ce nom est bien dans la liste noire de ton MoralChecker
  const badData = { 
    name: 'insulte-zoizo', // Un nom qui DOIT échouer
    creatorUid: 'user-123' 
  };

  // Optionnel : Si le checker ne bloque pas, on mocke le créateur pour voir l'erreur de morale
  // vi.spyOn(UserModel, 'findOne').mockResolvedValue({ _id: 'fake-id' } as any);

  await expect(TeamOrchestrator.fosterTeam(badData as any))
    .rejects.toThrow(/Nom invalide/);
});

  it('doit refuser un recrutement si l’oiseau n’est pas disponible', async () => {
    // 1. On simule un oiseau qui a fermé son nid
    (UserModel.findOne as any).mockResolvedValue({
      uid: 'oiseau-timide',
      isAvailableForTeamRequest: false 
    });

    // 2. On tente l'invitation et on s'attend à une erreur
    await expect(TeamOrchestrator.inviteBird('team-123', 'oiseau-timide'))
      .rejects.toThrow("Cet oiseau n'est pas disponible pour un recrutement.");
  });
});