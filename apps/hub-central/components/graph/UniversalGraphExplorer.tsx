// apps/hub-central/components/graph/UniversalGraphExplorer.tsx
'use client';

import { useEffect, useState, useRef } from 'react';
import dynamic from 'next/dynamic';
import { Compass, Maximize2, Minimize2, RefreshCw, Filter } from 'lucide-react';

// Importation dynamique indispensable pour s'affranchir définitivement du SSR sur le canvas
const ForceGraph2D = dynamic(() => import('react-force-graph-2d'), {
  ssr: false,
});

export function UniversalGraphExplorer({ initialRootUid }: { initialRootUid?: string }) {
  const [rootUid, setRootUid] = useState<string>(initialRootUid || '');
  const [rawData, setRawData] = useState<{ nodes: any[]; links: any[] }>({ nodes: [], links: [] });
  const [loading, setLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [filterType, setFilterType] = useState<string>('ALL');
  const [isMounted, setIsMounted] = useState(false);
  
  // Dimensions dynamiques pour le redimensionnement fluide
  const [dimensions, setDimensions] = useState({ width: 384, height: 384 });
  const fgRef = useRef<any>();

  // Activation du montage côté client
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Gestion intelligente du redimensionnement de la fenêtre
  useEffect(() => {
    if (!isMounted) return;

    const updateDimensions = () => {
      if (isExpanded) {
        setDimensions({
          width: window.innerWidth - 80,
          height: window.innerHeight - 140
        });
      } else {
        setDimensions({ width: 384, height: 384 });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, [isExpanded, isMounted]);

  // Point d'ancrage initial par défaut
  useEffect(() => {
    if (!rootUid) {
      fetch('/api/users')
        .then(res => res.json())
        .then(user => {
          if (user?.uid || user?.id) {
            setRootUid(user.uid || user.id);
          }
        })
        .catch(() => setRootUid('nexus_root'));
    }
  }, [rootUid]);

  // Chargement des données du graphe
  const fetchGraphContext = async (uid: string) => {
    if (!uid) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/graph/context?uid=${uid}`);
      const newData = await res.json();
      setRawData(newData || { nodes: [], links: [] });
      setTimeout(() => fgRef.current?.zoomToFit(400), 150);
    } catch (err) {
      console.error("🔥 Erreur de navigation stellaire :", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (rootUid) {
      fetchGraphContext(rootUid);
    }
  }, [rootUid]);

  // Navigation par clic sur un nœud
  const handleNodeClick = (node: any) => {
    setRootUid(node.id);
    fgRef.current?.centerAt(node.x, node.y, 400);
  };

  // Filtrage sécurisé des nœuds et des liens associés
  const filteredData = {
    nodes: (rawData.nodes || []).filter((node: any) => filterType === 'ALL' || node.type === filterType),
    links: (rawData.links || []).filter((link: any) => {
      const sourceId = typeof link.source === 'object' ? link.source?.id : link.source;
      const targetId = typeof link.target === 'object' ? link.target?.id : link.target;
      const activeNodeIds = new Set(
        (rawData.nodes || [])
          .filter((node: any) => filterType === 'ALL' || node.type === filterType)
          .map((n: any) => n.id)
      );
      return activeNodeIds.has(sourceId) && activeNodeIds.has(targetId);
    })
  };

  return (
    <div className={`transition-all duration-500 z-50 bg-[#05070A]/95 backdrop-blur-2xl border border-white/10 shadow-[0_0_50px_rgba(229,72,77,0.15)] overflow-hidden flex flex-col ${
      isExpanded 
        ? 'fixed inset-6 rounded-3xl' 
        : 'fixed bottom-8 right-8 w-80 h-80 rounded-full group hover:w-96 hover:h-96'
    }`}>
      
      {/* Barre d'en-tête de navigation */}
      <div className="absolute top-4 left-6 right-6 flex items-center justify-between z-10 pointer-events-auto">
        <div className="flex items-center gap-2">
          <Compass size={14} className="text-[#E5484D] animate-pulse" />
          <span className="text-[9px] font-black uppercase tracking-[0.2em] text-[#E5484D]">
            Nexus Stellaire {loading && '...'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => fetchGraphContext(rootUid)} 
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all"
            title="Rafraîchir"
          >
            <RefreshCw size={12} />
          </button>
          <button 
            onClick={() => setIsExpanded(!isExpanded)} 
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all"
            title={isExpanded ? "Réduire" : "Plein écran"}
          >
            {isExpanded ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
          </button>
        </div>
      </div>

      {/* Barre de Filtres (visible en mode plein écran) */}
      {isExpanded && (
        <div className="absolute top-16 left-6 flex items-center gap-2 z-10 bg-black/40 p-1.5 rounded-xl border border-white/10">
          <Filter size={12} className="text-slate-400 ml-1" />
          {['ALL', 'Project', 'Partita', 'LetrinSprite', 'Oiseau'].map((type) => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`px-3 py-1 rounded-lg text-[9px] font-mono uppercase tracking-wider transition-all ${
                filterType === type 
                  ? 'bg-[#E5484D] text-white shadow-md' 
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {type === 'ALL' ? 'Tous' : type}
            </button>
          ))}
        </div>
      )}

      {/* Le Moteur Visuel du Graphe (Palette écologique : Gris ardoise bleuté & Rouge) */}
      <div className="flex-1 w-full h-full flex items-center justify-center cursor-grab active:cursor-grabbing pt-12">
        {isMounted ? (
          <ForceGraph2D
            ref={fgRef}
            graphData={filteredData}
            width={dimensions.width}
            height={dimensions.height}
            backgroundColor="rgba(0,0,0,0)"
            nodeColor={(node: any) => {
              if (node.id === rootUid) return '#E5484D'; // Racine active en rouge vermeil
              if (node.type === 'Project') return '#E5484D';
              if (node.type === 'Partita' || node.type === 'LetrinSprite') return '#708090'; // Gris ardoise bleuté
              if (node.type === 'Oiseau' || node.type === 'Team') return '#475569'; // Gris sombre
              return '#64748b'; // Nuance neutre respectueuse de l'écologie visuelle
            }}
            nodeLabel={(node: any) => `✨ [${node.type}] ${node.name || node.pseudo || node.id} (Cliquer pour voyager)`}
            nodeVal={(node: any) => node.id === rootUid ? 12 : 6}
            linkDirectionalParticles={2}
            linkDirectionalParticleSpeed={0.005}
            linkColor={() => '#334155'} // Liens discrets en gris ardoise foncé
            onNodeClick={handleNodeClick}
          />
        ) : (
          <div className="text-[10px] font-mono text-slate-500 animate-pulse">Initialisation du Nexus...</div>
        )}
      </div>

      {/* Guide contextuel en bas (mode réduit) */}
      {!isExpanded && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 text-[7px] font-mono text-slate-500 uppercase tracking-wider pointer-events-none opacity-40 group-hover:opacity-100 transition-opacity">
          Clique sur un nœud pour voyager
        </div>
      )}
    </div>
  );
}