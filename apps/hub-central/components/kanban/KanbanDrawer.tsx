"use client";

import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { moveTaskAction } from '@/app/actions/kanban.actions';
import { ITask, TaskStatus } from '@ilot/types';

// Colonnes du Kanban alignées sur tes types
const COLUMNS = [
  { id: 'CONCEPT', title: 'CONCEPT' },
  { id: 'TODO', title: 'TODO' },
  { id: 'IN_PROGRESS', title: 'IN_PROGRESS' },
  { id: 'DONE', title: 'DONE' }, 
  { id: 'CANCELLED', title: 'CANCELLED' },
  { id: 'REDUCED_SPEED', title: 'REDUCED_SPEED' }, // 🩸 CORRECTION : Faute de frappe corrigée
  { id: 'ARCHIVED', title: 'ARCHIVED' },
];

export default function KanbanDrawer({ tasks, isOpen, onClose }: { tasks: ITask[], isOpen: boolean, onClose: () => void }) {
  // 🪡 SUTURE : On gère un état local pour une réactivité immédiate (Optimistic UI)
  const [localTasks, setLocalTasks] = useState<ITask[]>(tasks);

  // Synchronisation du radar si les tâches changent depuis le parent
  useEffect(() => {
    setLocalTasks(tasks);
  }, [tasks]);

  if (!isOpen) return null;

  const onDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;

    // Si on lâche l'atome exactement où on l'a pris, on ne fait rien
    if (destination.droppableId === source.droppableId) return;

    // 🛡️ Suture Réactive : Mise à jour immédiate de l'UI avant l'appel serveur
    const newStatus = destination.droppableId as TaskStatus;
    const oldTasks = [...localTasks];
    const updatedTasks = localTasks.map(t => 
      t.uid === draggableId ? { ...t, status: newStatus } : t
    );
    setLocalTasks(updatedTasks);

    // 🛡️ La Suture : On met à jour le statut via la Server Action
    try {
      const res = await moveTaskAction(draggableId, newStatus);
      
      // Si la Server Action échoue, on rembobine (Rollback) pour garder la cohérence Silice/Front
      if (!res.success) {
        setLocalTasks(oldTasks);
        console.error("Échec serveur :", res.error);
      }
    } catch (error) {
      setLocalTasks(oldTasks);
      console.error("Échec du déplacement de l'Atome :", error);
    }
  };

  return (
    <div className="fixed inset-y-0 right-0 w-full max-w-4xl bg-[#05070A] shadow-[0_0_50px_rgba(229,72,77,0.1)] border-l border-white/5 z-50">
      <div className="p-6 h-full flex flex-col">
        <header className="flex justify-between items-center mb-8 border-b border-white/5 pb-4">
          <h2 className="text-2xl font-black uppercase tracking-tighter text-slate-100">
            Nexus <span className="text-[#E5484D]">Kanban</span>
          </h2>
          <button onClick={onClose} className="text-[10px] uppercase font-mono tracking-widest text-slate-500 hover:text-[#E5484D] transition-colors">
            Fermer le Flux
          </button>
        </header>

        <DragDropContext onDragEnd={onDragEnd}>
          <div className="flex gap-4 h-full overflow-x-auto pb-4 custom-scrollbar">
            {COLUMNS.map((col) => (
              <div key={col.id} className="flex-1 min-w-[280px] bg-white/[0.02] border border-white/5 rounded-xl p-4 flex flex-col">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-4 flex justify-between items-center">
                  {col.title}
                  <span className="bg-black/40 px-2 py-0.5 rounded text-slate-600">
                    {localTasks.filter(t => t.status === col.id).length}
                  </span>
                </h3>
                
                <Droppable droppableId={col.id}>
                  {(provided, snapshot) => (
                    <div 
                      {...provided.droppableProps} 
                      ref={provided.innerRef} 
                      className={`flex-1 space-y-3 transition-colors ${snapshot.isDraggingOver ? 'bg-white/[0.02] rounded-lg' : ''}`}
                    >
                      {localTasks.filter(t => t.status === col.id).map((task, index) => (
                        <Draggable key={task.uid} draggableId={task.uid} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={`bg-black/40 p-4 rounded-lg border-l-2 transition-all ${
                                snapshot.isDragging 
                                ? 'border-[#E5484D] shadow-[0_0_15px_rgba(229,72,77,0.2)] rotate-2 scale-105' 
                                : 'border-white/10 hover:border-[#E5484D]/50'
                              }`}
                            >
                              <p className="text-sm font-bold text-slate-200 mb-3">{task.content?.title || "Atome sans nom"}</p>
                              
                              <div className="flex justify-between items-center text-[9px] font-mono uppercase tracking-widest text-slate-500">
                                <span className="flex items-center gap-1">
                                  <span className="w-2 h-2 rounded-full bg-[#E5484D]" /> 
                                  {task.pomodoros?.completed || 0}/{task.pomodoros?.estimated || 1}
                                </span>
                                
                                {/* 🩸 SUTURE : mentalLoad devient complexity (sur 10) */}
                                <span className="bg-white/5 border border-white/5 px-2 py-1 rounded">
                                  CX: {task.metrics?.complexity || 1}/10
                                </span>
                              </div>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            ))}
          </div>
        </DragDropContext>
      </div>
    </div>
  );
}