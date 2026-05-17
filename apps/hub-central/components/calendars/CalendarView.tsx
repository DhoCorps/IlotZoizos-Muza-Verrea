'use client';

import React, { useState } from 'react';
import { format, addDays, startOfWeek, addMinutes, startOfDay, isSameMinute } from 'date-fns';
import { fr } from 'date-fns/locale';
import { scheduleTaskAction } from '../../app/actions/task.actions'; // Assure-toi que cette action existe !
import { X } from 'lucide-react'; // 🩸 Icône pour supprimer

export default function CalendarView({ tasks }: { tasks: any[] }) {
  const [currentDate] = useState(new Date());
  // Semaine commençant le lundi
  const startDate = startOfWeek(currentDate, { weekStartsOn: 1 });

  // Génération des créneaux de 30 minutes (00:00 à 23:30)
  const timeSlots = Array.from({ length: 48 }, (_, i) => addMinutes(startOfDay(new Date()), i * 30));

  // 📥 DROP : Placer l'Atome dans le temps
  const handleDrop = async (e: React.DragEvent, day: Date, slot: Date) => {
    e.preventDefault();
    const taskUid = e.dataTransfer.getData("taskUid");
    if (!taskUid) return;
    
    // On clone le jour pour éviter de muter la boucle de rendu (Le Bug Temporel est corrigé)
    const scheduledAt = new Date(day);
    scheduledAt.setHours(slot.getHours(), slot.getMinutes(), 0, 0);

    try {
      await scheduleTaskAction(taskUid, scheduledAt);
      console.log(`📍 Atome [${taskUid}] scellé à ${format(scheduledAt, 'HH:mm')}`);
    } catch (error) {
      console.error("Échec de la programmation", error);
    }
  };

  // 🗑️ UNSCHEDULE : Retirer l'Atome du calendrier
  const handleUnschedule = async (e: React.MouseEvent, taskUid: string) => {
    e.stopPropagation(); // Évite de déclencher des événements sur la cellule
    try {
      // Passer 'null' à ton action doit retirer la date dans MongoDB
      await scheduleTaskAction(taskUid, null); 
      console.log(`🌀 Atome [${taskUid}] libéré du temps`);
    } catch (error) {
      console.error("Échec de la déprogrammation", error);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#05070A] border border-white/5 rounded-3xl overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)]">
      
      {/* 📅 Header : Jours de la semaine */}
      <div className="grid grid-cols-8 border-b border-white/10 bg-white/[0.02]">
        <div className="p-4 border-r border-white/5" /> {/* Colonne du Temps */}
        {[...Array(7)].map((_, i) => {
          const day = addDays(startDate, i);
          const isToday = format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
          
          return (
            <div key={i} className={`p-4 text-center border-r border-white/5 ${isToday ? 'bg-[#E5484D]/10' : ''}`}>
              <span className={`text-[10px] uppercase font-black tracking-widest ${isToday ? 'text-[#E5484D]' : 'text-slate-500'}`}>
                {format(day, 'eee', { locale: fr })}
              </span>
              <p className={`text-xl font-bold ${isToday ? 'text-white' : 'text-slate-300'}`}>
                {format(day, 'd')}
              </p>
            </div>
          );
        })}
      </div>

      {/* 🕐 Corps : Matrice Horaire */}
      <div className="flex-1 overflow-y-auto custom-scrollbar relative">
        <div className="grid grid-cols-8 relative">
          
          {/* Colonne des heures (Fixe) */}
          <div className="flex flex-col border-r border-white/5">
            {timeSlots.map((time, i) => (
              <div key={i} className="h-14 border-b border-white/5 p-2 text-[9px] font-mono text-slate-600 text-right pr-4">
                {/* N'afficher que les heures pleines pour alléger l'UI */}
                {i % 2 === 0 ? format(time, 'HH:mm') : ''}
              </div>
            ))}
          </div>

          {/* Colonnes des Jours (La grille) */}
          {[...Array(7)].map((_, dayIdx) => {
            const currentDay = addDays(startDate, dayIdx);
            
            return (
              <div key={dayIdx} className="relative border-r border-white/5 flex flex-col">
                {timeSlots.map((slot, slotIdx) => {
                  // Le point précis dans l'espace-temps pour cette cellule
                  const cellTime = new Date(currentDay);
                  cellTime.setHours(slot.getHours(), slot.getMinutes(), 0, 0);

                  // On cherche si des atomes sont programmés à CETTE minute précise
                  const tasksInSlot = tasks.filter(t => {
                    if (!t.dates.scheduledAt) return false;
                    return isSameMinute(new Date(t.dates.scheduledAt), cellTime); // Utilisation propre de date-fns
                  });

                  return (
                    <div
                      key={slotIdx}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => handleDrop(e, currentDay, slot)}
                      className="h-14 border-b border-white/[0.02] hover:bg-white/[0.05] transition-colors relative group"
                    >
                      {/* Affichage de l'Atome s'il y en a un */}
                      {tasksInSlot.map(task => (
                        <div 
                          key={task.uid} 
                          className="absolute inset-x-1 inset-y-0.5 bg-[#E5484D]/20 border-l-2 border-[#E5484D] p-1.5 rounded-md text-[9px] font-bold text-white shadow-lg z-10 group/task hover:z-20 transition-all flex justify-between items-start"
                        >
                          <span className="truncate pr-2 leading-tight">
                            {task.content.title}
                          </span>
                          
                          {/* Bouton secret pour annuler la programmation */}
                          <button 
                            onClick={(e) => handleUnschedule(e, task.uid)}
                            className="opacity-0 group-hover/task:opacity-100 text-[#E5484D] hover:bg-[#E5484D]/20 rounded p-0.5 transition-all"
                            title="Retirer du calendrier"
                          >
                            <X size={10} />
                          </button>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}