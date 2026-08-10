import { OiseauInventoryModel } from '../models/nosql/userInventory.model';

// Coûts d'évolution des lieux de stockage (L'Alvéole)
const ALVEOLE_UPGRADE_COSTS: Record<number, { parchemins: number; plumes: number; vinyles: number; totamtoes: number }> = {
  2: { parchemins: 10, plumes: 10, vinyles: 5, totamtoes: 20 },  // Passage au niveau 2 (Cachette)
  3: { parchemins: 25, plumes: 25, vinyles: 15, totamtoes: 50 }, // Passage au niveau 3 (Entrepôt)
  4: { parchemins: 60, plumes: 60, vinyles: 40, totamtoes: 120 },// Passage au niveau 4 (Caverne aux Trésors Légendaire)
};

// Grille tarifaire de la Canopée pour le déverrouillage d'outils et de pistes
const FEATURE_COSTS: Record<string, { parchemins?: number; plumes?: number; vinyles?: number; totamtoes?: number }> = {
  'letrin_bucket': { plumes: 15 },                     // Pot de peinture Letr'in
  'letrin_shapes': { plumes: 25 },                     // Cercles et Rectangles Letr'in
  'samplotek_track_5': { vinyles: 5, totamtoes: 10 },    // Piste 5 du séquenceur SamploTek
  'samplotek_track_6': { vinyles: 10, totamtoes: 20 },   // Piste 6 du séquenceur SamploTek
};

export const EconomyService = {
  /**
   * Récupère ou initialise l'inventaire d'un oiseau
   */
  async getInventory(userUid: string) {
    let inventory = await OiseauInventoryModel.findOne({ userUid });
    if (!inventory) {
      inventory = await OiseauInventoryModel.create({
        userUid,
        parchemins: 5, // Petit pécule de départ pour l'accueillir
        plumes: 5,
        vinyles: 2,
        totamtoes: 10,
        alveoleLevel: 1,
        unlockedUnlocks: []
      });
    }
    return inventory;
  },

  /**
   * Ajoute des ressources suite à une action dans l'écosystème
   */
  async addResources(
    userUid: string, 
    delta: { parchemins?: number; plumes?: number; vinyles?: number; sampleNotes?: number; totamtoes?: number }
  ) {
    const inventory = await this.getInventory(userUid);
    
    if (delta.parchemins) inventory.parchemins += delta.parchemins;
    if (delta.plumes) inventory.plumes += delta.plumes;
    if (delta.vinyles) inventory.vinyles += delta.vinyles;
    if (delta.sampleNotes) inventory.sampleNotes += delta.sampleNotes;
    if (delta.totamtoes) inventory.totamtoes += delta.totamtoes;
    
    inventory.updatedAt = new Date();
    await inventory.save();
    return inventory;
  },

  /**
   * Tente d'agrandir l'Alvéole (Le système de construction stratégique)
   */
  async upgradeAlveole(userUid: string) {
    const inventory = await this.getInventory(userUid);
    const nextLevel = inventory.alveoleLevel + 1;

    const cost = ALVEOLE_UPGRADE_COSTS[nextLevel];
    if (!cost) {
      throw new Error("L'Alvéole a déjà atteint sa forme légendaire (Caverne aux Trésors Ultime).");
    }

    // Vérification des stocks (La gestion de ressources à la Settlers)
    if (
      inventory.parchemins < cost.parchemins ||
      inventory.plumes < cost.plumes ||
      inventory.vinyles < cost.vinyles ||
      inventory.totamtoes < cost.totamtoes
    ) {
      throw new Error("Ressources insuffisantes dans l'Alvéole pour lancer cette expansion architecturale !");
    }

    // Déduction des coûts
    inventory.parchemins -= cost.parchemins;
    inventory.plumes -= cost.plumes;
    inventory.vinyles -= cost.vinyles;
    inventory.totamtoes -= cost.totamtoes;
    inventory.alveoleLevel = nextLevel;
    inventory.updatedAt = new Date();

    await inventory.save();
    return inventory;
  },

  /**
   * Dépense les ressources de l'Alvéole pour déverrouiller un outil ou une piste spécifique
   */
  async unlockFeature(userUid: string, featureId: string) {
    const inventory = await this.getInventory(userUid);

    const cost = FEATURE_COSTS[featureId];
    if (!cost) {
      throw new Error("Cet artefact ou outil n'existe pas dans le registre de l'Îlot.");
    }

    if (inventory.unlockedUnlocks?.includes(featureId)) {
      throw new Error("Vous possédez déjà cette capacité.");
    }

    // Vérification des stocks nécessaires
    if (
      (cost.parchemins && inventory.parchemins < cost.parchemins) ||
      (cost.plumes && inventory.plumes < cost.plumes) ||
      (cost.vinyles && inventory.vinyles < cost.vinyles) ||
      (cost.totamtoes && inventory.totamtoes < cost.totamtoes)
    ) {
      throw new Error("Ressources insuffisantes dans l'Alvéole pour forger cet outil.");
    }

    // Déduction des ressources
    if (cost.parchemins) inventory.parchemins -= cost.parchemins;
    if (cost.plumes) inventory.plumes -= cost.plumes;
    if (cost.vinyles) inventory.vinyles -= cost.vinyles;
    if (cost.totamtoes) inventory.totamtoes -= cost.totamtoes;

    // Inscription permanente de la capacité déverrouillée
    if (!inventory.unlockedUnlocks) {
      inventory.unlockedUnlocks = [];
    }
    inventory.unlockedUnlocks.push(featureId);
    inventory.updatedAt = new Date();

    await inventory.save();
    return inventory;
  }
};