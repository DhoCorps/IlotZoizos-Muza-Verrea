import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { RaffleMonolith } from '@/components/raffle/RaffleMonolith';

describe('RaffleMonolith Component', () => {
  const mockRaffle = {
    uid: 'raffle_uuid_1',
    prizeProductUid: 'product_uuid_999',
    prizeTitle: 'Grimoire d’Argent',
    vendorName: 'Oiseau Architecte',
    ticketPriceShards: 25,
    maxTickets: 100,
    soldTicketsCount: 87,
    drawDate: new Date(Date.now() + 86400000 * 2).toISOString(), // Dans 2 jours
  };

  it('doit afficher les informations de la loterie, le vendeur et la progression FOMO', () => {
    render(<RaffleMonolith raffle={mockRaffle} />);

    expect(screen.getByText('Grimoire d’Argent')).toBeDefined();
    expect(screen.getByText(/Oiseau Architecte/i)).toBeDefined();
    expect(screen.getByText('87 / 100 tickets vendus')).toBeDefined();
    expect(screen.getByText('⚠️ Dépêchez-vous !')).toBeDefined();
    expect(screen.getByText('25 Éclats')).toBeDefined();
  });

  it('doit déclencher l’action d’achat de ticket au clic', () => {
    const mockBuy = vi.fn().mockResolvedValue(undefined);
    render(<RaffleMonolith raffle={mockRaffle} onBuyTicket={mockBuy} />);

    fireEvent.click(screen.getByRole('button', { name: /Acquérir un Ticket/i }));
    expect(mockBuy).toHaveBeenCalledWith('raffle_uuid_1');
  });

  it('doit afficher le compte à rebours avec les unités de temps', () => {
    render(<RaffleMonolith raffle={mockRaffle} />);

    expect(screen.getByText('Jours')).toBeDefined();
    expect(screen.getByText('Heures')).toBeDefined();
    expect(screen.getByText('Mins')).toBeDefined();
    expect(screen.getByText('Secs')).toBeDefined();
  });
});