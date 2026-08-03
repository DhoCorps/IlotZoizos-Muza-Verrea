// apps/hub-central/components/graph/ContextualGraph.tsx
'use client';

import { useEffect, useState, useRef } from 'react';
import ForceGraph2D from 'react-force-graph-2d';

export function ContextualGraph({ rootUid, onNodeDoubleClick }: { rootUid: string, onNodeDoubleClick: (id: string) => void }) {
  const [data, setData] = useState({ nodes: [], links: [] });
  const fgRef = useRef<any>();
  
  const lastClickTime = useRef<{ [nodeId: string]: number }>({});

  useEffect(() => {
    if (!rootUid) return;
    fetch(`/api/graph/context?uid=${rootUid}`)
      .then(res => res.json())
      .then(newData => {
        setData(newData);
        setTimeout(() => fgRef.current?.zoomToFit(400), 100);
      });
  }, [rootUid]);

  const handleNodeClick = (node: any) => {
    const now = Date.now();
    const previousClick = lastClickTime.current[node.id] || 0;

    if (now - previousClick < 300) {
      onNodeDoubleClick(node.id);
      lastClickTime.current[node.id] = 0; 
    } else {
      lastClickTime.current[node.id] = now;
      fgRef.current?.centerAt(node.x, node.y, 300);
    }
  };

  return (
    <div className="fixed bottom-8 right-8 w-72 h-72 bg-[#05070A]/80 backdrop-blur-2xl border border-white/10 rounded-full shadow-[0_0_40px_rgba(229,72,77,0.15)] overflow-hidden z-50 animate-in zoom-in duration-500 group hover:w-96 hover:h-96 transition-all">
      
      <div className="absolute top-4 left-1/2 -translate-x-1/2 text-[8px] font-black uppercase tracking-[0.2em] text-[#E5484D] opacity-50 pointer-events-none z-10">
        Nexus Contextuel
      </div>
      
      <ForceGraph2D
        ref={fgRef}
        graphData={data}
        width={384}
        height={384}
        backgroundColor="rgba(0,0,0,0)"
        
        // 🩸 SUTURE : Attribution des couleurs selon la nature de l'entité
        nodeColor={(node: any) => {
          if (node.type === 'Oiseau') return node.frequency || '#f59e0b'; // Fréquence de l'Oiseau
          if (node.type === 'Team') return node.frequency || '#10b981'; 
          if (node.type === 'Project') return '#E5484D'; // Rouge Îlot
          if (node.type === 'Partita') return '#8b5cf6'; // Violet musical
          if (node.type === 'LetrinSprite') return '#06b6d4'; // Cyan typographique
          if (node.type === 'Task') return node.status === 'DONE' ? '#94a3b8' : '#334155';
          return '#f1f5f9'; 
        }}

        // 🩸 SUTURE : Libellés contextuels enrichis
        nodeLabel={(node: any) => {
          if (node.type === 'Task') {
             return `Atome [${node.status}] ${node.energyWeight ? `| Énergie: ${node.energyWeight}` : ''}`;
          }
          if (node.type === 'Partita') {
             return `Partita [${node.instrument || 'Musique'}] : ${node.name}`;
          }
          if (node.type === 'LetrinSprite') {
             return `Letr'In [${node.resolution}x${node.resolution}] : ${node.name}`;
          }
          return node.name || node.pseudo || node.uid;
        }}

        // 🩸 SUTURE : Taille des nœuds selon leur importance / type
        nodeVal={(node: any) => {
           if (node.type === 'Task' && node.energyWeight) {
              return 4 + (node.energyWeight * 0.5); 
           }
           if (node.type === 'Project' || node.type === 'Team') return 8;
           if (node.type === 'Partita' || node.type === 'LetrinSprite') return 6;
           return 4;
        }}

        linkDirectionalParticles={2}
        linkDirectionalParticleSpeed={0.005}
        onNodeClick={handleNodeClick}
        onNodeDragEnd={node => {
          node.fx = node.x;
          node.fy = node.y;
        }}
      />
    </div>
  );
}