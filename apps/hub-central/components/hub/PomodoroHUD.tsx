// apps/hub-central/components/pomodoro/PomodoroHUD.tsx
"use client";

import { usePomodoro } from '../../context/PomodoroContext';
import { Timer, Zap, BatteryCharging, XCircle } from 'lucide-react';

export default function PomodoroHUD() {
  const { secondsLeft, status, consecutiveCount, stopFocus } = usePomodoro();

  if (status === 'IDLE') return null;

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  
  const isWork = status === 'WORK';
  const isLongBreak = status === 'LONG_BREAK';

  // Calcul du cycle actuel (ex: 1/4, 2/4...)
  const cycleDisplay = isLongBreak ? 4 : (consecutiveCount % 4) + (isWork ? 1 : 0);

  // Thèmes dynamiques selon l'état [cite: 2026-03-27]
  let themeClasses = "";
  let Icon = Timer;
  let label = "";

  if (isWork) {
    // 🩸 Rouge Signature de l'Îlot (Effort de Sédimentation)
    themeClasses = "bg-[#E5484D]/10 border-[#E5484D]/30 text-[#E5484D]";
    Icon = Timer;
    label = "Sédimentation";
  } else if (isLongBreak) {
    // 🌑 Gris Bleuté Profond (Stase Longue)
    themeClasses = "bg-slate-900/80 border-slate-700/50 text-slate-400";
    Icon = BatteryCharging;
    label = "Grande Stase";
  } else {
    // 💨 Gris Bleuté Lumineux (Micro-Stase)
    themeClasses = "bg-slate-800/80 border-slate-600/50 text-slate-300";
    Icon = Zap;
    label = "Micro-Stase";
  }

  return (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-bottom-10 duration-500">
      <div className={`flex items-center gap-6 px-6 py-4 rounded-2xl border backdrop-blur-xl shadow-2xl transition-all duration-700 bg-[#05070A]/90 ${themeClasses}`}>
        
        <div className="flex items-center gap-3">
          <Icon className={isWork ? "animate-pulse" : ""} size={24} />
          <span className="text-2xl font-black font-mono tracking-tighter text-white">
            {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
          </span>
        </div>

        <div className="h-8 w-[1px] bg-white/10" />

        <div className="flex flex-col">
          <span className="text-[10px] font-black uppercase tracking-widest opacity-70">
            {label}
          </span>
          <span className="text-xs font-bold text-slate-400">
            Cycle : {cycleDisplay} / 4 ⚡
          </span>
        </div>

        <button 
          onClick={stopFocus}
          className="ml-4 p-2 hover:bg-white/10 rounded-full text-slate-500 hover:text-white transition-all"
          title="Briser le sceau temporel"
        >
          <XCircle size={20} />
        </button>
      </div>
    </div>
  );
}