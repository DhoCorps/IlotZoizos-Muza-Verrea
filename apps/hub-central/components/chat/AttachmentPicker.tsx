// apps/hub-central/components/chat/AttachmentPicker.tsx
'tsx'
import React, { useState, useEffect } from 'react';
import { AttachmentSourceType, IRawAttachmentPointer } from '@ilot/types';

interface AttachmentPickerProps {
  onSelect: (pointer: IRawAttachmentPointer) => void;
  onClose: () => void;
}

export function AttachmentPicker({ onSelect, onClose }: AttachmentPickerProps) {
  const [activeSource, setActiveSource] = useState<AttachmentSourceType>('LETRIN');
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Simulation de chargement des créations de l'utilisateur selon la source active
  useEffect(() => {
    async function fetchUserCreations() {
      setLoading(true);
      try {
        // Tu brancheras ici tes routes API respectives (ex: /api/letrin/my-fonts, /api/shop/my-products)
        const res = await fetch(`/api/creations/search?sourceType=${activeSource}`);
        const data = await res.json();
        setItems(data.items || []);
      } catch (err) {
        console.error("Erreur de chargement des créations", err);
      } finally {
        setLoading(false);
      }
    }
    fetchUserCreations();
  }, [activeSource]);

  return (
    <div className="absolute bottom-16 left-0 w-96 bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl p-4 z-50 text-white">
      <div className="flex justify-between items-center mb-3 border-b border-zinc-800 pb-2">
        <span className="font-semibold text-sm">Joindre une création</span>
        <button onClick={onClose} className="text-zinc-400 hover:text-white text-xs">✕ Fermer</button>
      </div>

      {/* Onglets des sources */}
      <div className="flex gap-2 mb-3 text-xs">
        {['LETRIN', 'SHOP', 'PARTITA', 'BLOG'].map((source) => (
          <button
            key={source}
            onClick={() => setActiveSource(source)}
            className={`px-3 py-1 rounded-md transition-colors ${
              activeSource === source ? 'bg-indigo-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
            }`}
          >
            {source}
          </button>
        ))}
      </div>

      {/* Liste des éléments sélectionnables */}
      <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
        {loading ? (
          <div className="text-center py-6 text-zinc-500 text-xs">Exploration de la canopée...</div>
        ) : items.length === 0 ? (
          <div className="text-center py-6 text-zinc-500 text-xs">Aucune création trouvée ici.</div>
        ) : (
          items.map((item) => (
            <div
              key={item.slug}
              onClick={() => {
                onSelect({ sourceType: activeSource, entitySlug: item.slug });
                onClose();
              }}
              className="flex items-center gap-3 p-2 rounded-lg bg-zinc-800/50 hover:bg-zinc-800 cursor-pointer transition-colors border border-transparent hover:border-indigo-500/50"
            >
              {item.thumbnailUrl && (
                <img src={item.thumbnailUrl} alt={item.title} className="w-10 h-10 object-cover rounded-md" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{item.title}</p>
                <p className="text-xs text-zinc-400 truncate">{item.subtitle || activeSource}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}