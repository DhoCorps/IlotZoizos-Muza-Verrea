'use client';

import React, { useEffect, useRef, useState } from 'react';

export interface ConstellationNode {
  id: string;
  name: string;
  type: 'USER' | 'BLOG' | 'PROJECT' | 'GAME' | 'TAG';
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
}

export interface ConstellationLink {
  source: string;
  target: string;
  type: string;
}

interface Constellation3DProps {
  nodes: ConstellationNode[];
  links: ConstellationLink[];
  onNodeClick?: (node: ConstellationNode) => void;
}

export function Constellation3D({ nodes, links, onNodeClick }: Constellation3DProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [selectedNode, setSelectedNode] = useState<ConstellationNode | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = canvas.parentElement?.clientWidth || 600);
    let height = (canvas.height = canvas.parentElement?.clientHeight || 400);

    // Initialisation des positions aléatoires en galaxie
    const simulationNodes = nodes.map((node, index) => ({
      ...node,
      x: node.x || width / 2 + (Math.cos(index) * 150),
      y: node.y || height / 2 + (Math.sin(index) * 150),
      vx: (Math.random() - 0.5) * 0.6,
      vy: (Math.random() - 0.5) * 0.6,
    }));

    const handleResize = () => {
      if (!canvas || !canvas.parentElement) return;
      width = canvas.width = canvas.parentElement.clientWidth;
      height = canvas.height = canvas.parentElement.clientHeight;
    };

    window.addEventListener('resize', handleResize);

    // Boucle de rendu de la galaxie lumineuse
    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // 1. Rendu des liens (Fils de résonance / Canopée)
      ctx.lineWidth = 1;
      links.forEach((link) => {
        const sourceNode = simulationNodes.find((n) => n.id === link.source);
        const targetNode = simulationNodes.find((n) => n.id === link.target);

        if (sourceNode && targetNode && sourceNode.x && sourceNode.y && targetNode.x && targetNode.y) {
          ctx.strokeStyle = 'rgba(100, 116, 139, 0.25);'; // Gris bleuté subtil
          ctx.beginPath();
          ctx.moveTo(sourceNode.x, sourceNode.y);
          ctx.lineTo(targetNode.x, targetNode.y);
          ctx.stroke();
        }
      });

      // 2. Mise à jour physique et rendu des nœuds (Étoiles de la Constellation)
      simulationNodes.forEach((node) => {
        if (!node.x || !node.y || !node.vx || !node.vy) return;

        // Légère dérive organique
        node.x += node.vx;
        node.y += node.vy;

        // Rebond souple sur les bords
        if (node.x < 30 || node.x > width - 30) node.vx *= -1;
        if (node.y < 30 || node.y > height - 30) node.vy *= -1;

        // Couleur sémantique selon l'entité
        let glowColor = '#38bdf8'; // Cyan par défaut
        if (node.type === 'USER') glowColor = '#ef4444'; // Rouge pour les oiseaux
        if (node.type === 'PROJECT') glowColor = '#10b981'; // Émeraude

        // Halo lumineux
        ctx.shadowBlur = 12;
        ctx.shadowColor = glowColor;
        ctx.fillStyle = glowColor;

        ctx.beginPath();
        ctx.arc(node.x, node.y, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0; // Réinitialisation de l'ombre

        // Libellé de l'étoile
        ctx.fillStyle = '#94a3b8';
        ctx.font = '10px monospace';
        ctx.fillText(node.name, node.x + 10, node.y + 4);
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [nodes, links]);

  // Gestion des clics sur la galaxie
  const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // Détection du nœud le plus proche du clic
    const clickedNode = nodes.find((node) => {
      if (node.x === undefined || node.y === undefined) return false;
      const distance = Math.hypot(node.x - x, node.y - y);
      return distance < 15;
    });

    if (clickedNode) {
      setSelectedNode(clickedNode);
      if (onNodeClick) onNodeClick(clickedNode);
    }
  };

  return (
    <div className="relative w-full h-[450px] bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
      <div className="absolute top-4 left-4 z-10 pointer-events-none">
        <h4 className="text-xs font-bold tracking-wider text-slate-400 uppercase">
          🌌 Constellation de la Canopée (Neo4j)
        </h4>
      </div>

      <canvas
        ref={canvasRef}
        onClick={handleCanvasClick}
        className="w-full h-full cursor-pointer"
        aria-label="Galaxie interactive de la constellation"
      />

      {selectedNode && (
        <div className="absolute bottom-4 right-4 bg-slate-900/90 border border-slate-700 px-4 py-2 rounded-xl text-xs text-slate-200 backdrop-blur-md shadow-lg flex items-center gap-1.5">
          <span className="font-semibold text-rose-400">{selectedNode.type}</span>
          <span>:</span>
          {/* 🌿 On isole le nom dans un span pour le rendre ciblable facilement par les tests */}
          <span data-testid="selected-node-name" className="font-medium text-slate-100">
            {selectedNode.name}
          </span>
        </div>
      )}
    </div>
  );
}