// apps/hub-central/components/calendars/CalendarView.tsx
'use client';

import React from 'react';
import { scheduleTaskAction } from '../../app/actions/task.actions'; 
import { Plus } from 'lucide-react';
import { addDays, startOfWeek, addMinutes, startOfDay, isSameDay } from 'date-fns';

interface CalendarViewProps {
  tasks: any[];
  onEmptySlotClick: (date: Date) => void;
}

export default function CalendarView({ tasks, onEmptySlotClick }: CalendarViewProps) {
  // Calcul des slots : 48 créneaux de 30 minutes
  const timeSlots = Array.from({ length: 48 }, (_, i) => addMinutes(startOfDay(new Date()), i * 30));

  return (
    <div className="grid grid-cols-7 gap-px bg-white/5 border border-white/5">
      {[0, 1, 2, 3, 4, 5, 6].map(dayOffset => {
        // Calcul du jour de la semaine
        const day = addDays(startOfWeek(new Date(), { weekStartsOn: 1 }), dayOffset);
        // Juste avant le return du composant
        // Remplace tes logs actuels par celui-ci
        console.log("Structure réelle du premier objet task :", JSON.stringify(tasks[0], null, 2));
        return (
          <div key={dayOffset} className="flex flex-col">
            {timeSlots.map(slot => {
              const slotDate = new Date(day);
              slotDate.setHours(slot.getHours(), slot.getMinutes(), 0, 0);

              // Filtrage des tâches pour ce créneau
              const tasksInSlot = tasks.filter(t => {
              // Sécurisation : si scheduledAt n'existe pas, la tâche n'est pas dans le calendrier
              if (!t.dates?.scheduledAt) return false; 
              
              const tDate = new Date(t.dates.scheduledAt);
              // Vérification de validité de la date avant comparaison
              if (isNaN(tDate.getTime())) return false; 

              return isSameDay(tDate, slotDate) && 
                    tDate.getHours() === slotDate.getHours() && 
                    tDate.getMinutes() === slotDate.getMinutes();
              });

              return (
                <div 
                  key={slot.toString()}
                  className="h-16 border-b border-r border-white/5 relative group hover:bg-white/5 transition-all"
                  onClick={() => onEmptySlotClick(slotDate)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={async (e) => {
                    e.preventDefault();
                    const taskUid = e.dataTransfer.getData("taskUid");
                    if (taskUid) await scheduleTaskAction(taskUid, slotDate);
                  }}
                >
                  <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 p-1 text-slate-600 transition-opacity">
                    <Plus size={12} />
                  </div>
                  
                  {tasksInSlot.map(task => (
                    <div 
                      key={task.uid}
                      draggable
                      onDragStart={(e) => {
                        e.stopPropagation();
                        e.dataTransfer.setData("taskUid", task.uid);
                      }}
                      className="absolute inset-1 bg-[#E5484D]/60 rounded text-[9px] font-black uppercase text-white p-1 cursor-grab"
                    >
                      {task.content?.title || 'Sans titre'}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}