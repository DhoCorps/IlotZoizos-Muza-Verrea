"use client";
import * as React from 'react';
const { useState, useEffect, useCallback, useRef, createContext, useContext } = React;
import { completePomodoroAction } from '@/app/actions/kanban.actions';

type PomodoroStatus = 'IDLE' | 'WORK' | 'BREAK' | 'LONG_BREAK';

interface PomodoroContextType {
  secondsLeft: number;
  status: PomodoroStatus;
  activeTaskUid: string | null;
  consecutiveCount: number;
  startFocus: (taskUid: string) => void;
  stopFocus: () => void;
}

const PomodoroContext = createContext<PomodoroContextType | undefined>(undefined);

// C'est CE composant que tu dois coder et exporter
export function PomodoroProvider({ children }: { children: React.ReactNode }) {
  // 1. Définition des états
  const [secondsLeft, setSecondsLeft] = useState(25 * 60);
  const [status, setStatus] = useState<PomodoroStatus>('IDLE');
  const [activeTaskUid, setActiveTaskUid] = useState<string | null>(null);
  const [consecutiveCount, setConsecutiveCount] = useState(0);

  // 🛡️ Références pour les callbacks (évite les dépendances instables)
  const activeTaskUidRef = useRef(activeTaskUid);
  const consecutiveCountRef = useRef(consecutiveCount);

  useEffect(() => {
    activeTaskUidRef.current = activeTaskUid;
    consecutiveCountRef.current = consecutiveCount;
  }, [activeTaskUid, consecutiveCount]);

  // 2. Forge de handlePhaseEnd (La Suture UI -> Silice)
  const handlePhaseEnd = useCallback(async () => {
    if (status === 'WORK') {
      // 🔗 1. Sceller l'effort dans la Silice
      if (activeTaskUidRef.current) {
        try {
          await completePomodoroAction(activeTaskUidRef.current);
        } catch (err) {
          console.error("Échec de la sédimentation :", err);
        }
      }

      // 🔄 2. Transition vers la Stase
      const newCount = consecutiveCountRef.current + 1;
      setConsecutiveCount(newCount);

      if (newCount > 0 && newCount % 4 === 0) {
        setStatus('LONG_BREAK');
        setSecondsLeft(30 * 60); // Grande Stase
      } else {
        setStatus('BREAK');
        setSecondsLeft(5 * 60);  // Micro-Stase
      }

     // 🔔 3. Signal de Wall-E - Suture ultime
      if (typeof window !== 'undefined' && typeof window.Audio === 'function') {
        try {
          const audio = new Audio('/sounds/bell.mp3');
          audio.play().catch(() => {});
        } catch (e) {
          // Silencieux en test
        }
      }
    } else {
      // Fin de pause : on revient à l'état de simple présence
      if (status === 'LONG_BREAK') setConsecutiveCount(0);
      setStatus('IDLE');
      setActiveTaskUid(null);
    }
  }, [status]);
  
  // 🌟 SUTURE : Initialisation explicite des fonctions startFocus et stopFocus
  // Elles doivent être déclarées ICI pour exister dans le scope du return.
  const startFocus = useCallback((taskUid: string) => {
    setActiveTaskUid(taskUid);
    setSecondsLeft(25 * 60);
    setStatus('WORK');
  }, []); // Dépendances vides car on ne veut pas qu'elle change

  const stopFocus = useCallback(() => {
    setStatus('IDLE');
    setActiveTaskUid(null);
  }, []); //

  // 3. Horlogerie du Nexus (Timer)
  useEffect(() => {
    if (status === 'IDLE') return;
    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handlePhaseEnd();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [status, handlePhaseEnd]);

  // 4. LE SCELLÉ : Passage des fonctions dans le Provider
  // Grâce aux définitions ci-dessus, startFocus et stopFocus existent maintenant dans ce scope.
  return (
    <PomodoroContext.Provider 
      value={{ 
        secondsLeft, 
        status, 
        activeTaskUid, 
        consecutiveCount, 
        startFocus, // ✅ Désormais reconnu
        stopFocus   // ✅ Désormais reconnu
      }}
    >
      {children}
    </PomodoroContext.Provider>
  );
}
export const usePomodoro = () => {
  const context = useContext(PomodoroContext);
  if (!context) throw new Error("usePomodoro doit être utilisé dans un PomodoroProvider");
  return context;
};