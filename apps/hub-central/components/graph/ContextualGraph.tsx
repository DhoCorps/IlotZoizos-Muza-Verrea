'use client';

import { useEffect, useState, useRef } from 'react';
import ForceGraph2D from 'react-force-graph-2d';

export function ContextualGraph({ rootUid, onNodeDoubleClick }: { rootUid: string, onNodeDoubleClick: (id: string) => void }) {
  const [data, setData] = useState({ nodes: [], links: [] });
  const fgRef = useRef<any>();
  
  // 🕒 Le chronomètre pour notre "double-clic" maison
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

  // 🖱️ Logique de détection du double-clic
  const handleNodeClick = (node: any) => {
    const now = Date.now();
    const previousClick = lastClickTime.current[node.id] || 0;

    // Si l'oiseau clique deux fois en moins de 300ms, c'est un double-clic !
    if (now - previousClick < 300) {
      onNodeDoubleClick(node.id);
      lastClickTime.current[node.id] = 0; // On reset le chrono
    } else {
      // Sinon, c'est un simple clic : on centre simplement la caméra sur le nœud
      lastClickTime.current[node.id] = now;
      fgRef.current?.centerAt(node.x, node.y, 300);
    }
  };

  return (
    <div className="fixed bottom-8 right-8 w-72 h-72 bg-[#05070A]/80 backdrop-blur-2xl border border-white/10 rounded-full shadow-[0_0_40px_rgba(229,72,77,0.15)] overflow-hidden z-50 animate-in zoom-in duration-500 group hover:w-96 hover:h-96 transition-all">
      
      {/* Petit label purement esthétique */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 text-[8px] font-black uppercase tracking-[0.2em] text-[#E5484D] opacity-50 pointer-events-none z-10">
        Nexus Contextuel
      </div>
      
      <ForceGraph2D
        ref={fgRef}
        graphData={data}
        width={384}
        height={384}
        backgroundColor="rgba(0,0,0,0)"
        nodeColor={(node: any) => node.type === 'Project' ? '#E5484D' : node.type === 'Task' ? '#64748b' : '#f1f5f9'}
        nodeLabel="name"
        nodeRelSize={6}
        linkDirectionalParticles={2}
        linkDirectionalParticleSpeed={0.005}
        // 🎯 On utilise notre fonction maison au lieu de onNodeDoubleClick
        onNodeClick={handleNodeClick}
        onNodeDragEnd={node => {
          node.fx = node.x;
          node.fy = node.y;
        }}
      />
    </div>
  );
}