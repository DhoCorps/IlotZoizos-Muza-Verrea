// apps/hub-central/components/poetrik/RhymeGraphView.tsx

'use client';

import React, { useEffect, useState, useRef } from 'react';
import dynamic from 'next/dynamic';

// Chargement dynamique de ForceGraph2D pour s'adapter au rendu client Next.js
const ForceGraph2D = dynamic(
  () => import('react-force-graph-2d'),
  { ssr: false }
);

interface NodeData {
  id: string;
  name: string;
  val: number;
  color?: string;
  languageCode?: string;
  ipa?: string;
}

interface LinkData {
  source: string;
  target: string;
  type: string;
  label?: string;
}

interface RhymeGraphViewProps {
  centerWordUid?: string;
  onNodeClick?: (node: NodeData) => void;
}

export const RhymeGraphView: React.FC<RhymeGraphViewProps> = ({
  centerWordUid,
  onNodeClick,
}) => {
  const fgRef = useRef<any>(null);
  const [graphData, setGraphData] = useState<{ nodes: NodeData[]; links: LinkData[] }>({
    nodes: [],
    links: [],
  });
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    if (!centerWordUid) {
      // Données de démonstration poétique si aucun mot n'est ciblé
      setGraphData({
        nodes: [
          { id: 'lex_fr_oiseau', name: 'oiseau', val: 10, color: '#10b981', languageCode: 'fr', ipa: '/wa.zo/' },
          { id: 'lex_fr_roseau', name: 'roseau', val: 8, color: '#3b82f6', languageCode: 'fr', ipa: '/ʁo.zo/' },
          { id: 'lex_fr_chapeau', name: 'chapeau', val: 7, color: '#3b82f6', languageCode: 'fr', ipa: '/ʃa.po/' },
          { id: 'lex_en_bird', name: 'bird', val: 9, color: '#f59e0b', languageCode: 'en', ipa: '/bɜːd/' },
        ],
        links: [
          { source: 'lex_fr_oiseau', target: 'lex_fr_roseau', type: 'RHYMES_WITH', label: 'Rime riche' },
          { source: 'lex_fr_oiseau', target: 'lex_fr_chapeau', type: 'RHYMES_WITH', label: 'Assonance' },
          { source: 'lex_fr_oiseau', target: 'lex_en_bird', type: 'TRANSLATES_TO', label: 'Traduction' },
        ],
      });
      return;
    }

    const fetchGraphNetwork = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/poetrik/rhymes?uid=${encodeURIComponent(centerWordUid)}`);
        const json = await res.json();

        if (json.success && json.data) {
          const nodesMap = new Map<string, NodeData>();
          const links: LinkData[] = [];

          // Nœud central
          nodesMap.set(centerWordUid, {
            id: centerWordUid,
            name: centerWordUid.split('_').pop() || 'mot',
            val: 12,
            color: '#10b981',
          });

          json.data.forEach((item: any) => {
            nodesMap.set(item.uid, {
              id: item.uid,
              name: item.word,
              val: 6,
              color: item.languageCode === 'fr' ? '#3b82f6' : '#f59e0b',
              languageCode: item.languageCode,
              ipa: item.phoneticIpa,
            });

            links.push({
              source: centerWordUid,
              target: item.uid,
              type: item.rhymeType || 'RHYMES_WITH',
              label: item.matchScore,
            });
          });

          setGraphData({
            nodes: Array.from(nodesMap.values()),
            links,
          });
        }
      } catch (err) {
        console.error("Erreur lors du tissage de l'Observatoire Sémantique :", err);
      } finally {
        setLoading(false);
      }
    };

    fetchGraphNetwork();
  }, [centerWordUid]);

  return (
    <div className="w-full h-[500px] bg-slate-950 border border-slate-800 rounded-xl overflow-hidden relative shadow-2xl flex flex-col">
      {/* Barre d'en-tête de l'observatoire */}
      <div className="absolute top-3 left-3 z-10 flex items-center gap-2 px-3 py-1.5 bg-slate-900/80 backdrop-blur border border-slate-800 rounded-lg text-xs text-slate-300">
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
        <span className="font-semibold">Observatoire Sémantique (Graphe Neo4j)</span>
      </div>

      {loading && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm text-xs text-slate-400">
          Connexion aux échos de la Matrice...
        </div>
      )}

      {/* Le Graphe 2D */}
      <div className="flex-1 w-full h-full">
        <ForceGraph2D
          ref={fgRef}
          graphData={graphData}
          nodeLabel={(node: any) => `${node.name} (${node.ipa || 'IPA non défini'})`}
          nodeColor={(node: any) => node.color || '#3b82f6'}
          nodeVal={(node: any) => node.val}
          linkColor={() => '#334155'}
          linkWidth={1.5}
          linkDirectionalParticles={2}
          linkDirectionalParticleSpeed={0.005}
          onNodeClick={(node: any) => {
            if (onNodeClick) onNodeClick(node);
          }}
          backgroundColor="#020617"
        />
      </div>

      <div className="absolute bottom-3 right-3 z-10 px-2 py-1 bg-slate-900/60 border border-slate-800 rounded text-[10px] text-slate-500 font-mono">
        Réseau phonétique & translingual
      </div>
    </div>
  );
};