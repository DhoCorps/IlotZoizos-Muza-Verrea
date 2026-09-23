import { TransactionManager } from './transactionManager';
import { ActionSignature } from '@ilot/types';
import { IlotError } from '../errors/ilot.errors';
import { RaffleModel, TicketModel, ProductModel } from '@ilot/infrastructure';
import crypto from 'crypto';

export interface RaffleSyncResult {
  success: boolean;
  raffleUid?: string;
  ticketUid?: string;
  winnerUid?: string;
  message?: string;
}

export interface CreateRafflePayload {
  uid: string;
  prizeProductUid: string;
  ticketPriceShards: number;
  maxTickets?: number;
  drawDate: Date;
}

export class RaffleOrchestrator {
  
  /**
   * 🎫 CRÉATION DE LA LOTERIE (Limite de 1 par Vendeur)
   */
  async createRaffle(data: CreateRafflePayload, signature: ActionSignature): Promise<RaffleSyncResult> {
    if (!signature.actorUid) throw new IlotError("Oiseau non authentifié", "UNAUTHORIZED", 401);
    const creatorUid = signature.actorUid;

    // 1. Vérifier si le vendeur a déjà une loterie OPEN (Mongoose)
    const activeRaffle = await RaffleModel.findOne({ creatorUid, status: 'OPEN' });
    if (activeRaffle) {
      throw new IlotError("Vous avez déjà une loterie en cours. Limite fixée à 1.", "FORBIDDEN", 403);
    }

    return await TransactionManager.execute("Création Loterie", async (mongoSession, neo4jTx) => {
      // 2. Créer le document Mongoose (Immuable sur drawDate via le modèle)
      const insertedRaffles = await RaffleModel.insertMany([{
        uid: data.uid,
        creatorUid,
        prizeProductUid: data.prizeProductUid,
        ticketPriceShards: data.ticketPriceShards,
        maxTickets: data.maxTickets,
        drawDate: data.drawDate,
        status: 'OPEN'
      }], { session: mongoSession });

      // 3. Créer le noeud Neo4j pour l'ancrer dans le Graphe
      const query = `
        MATCH (u:User {uid: $creatorUid})
        CREATE (r:Raffle {uid: $uid, status: 'OPEN', drawDate: datetime($drawDate)})
        CREATE (u)-[:CREATED_RAFFLE]->(r)
      `;
      await neo4jTx.run(query, {
        creatorUid,
        uid: data.uid,
        drawDate: data.drawDate.toISOString()
      });

      return { success: true, raffleUid: insertedRaffles[0].uid };
    });
  }

  /**
   * 🎟️ ACHAT D'UN TICKET DE LOTERIE
   */
  async buyTicket(raffleUid: string, signature: ActionSignature): Promise<RaffleSyncResult> {
    if (!signature.actorUid) throw new IlotError("Oiseau non authentifié", "UNAUTHORIZED", 401);
    const buyerUid = signature.actorUid;

    return await TransactionManager.execute("Achat Ticket", async (mongoSession, neo4jTx) => {
      // 1. Récupérer la loterie
      const raffle = await RaffleModel.findOne({ uid: raffleUid }).session(mongoSession);
      if (!raffle || raffle.status !== 'OPEN') throw new IlotError("Loterie introuvable ou fermée", "NOT_FOUND", 404);
      
      if (new Date() > raffle.drawDate) throw new IlotError("Le tirage a déjà expiré", "FORBIDDEN", 403);

      // Vérifier la limite de tickets
      const currentTicketsCount = await TicketModel.countDocuments({ raffleUid }).session(mongoSession);
      if (raffle.maxTickets && currentTicketsCount >= raffle.maxTickets) {
        throw new IlotError("Plus aucun ticket disponible pour cette loterie", "FORBIDDEN", 403);
      }

      // 2. Vérifier et débiter les Éclats via Neo4j
      const balanceQuery = `MATCH (u:User {uid: $buyerUid}) RETURN u.shardsBalance AS balance`;
      const balanceRes = await neo4jTx.run(balanceQuery, { buyerUid });
      if (balanceRes.records.length === 0) throw new IlotError("Acheteur introuvable", "NOT_FOUND", 404);
      
      const balance = balanceRes.records[0].get('balance') as number || 0;
      if (balance < raffle.ticketPriceShards) {
        throw new IlotError("Fonds karmiques (Éclats) insuffisants", "PAYMENT_REQUIRED", 402);
      }

      // Débit
      await neo4jTx.run(
        `MATCH (u:User {uid: $buyerUid}) SET u.shardsBalance = u.shardsBalance - $price`,
        { buyerUid, price: raffle.ticketPriceShards }
      );

      // 3. Générer le Ticket (Mongoose)
      const ticketNumber = currentTicketsCount + 1;
      const insertedTickets = await TicketModel.insertMany([{
        raffleUid,
        buyerUid,
        ticketNumber
      }], { session: mongoSession });

      // 4. Créer le lien de possession dans Neo4j
      await neo4jTx.run(`
        MATCH (u:User {uid: $buyerUid}), (r:Raffle {uid: $raffleUid})
        CREATE (u)-[:HOLDS_TICKET]->(r)
      `, { buyerUid, raffleUid });

      return { success: true, ticketUid: insertedTickets[0].uid };
    });
  }

  /**
   * ⚖️ LE TIRAGE AU SORT (LE SACRÉ)
   */
  async executeDraw(raffleUid: string): Promise<RaffleSyncResult> {
    return await TransactionManager.execute("Tirage au Sort", async (mongoSession, neo4jTx) => {
      // 1. Récupérer la loterie et les tickets
      const raffle = await RaffleModel.findOne({ uid: raffleUid }).session(mongoSession);
      if (!raffle || raffle.status !== 'OPEN') throw new IlotError("Loterie introuvable ou déjà tirée", "BAD_REQUEST", 400);

      const tickets = await TicketModel.find({ raffleUid }).session(mongoSession);

      // Si aucun ticket n'a été vendu
      if (tickets.length === 0) {
        await RaffleModel.updateOne({ uid: raffleUid }, { status: 'CANCELLED' }).session(mongoSession);
        await neo4jTx.run(`MATCH (r:Raffle {uid: $raffleUid}) SET r.status = 'CANCELLED'`, { raffleUid });
        return { success: true, message: "Annulée faute de participants" };
      }

      // 2. HASARD CRYPTOGRAPHIQUE : Tirage du Gagnant
      const winnerIndex = crypto.randomInt(0, tickets.length);
      const winningTicket = tickets[winnerIndex];
      const winnerUid = winningTicket.buyerUid;

      // 3. Mettre à jour les statuts
      await RaffleModel.updateOne({ uid: raffleUid }, { status: 'DRAWN' }).session(mongoSession);
      await neo4jTx.run(`MATCH (r:Raffle {uid: $raffleUid}) SET r.status = 'DRAWN'`, { raffleUid });

      // 4. Transférer la propriété de l'Artefact au Gagnant
      await ProductModel.updateOne(
        { uid: raffle.prizeProductUid }, 
        { ownerUid: winnerUid }
      ).session(mongoSession);

      // Neo4j : Détacher de la boutique et lier au nouveau propriétaire
      await neo4jTx.run(`
        MATCH (p:Product {uid: $productUid})
        MATCH (winner:User {uid: $winnerUid})
        OPTIONAL MATCH (p)<-[old:SELLS]-(:Store)
        DELETE old
        MERGE (winner)-[:OWNS_PRODUCT]->(p)
      `, { productUid: raffle.prizeProductUid, winnerUid });

      return { success: true, winnerUid, ticketUid: winningTicket.uid };
    });
  }
}