// apps/hub-central/components/calendars/CalendarView.tsx
'use client';

import React from 'react';
import { scheduleTaskAction } from '@/app/actions/task.actions'; 
import { Plus } from 'lucide-react';
import { addDays, startOfWeek, addMinutes, startOfDay } from 'date-fns';

interface CalendarViewProps {
  tasks: any[];
  onEmptySlotClick: (date: Date) => void;
  onEdit?: (task: any) => void;
  onDelete?: (uid: string) => void;
  onTaskDrop?: () => void;
}

export default function CalendarView({ tasks, onEmptySlotClick, onEdit, onTaskDrop }: CalendarViewProps) {
  // 48 créneaux de 30 minutes
  const timeSlots = Array.from({ length: 48 }, (_, i) => addMinutes(startOfDay(new Date()), i * 30));

  // Les 7 jours de la semaine (en commençant par Lundi)
  const weekDays = [0, 1, 2, 3, 4, 5, 6].map(dayOffset =>
    addDays(startOfWeek(new Date(), { weekStartsOn: 1 }), dayOffset)
  );

  return (
    <div className="flex flex-col bg-[#05070A] rounded-2xl border border-white/10 overflow-hidden shadow-2xl">
      
      {/* 🌟 EN-TÊTE : Jours de la semaine (Fixes) */}
      <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-white/10 bg-white/[0.02]">
        <div className="p-3 border-r border-white/5"></div> {/* Coin vide au-dessus des heures */}
        {weekDays.map((day, i) => (
          <div key={`header-${i}`} className="p-3 text-center border-r border-white/5 last:border-r-0">
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">
              {/* Utilisation native de JS pour formater le jour en Français */}
              {day.toLocaleDateString('fr-FR', { weekday: 'long' })}
            </div>
            <div className="text-sm font-bold text-slate-200 mt-1">
              {day.getDate()}
            </div>
          </div>
        ))}
      </div>

      {/* 🌟 CORPS : Heures + Grille des Atomes (Scrollable) */}
      <div className="grid grid-cols-[60px_repeat(7,1fr)] max-h-[65vh] overflow-y-auto custom-scrollbar relative">
        
        {/* Colonne des heures (Y-Axis) */}
        <div className="flex flex-col border-r border-white/10 bg-white/[0.01]">
          {timeSlots.map((slot, i) => (
            <div key={`time-${i}`} className="h-16 relative border-b border-white/5 last:border-b-0 flex justify-center">
              {/* On affiche l'heure seulement toutes les heures pleines (index pair) */}
              {i % 2 === 0 && (
                <span className="text-[10px] font-mono text-slate-500 absolute -top-2.5 bg-[#05070A] px-1 z-10">
                  {slot.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
            </div>
          ))}
        </div>

        {/* Colonnes des jours (X-Axis) */}
        {weekDays.map((day, dayIndex) => (
          <div key={`col-${dayIndex}`} className="flex flex-col border-r border-white/5 last:border-r-0">
            {timeSlots.map((slot, slotIndex) => {
              const slotDate = new Date(
                day.getFullYear(),
                day.getMonth(),
                day.getDate(),
                slot.getHours(),
                slot.getMinutes()
              );

              const tasksInSlot = tasks.filter(task => {
                const scheduled = task.dates?.scheduledAt;
                if (!scheduled) return false;
                
                const taskDate = new Date(scheduled);
                if (isNaN(taskDate.getTime())) return false;
                
                return taskDate.getFullYear() === slotDate.getFullYear() &&
                       taskDate.getMonth() === slotDate.getMonth() &&
                       taskDate.getDate() === slotDate.getDate() &&
                       taskDate.getHours() === slotDate.getHours() &&
                       taskDate.getMinutes() >= slotDate.getMinutes() &&
                       taskDate.getMinutes() < slotDate.getMinutes() + 30;
              });

              return (
                <div 
                  key={`cell-${dayIndex}-${slotIndex}`}
                  className="h-16 border-b border-white/5 last:border-b-0 relative group hover:bg-white/5 transition-all"
                  onClick={() => onEmptySlotClick(slotDate)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={async (e) => {
                    e.preventDefault();
                    const taskUid = e.dataTransfer.getData("taskUid");
                    if (taskUid) {
                      await scheduleTaskAction(taskUid, slotDate);
                      if (onTaskDrop) onTaskDrop();
                    }
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
                      onClick={(e) => {
                        e.stopPropagation(); 
                        if (onEdit) onEdit(task); 
                      }}
                      className="absolute inset-1 bg-[#E5484D] hover:bg-[#c43d41] rounded text-[10px] font-black uppercase text-white p-1.5 cursor-grab active:cursor-grabbing shadow-[0_0_10px_rgba(229,72,77,0.3)] transition-all z-10 overflow-hidden"
                    >
                      {task.content?.title || 'Sans titre'}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}