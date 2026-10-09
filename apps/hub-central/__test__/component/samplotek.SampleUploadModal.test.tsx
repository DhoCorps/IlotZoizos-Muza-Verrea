import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SampleUploadModal } from '@/components/samplotek/SampleUploadModal';
import { toast } from 'sonner';

// -------------------------------------------------------------------------
// 🎭 MOCKS DE L'ENVIRONNEMENT ET DES HOOKS
// -------------------------------------------------------------------------
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('Composant : SampleUploadModal', () => {
  let mockFetch: any;
  const mockOnClose = vi.fn();
  const mockOnSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock global de la fonction fetch
    mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, message: 'Action réussie' }),
    });
    vi.stubGlobal('fetch', mockFetch);
  });

  it('🔴 ne doit pas s\'afficher si isOpen est false', () => {
    const { container } = render(<SampleUploadModal isOpen={false} onClose={mockOnClose} onSuccess={mockOnSuccess} />);
    expect(container.firstChild).toBeNull();
  });

  it('🟢 doit s\'afficher correctement avec les nouveaux accordéons SEO et Copyright', () => {
    render(<SampleUploadModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />);
    
    // Vérification du titre principal
    expect(screen.getByText('Graver & Sceller un Sample')).toBeDefined();
    
    // Vérification de la présence des accordéons de la Roadmap
    expect(screen.getByText('Référencement (SEO)')).toBeDefined();
    expect(screen.getByText('Droits & Copyright')).toBeDefined();
  });

  it('🔴 doit bloquer la soumission si aucun fichier n\'est sélectionné', async () => {
    render(<SampleUploadModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />);
    
    // Remplissage des champs obligatoires
    fireEvent.change(screen.getByPlaceholderText('Ex: Kick Canopée 01'), { target: { value: 'Test' } });
    fireEvent.change(screen.getByPlaceholderText('Ex: Cyberpunk, Ambient'), { target: { value: 'Test Style' } });
    
    // Soumission sans fichier
    const submitBtn = screen.getByText("Forger l'Empreinte");
    fireEvent.click(submitBtn);

    expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('Veuillez sélectionner une brindille audio'));
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('🟢 [ROADMAP] doit inclure les champs SEO et Copyright dans le FormData lors de la soumission', async () => {
    render(<SampleUploadModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />);
    
    // 1. Simulation d'upload de fichier (Utilisation du data-testid pour plus de robustesse)
    const file = new File(['audio content'], 'kick.wav', { type: 'audio/wav' });
    const fileInput = screen.getByTestId('audio-upload-input');
    fireEvent.change(fileInput, { target: { files: [file] } });

    // 2. Remplissage des champs de base
    fireEvent.change(screen.getByPlaceholderText('Ex: Kick Canopée 01'), { target: { value: 'Mon Kick' } });
    fireEvent.change(screen.getByPlaceholderText('Ex: Cyberpunk, Ambient'), { target: { value: 'Techno' } });

    // 3. Remplissage des champs SEO
    fireEvent.change(screen.getByPlaceholderText('Titre optimisé...'), { target: { value: 'Kick Lourd 808' } });
    fireEvent.change(screen.getByPlaceholderText('kick, lofi, dark...'), { target: { value: 'kick, techno, 808' } });

    // 4. Soumission
    const submitBtn = screen.getByText("Forger l'Empreinte");
    fireEvent.click(submitBtn);

    // Vérification de l'envoi du FormData
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(1);
      const fetchCall = mockFetch.mock.calls[0];
      const formDataSent = fetchCall[1].body as FormData;

      // Validation des champs classiques
      expect(formDataSent.get('title')).toBe('Mon Kick');
      expect(formDataSent.get('style')).toBe('Techno');
      
      // Validation des champs étendus de la Roadmap
      expect(formDataSent.get('metaTitle')).toBe('Kick Lourd 808');
      expect(formDataSent.get('keywords')).toBe('kick, techno, 808');
      expect(formDataSent.get('copyrightRole')).toBe('CREATOR'); // Valeur par défaut testée
    });

    expect(toast.success).toHaveBeenCalled();
    expect(mockOnSuccess).toHaveBeenCalled();
    expect(mockOnClose).toHaveBeenCalled();
  });
});