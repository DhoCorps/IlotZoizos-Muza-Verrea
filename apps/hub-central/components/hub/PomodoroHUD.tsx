"use client";

import { usePomodoro } from '../../context/PomodoroContext';
import { Timer, Coffee, BatteryCharging, XCircle } from 'lucide-react';

export default function PomodoroHUD() {
  const { secondsLeft, status, consecutiveCount, stopFocus } = usePomodoro();

  if (status === 'IDLE') return null;

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  
  const isWork = status === 'WORK';
  const isLongBreak = status === 'LONG_BREAK';

  // Calcul du cycle actuel (ex: 1/4, 2/4...)
  const cycleDisplay = isLongBreak ? 4 : (consecutiveCount % 4) + (isWork ? 1 : 0);

  // Thèmes dynamiques selon l'état
  let themeClasses = "";
  let Icon = Timer;
  let label = "";

  if (isWork) {
    themeClasses = "bg-red-950/40 border-red-500/30 text-red-500";
    Icon = Timer;
    label = "Phase de Focus";
  } else if (isLongBreak) {
    // Le gris bleuté pour la récupération profonde
    themeClasses = "bg-slate-800/80 border-slate-500/50 text-slate-300";
    Icon = BatteryCharging;
    label = "Récupération Profonde";
  } else {
    themeClasses = "bg-emerald-950/40 border-emerald-500/30 text-emerald-500";
    Icon = Coffee;
    label = "Pause Courte";
  }

  return (
    <div className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-bottom-10 duration-500`}>
      <div className={`flex items-center gap-6 px-6 py-4 rounded-2xl border backdrop-blur-xl shadow-2xl transition-all duration-700 ${themeClasses}`}>
        
        <div className="flex items-center gap-3">
          <Icon className={isWork ? "animate-pulse" : ""} />
          <span className="text-2xl font-black font-mono tracking-tighter text-white">
            {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
          </span>
        </div>

        <div className="h-8 w-[1px] bg-white/20" />

        <div className="flex flex-col">
          <span className="text-[10px] font-black uppercase tracking-widest opacity-70 text-white">
            {label}
          </span>
          <span className="text-xs font-bold text-white/90">
            Cycle : {cycleDisplay} / 4 🍅
          </span>
        </div>

        <button 
          onClick={stopFocus}
          className="ml-4 p-2 hover:bg-white/10 rounded-full text-white/50 hover:text-white transition-all"
        >
          <XCircle size={20} />
        </button>
      </div>
    </div>
  );
}