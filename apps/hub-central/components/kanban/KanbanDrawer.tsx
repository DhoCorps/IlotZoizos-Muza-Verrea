"use client";

import React, { useState } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { moveTaskAction } from '../../app/actions/kanban.actions';
import { ITask } from '@ilot/types';

// Colonnes du Kanban alignées sur tes types
const COLUMNS = [
  { id: 'CONCEPT', title: 'XYX' },
  { id: 'TODO', title: '?' },
  { id: 'IN_PROGRESS', title: '...' },
  { id: 'DONE', title: '!' }, // <-- La virgule vitale a été ajoutée ici
  { id: 'CANCELLED', title: 'X' },
];

export default function KanbanDrawer({ tasks, isOpen, onClose }: { tasks: ITask[], isOpen: boolean, onClose: () => void }) {
  if (!isOpen) return null;

  const onDragEnd = async (result: DropResult) => {
    const { destination, draggableId } = result;
    if (!destination) return;

    // Appel au système nerveux pour une mutation en "Perfect Sync"
    await moveTaskAction(draggableId, destination.droppableId);
  };

  return (
    <div className="fixed inset-y-0 right-0 w-full max-w-4xl bg-slate-900 shadow-2xl border-l border-slate-800 z-50">
      <div className="p-6 h-full flex flex-col">
        <header className="flex justify-between items-center mb-8 border-b border-slate-800 pb-4">
          <h2 className="text-2xl font-bold text-slate-100">Tableau de Bord <span className="text-red-600">Zoizos</span></h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white">Fermer</button>
        </header>

        <DragDropContext onDragEnd={onDragEnd}>
          <div className="flex gap-4 h-full overflow-x-auto pb-4">
            {COLUMNS.map((col) => (
              <div key={col.id} className="flex-1 min-w-[280px] bg-slate-800/50 rounded-lg p-4 flex flex-col">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-4">{col.title}</h3>
                
                <Droppable droppableId={col.id}>
                  {(provided) => (
                    <div {...provided.droppableProps} ref={provided.innerRef} className="flex-1 space-y-3">
                      {tasks.filter(t => t.status === col.id).map((task, index) => (
                        <Draggable key={task.uid} draggableId={task.uid} index={index}>
                          {(provided) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className="bg-slate-700 p-4 rounded border-l-4 border-red-500 hover:bg-slate-600 transition-colors shadow-lg"
                            >
                              <p className="text-slate-100 font-medium mb-2">{task.content?.title || "Oiseau sans nom"}</p>
                              <div className="flex justify-between items-center text-xs text-slate-400">
                                <span>🍅 {task.pomodoros?.estimated || 0}</span>
                                {/* Sécurisation avec task.metrics?.mentalLoad */}
                                <span className="bg-slate-800 px-2 py-1 rounded">Charge: {task.metrics?.mentalLoad || 1}</span>
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