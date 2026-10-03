// apps/hub-central/src/components/partita/__tests__/PartitaForm.test.tsx
import '@testing-library/jest-dom'; // 🚀 Ajout indispensable pour utiliser .toBeInTheDocument() avec Vitest
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PartitaForm } from '@/components/partita/PartitaForm';
import { toast } from 'sonner';

// Mock du `fetch` global
global.fetch = vi.fn();

// Mock du module storage
vi.mock('@/lib/apiClient', () => ({
  storage: {
    upload: vi.fn().mockResolvedValue({ url: 'https://mock.com/audio.mp3' }),
  }
}));

// Mock de Sonner
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  }
}));

describe('PartitaForm Component - SEO & Sceau Cryptographique', () => {
  const mockOnSuccess = vi.fn();
  const mockOnCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock de l'appel pour charger les taxonomies
    (global.fetch as any).mockResolvedValue({
      json: async () => ({ success: true, instruments: [] }),
    });
  });

  it('🟢 doit envoyer le bon payload avec SEO, rôle et filiation à la création (POST)', async () => {
    (global.fetch as any)
      .mockResolvedValueOnce({
        json: async () => ({ success: true, instruments: [] }), // taxonomies
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, digitalSignature: 'mock-hash-123' }), // submit
      });

    render(<PartitaForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

    // 1. Remplissage des champs obligatoires
    fireEvent.change(screen.getByPlaceholderText(/Titre de la partition/i), { target: { value: 'Mon Arrangement de Bach' } });
    fireEvent.change(screen.getByPlaceholderText(/Inscris tes notes/i), { target: { value: 'C D E F G' } });

    // 2. Remplissage du SEO
    fireEvent.change(screen.getByPlaceholderText(/Méta-Titre/i), { target: { value: 'Bach Arrangement - Tablature' } });

    // 3. Changement de Rôle en "Sublimateur" pour afficher le Pacte de Filiation (Désormais lié par le name et le HTMLFor)
    fireEvent.change(screen.getByRole('combobox', { name: /Mon Rôle/i }), { target: { value: 'SUBLIMATOR' } });
    
    // Attente du rendu des champs conditionnels
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Auteur Original/i)).toBeInTheDocument();
    });

    // 4. Remplissage de la Filiation
    fireEvent.change(screen.getByPlaceholderText(/Auteur Original/i), { target: { value: 'J.S. Bach' } });
    fireEvent.change(screen.getByPlaceholderText(/Œuvre Source/i), { target: { value: 'Cello Suite 1' } });
    
    // Clic sur l'Exclusivité Îlot
    const exclusiveCheckbox = screen.getByLabelText(/Exclusivité Îlot/i);
    fireEvent.click(exclusiveCheckbox);

    // Soumission du formulaire
    fireEvent.submit(screen.getByRole('button', { name: /Sceller la Partition/i }));

    await waitFor(() => {
      // Vérifie que fetch a été appelé 2 fois (1: taxonomies, 2: soumission)
      expect(global.fetch).toHaveBeenCalledTimes(2);
      
      const requestCall = (global.fetch as any).mock.calls[1];
      expect(requestCall[0]).toBe('/api/partita'); // Route POST
      expect(requestCall[1].method).toBe('POST');
      
      const payload = JSON.parse(requestCall[1].body);
      
      // Validation des champs standards
      expect(payload.title).toBe('Mon Arrangement de Bach');
      expect(payload.content).toBe('C D E F G');
      
      // Validation du bloc SEO
      expect(payload.seo.metaTitle).toBe('Bach Arrangement - Tablature');
      
      // Validation du bloc Sceau & Filiation
      expect(payload.cryptoSeal.copyrightMetadata.role).toBe('SUBLIMATOR');
      expect(payload.cryptoSeal.copyrightMetadata.isExclusiveIlot).toBe(true);
      expect(payload.cryptoSeal.copyrightMetadata.filiation.isExternalSource).toBe(true);
      expect(payload.cryptoSeal.copyrightMetadata.filiation.sourceAuthorName).toBe('J.S. Bach');
      expect(payload.cryptoSeal.copyrightMetadata.filiation.sourceWorkTitle).toBe('Cello Suite 1');
      
      // Notification de succès
      expect(toast.success).toHaveBeenCalledWith(expect.stringContaining('Sceau d\'antériorité apposé'));
      expect(mockOnSuccess).toHaveBeenCalled();
    });
  });

  it('🟢 doit pré-remplir le formulaire avec initialData (Edition - PUT)', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });

    const mockInitialData = {
      uid: 'partita-777',
      title: 'Ma Compo Originale',
      content: 'A B C',
      seo: { metaTitle: 'Ma Compo SEO' },
      cryptoSeal: {
        copyrightMetadata: {
          role: 'CREATOR',
          isExclusiveIlot: false,
          license: 'CC-BY'
        }
      }
    };

    render(<PartitaForm initialData={mockInitialData} onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

    // Vérifie le pré-remplissage avec l'import de jest-dom
    expect(screen.getByDisplayValue('Ma Compo Originale')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Ma Compo SEO')).toBeInTheDocument();
    expect(screen.getByDisplayValue('CC-BY')).toBeInTheDocument();

    // Soumission du formulaire (Edition)
    fireEvent.submit(screen.getByRole('button', { name: /Appliquer les Modifications/i }));

    await waitFor(() => {
      const requestCall = (global.fetch as any).mock.calls[1];
      expect(requestCall[0]).toBe('/api/partita/partita-777'); // Route PUT via UID
      expect(requestCall[1].method).toBe('PUT');
      
      const payload = JSON.parse(requestCall[1].body);
      expect(payload.cryptoSeal.copyrightMetadata.role).toBe('CREATOR'); // Toujours Créateur
      expect(payload.cryptoSeal.copyrightMetadata.filiation).toBeUndefined(); // Pas de filiation si Créateur
    });
  });
});