'use client';

import React, { useState } from 'react';
import { format, addDays, startOfWeek, addMinutes, startOfDay } from 'date-fns';
import { fr } from 'date-fns/locale';
import { scheduleTaskAction } from '../../app/actions/task.actions';

export default function CalendarView({ tasks }: { tasks: any[] }) {
  const [currentDate] = useState(new Date());
  const startDate = startOfWeek(currentDate, { weekStartsOn: 1 });

  // Génération des créneaux de 30 minutes pour une journée
  const timeSlots = Array.from({ length: 48 }, (_, i) => addMinutes(startOfDay(new Date()), i * 30));

  const handleDrop = async (e: React.DragEvent, day: Date, slot: Date) => {
  e.preventDefault();
  const taskUid = e.dataTransfer.getData("taskUid");
  
  // Précision à la demi-heure
  const scheduledAt = new Date(day);
  scheduledAt.setHours(slot.getHours(), slot.getMinutes(), 0, 0);

  const result = await scheduleTaskAction(taskUid, scheduledAt);
  
  if (result.success) {
    // Ici, on pourrait déclencher un refresh global ou une notification
    console.log("📍 Atome scellé dans le temps");
  }
};

  return (
    <div className="flex flex-col h-full bg-slate-950 border border-white/5 rounded-3xl overflow-hidden shadow-2xl">
      {/* 📅 Header : Jours de la semaine */}
      <div className="grid grid-cols-8 border-b border-white/10 bg-white/5">
        <div className="p-4 border-r border-white/5" /> {/* Colonne des heures */}
        {[...Array(7)].map((_, i) => {
          const day = addDays(startDate, i);
          return (
            <div key={i} className="p-4 text-center border-r border-white/5">
              <span className="text-[10px] uppercase font-black tracking-widest text-slate-500">
                {format(day, 'eee', { locale: fr })}
              </span>
              <p className="text-xl font-bold">{format(day, 'd')}</p>
            </div>
          );
        })}
      </div>

      {/* 🕐 Corps : Grille Horaire */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="grid grid-cols-8 relative">
          {/* Colonne des indicateurs d'heures */}
          <div className="flex flex-col">
            {timeSlots.map((time, i) => (
              <div key={i} className="h-12 border-b border-white/5 p-2 text-[9px] font-mono text-slate-600 text-right pr-4">
                {i % 2 === 0 ? format(time, 'HH:mm') : ''}
              </div>
            ))}
          </div>

          {/* Colonnes des Jours */}
          {[...Array(7)].map((_, dayIdx) => {
            const day = addDays(startDate, dayIdx);
            return (
              <div key={dayIdx} className="relative border-r border-white/5">
                {timeSlots.map((slot, slotIdx) => (
                  <div
                    key={slotIdx}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => handleDrop(e, day, slot)}
                    className="h-12 border-b border-white/[0.02] hover:bg-white/[0.02] transition-colors relative group"
                  >
                    {/* Affichage des tâches planifiées ici */}
                    {tasks.filter(t => t.dates.scheduledAt && 
                      new Date(t.dates.scheduledAt).getTime() === new Date(day.setHours(slot.getHours(), slot.getMinutes())).getTime()
                    ).map(task => (
                      <div key={task.uid} className="absolute inset-x-1 inset-y-0.5 bg-[#E5484D]/20 border-l-2 border-[#E5484D] p-1 rounded-sm text-[8px] font-bold overflow-hidden">
                        {task.content.title}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}