'use client';

import { useState, useEffect } from 'react';
import { projects, tasks } from '../../../lib/apiClient';
import { IProject, ITask } from '@ilot/types';
import { CreateTaskForm } from '../../../components/tasks/CreateTaskForm';
import { TaskBoard } from '../../../components/tasks/TaskBoard';
import { TaskModal } from '../../../components/tasks/TaskModal';
import { Loader2, Plus, LayoutGrid, ListTodo, FolderKanban } from 'lucide-react';

export default function TomHatToesHub() {
  const [fragments, setFragments] = useState<IProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<ITask | null>(null);
  
  // État pour savoir quel projet est en train de recevoir une nouvelle tâche
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);

  const refreshData = async () => {
    setLoading(true);
    try {
      const response = await projects.getAll();
      
      // 📡 SONDE DE TÉLÉMETRIE : Regarde dans la console (F12) de ton navigateur !
      console.log("📦 Réponse brute de l'API Projects :", response);

      // 🛡️ SUTURE DÉFENSIVE : On fouille pour trouver le tableau, peu importe son nom
      let projectArray = [];
      if (Array.isArray(response)) {
        projectArray = response;
      } else if (response && Array.isArray((response as any).data)) {
        projectArray = (response as any).data;
      } else if (response && Array.isArray((response as any).projects)) {
        projectArray = (response as any).projects;
      }

      setFragments(projectArray);

    } catch (err) {
      console.error("🚨 Erreur de synchronisation du Hub:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refreshData(); }, []);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#05070A]">
      <Loader2 className="w-10 h-10 animate-spin text-red-600" />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#05070A] text-slate-100 p-6 md:p-12">
      
      {/* HEADER DU HUB */}
      <header className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black uppercase tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-slate-100 to-red-600">
            Tom-Hat-Toes <span className="text-slate-800">/</span> Hub
          </h1>
          <p className="text-slate-500 font-mono text-xs uppercase tracking-[0.3em] mt-2">
            Gestion centralisée des fragments et brindilles
          </p>
        </div>
        
        {/* Bouton global pour ajouter une tâche sans projet prédéfini */}
        <button 
          onClick={() => setActiveProjectId('global')}
          className="px-6 py-3 bg-slate-900 border border-slate-800 rounded-xl text-[10px] font-black uppercase tracking-widest hover:border-red-500/50 transition-all flex items-center gap-2 group"
        >
          <Plus className="w-4 h-4 text-red-500 group-hover:scale-125 transition-transform" />
          Nouvelle Inception Libre
        </button>
      </header>

      {/* GRILLE DES FRAGMENTS */}
      <div className="space-y-16">
        {fragments.map((project) => (
          <section key={project.uid} className="relative">
            
            {/* Titre du Projet / Fragment */}
            <div className="flex items-center justify-between mb-6 border-b border-slate-900 pb-4">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-red-950/20 rounded-lg border border-red-900/30">
                  <FolderKanban className="w-4 h-4 text-red-500" />
                </div>
                <h2 className="text-xl font-bold uppercase tracking-tight text-slate-200">
                  {project.title}
                </h2>
              </div>
              
              <button 
                onClick={() => setActiveProjectId(project.uid!)}
                className="flex items-center gap-2 text-[9px] font-mono text-slate-500 hover:text-red-400 transition-colors uppercase tracking-widest"
              >
                <Plus className="w-3 h-3" /> Ajouter une brindille
              </button>
            </div>

            {/* Zone de Formulaire Dynamique (S'affiche si on clique sur ajouter) */}
            {activeProjectId === project.uid && (
              <div className="mb-8 animate-in slide-in-from-top-4 duration-300">
                <CreateTaskForm 
                  projectId={project.uid} 
                  onSuccess={() => {
                    setActiveProjectId(null);
                    refreshData();
                  }} 
                />
                <button 
                  onClick={() => setActiveProjectId(null)}
                  className="mt-2 text-[9px] text-slate-600 uppercase font-mono hover:text-slate-400"
                >
                  [ Annuler l'opération ]
                </button>
              </div>
            )}

            {/* Radar des tâches de ce projet */}
            <TaskBoard 
              projectId={project.uid} 
              onTaskClick={(task) => setSelectedTask(task)} 
            />
          </section>
        ))}
      </div>

      {/* MODALE GLOBALE DE CRÉATION LIBRE */}
      {activeProjectId === 'global' && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-[#05070A]/90 backdrop-blur-md">
          <div className="w-full max-w-2xl">
            <CreateTaskForm onSuccess={() => {
              setActiveProjectId(null);
              refreshData();
            }} />
            <button 
              onClick={() => setActiveProjectId(null)}
              className="mt-4 w-full text-center text-xs font-mono text-slate-500 uppercase tracking-widest hover:text-red-400"
            >
              Fermer le sas de création
            </button>
          </div>
        </div>
      )}

      {/* AFFICHAGE TÊTE HAUTE (Modale de Tâche) */}
      {selectedTask && (
        <TaskModal 
          task={selectedTask} 
          onClose={() => setSelectedTask(null)}
          onUpdate={refreshData}
        />
      )}
    </div>
  );
}