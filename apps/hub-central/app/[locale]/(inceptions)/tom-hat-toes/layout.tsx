'use client';

import Sidebar from "../../../../components/navigation/Sidebar";
// 🍅 Importation des organes temporels
import { PomodoroProvider } from "../../../../context/PomodoroContext";
import PomodoroHUD from "../../../../components/hub/PomodoroHUD";
import '../../../globals.css'

export default function InceptionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // 🛡️ L'enveloppe protectrice du temps
    <PomodoroProvider>
      <div className="relative min-h-screen">
        {/* 🦅 Ta Boussole Flottante à gauche */}
        <Sidebar />

        {/* 🌍 Le reste de l'Îlot (Tes pages comme tom-hat-toes) */}
        <main className="pl-50 pr-8 py-8"> 
          {/* On ajoute du padding à gauche (pl-40) pour l'équilibre visuel */}
          {children}
        </main>

        {/* 🛸 Le HUD surgit ici, au-dessus de la matrice */}
        <PomodoroHUD />
      </div>
    </PomodoroProvider>
  );
}