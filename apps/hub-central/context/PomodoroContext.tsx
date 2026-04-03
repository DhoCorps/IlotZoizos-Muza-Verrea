"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { completePomodoroAction } from '../app/actions/kanban.actions';

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
  const [secondsLeft, setSecondsLeft] = useState(25 * 60);
  const [status, setStatus] = useState<PomodoroStatus>('IDLE');
  const [activeTaskUid, setActiveTaskUid] = useState<string | null>(null);
  const [consecutiveCount, setConsecutiveCount] = useState(0);

  const activeTaskUidRef = useRef(activeTaskUid);
  const consecutiveCountRef = useRef(consecutiveCount);

  useEffect(() => {
    activeTaskUidRef.current = activeTaskUid;
    consecutiveCountRef.current = consecutiveCount;
  }, [activeTaskUid, consecutiveCount]);

  const handlePhaseEnd = useCallback(async () => {
    if (status === 'WORK') {
      if (activeTaskUidRef.current) {
        await completePomodoroAction(activeTaskUidRef.current);
      }
      const newCount = consecutiveCountRef.current + 1;
      setConsecutiveCount(newCount);
      if (newCount > 0 && newCount % 4 === 0) {
        setStatus('LONG_BREAK');
        setSecondsLeft(30 * 60);
      } else {
        setStatus('BREAK');
        setSecondsLeft(5 * 60);
      }
      if (typeof window !== 'undefined') {
        new Audio('/sounds/bell.mp3').play().catch(() => {});
      }
    } else {
      if (status === 'LONG_BREAK') setConsecutiveCount(0);
      setStatus('IDLE');
      setActiveTaskUid(null);
    }
  }, [status]);

  const startFocus = useCallback((taskUid: string) => {
    setActiveTaskUid(taskUid);
    setSecondsLeft(25 * 60);
    setStatus('WORK');
  }, []);

  const stopFocus = useCallback(() => {
    setStatus('IDLE');
    setActiveTaskUid(null);
  }, []);

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

  return (
    <PomodoroContext.Provider value={{ secondsLeft, status, activeTaskUid, consecutiveCount, startFocus, stopFocus }}>
      {children}
    </PomodoroContext.Provider>
  );
}

export const usePomodoro = () => {
  const context = useContext(PomodoroContext);
  if (!context) throw new Error("usePomodoro doit être utilisé dans un PomodoroProvider");
  return context;
};