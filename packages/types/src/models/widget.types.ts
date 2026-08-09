// packages/types/src/widget.types.ts
import { IUniversalMediaItem } from '../core/showcase.types';

export interface OmniActionWidgetProps {
  media: IUniversalMediaItem;    // Le média ciblé (Partition, Article, Produit...)
  isOpen: boolean;               // Contrôle d'affichage
  onClose: () => void;           // Fonction de fermeture
  defaultTab?: 'RESONANCE' | 'COMMERCE' | 'SHARE'; // Onglet ouvert par défaut
}