// apps/hub-central/app/[locale]/(inceptions)/tom-hat-toes/page.tsx
'use client';

import React from 'react';
import { 
  Loader2, Plus, Trash2, X, BarChart3, Search, Check, AlertCircle, LogOut, ShieldCheck
} from 'lucide-react';

import { ProjectDashboard } from '@/components/projects/ProjectDashboard';
import { ProjectForm } from '@/components/projects/ProjectForm';
import { TaskCard } from '@/components/tasks/TaskCard';
import { TaskForm } from '@/components/tasks/TaskForm';
import { TeamForm } from '@/components/teams/TeamForm'; 
import { TeamCard } from '@/components/teams/TeamCard'; 
import KanbanDrawer from '@/components/kanban/KanbanDrawer'; 
import CalendarView from '@/components/calendars/CalendarView';
import ResonanceButton from '@/components/resonance/ResonanceButton';
import { PomodoroWarehouse } from '@/components/pomodoro/PomodoroWareHouse';
import { PomodoroProvider } from '@/context/PomodoroContext'; 
import PomodoroHUD from '@/components/hub/PomodoroHUD'; 
import { useHubNexus } from './useHubNexus';
import { ITask } from '@ilot/types';

import dynamic from 'next/dynamic';

const ContextualGraph = dynamic(
  () => import('../../../../components/graph/ContextualGraph').then((mod) => mod.ContextualGraph), 
  { ssr: false, loading: () => <p className="text-[#E5484D] animate-pulse text-[10px] uppercase font-black">Éveil du Graphe...</p> }
);

export default function TomHatToesHub() {
  const nexus = useHubNexus();

  // Si le chargement initial est en cours et qu'il n'y a rien à afficher
  if (nexus.status === 'loading' || (nexus.loading && nexus.inceptions.length === 0)) return (
    <div className="min-h-screen flex items-center justify-center bg-[#05070A]">
      <Loader2 className="w-10 h-10 animate-spin text-[#E5484D]" />
    </div>
  );

  const capabilityGroups = [
    {
      title: 'Administration du Nid',
      caps: [
        { id: 'team:create', label: 'team:create (Fonder un Nid)' },
        { id: 'team:read', label: 'team:read (Observer le Nid)' },
        { id: 'team:update', label: 'team:update (Régler les Fréquences)' },
        { id: 'team:delete', label: 'team:delete (Dissoudre le Nid)' },
        { id: 'team:manage-members', label: 'team:manage-members (Gouverner)' }
      ]
    },
    {
      title: 'Gestion de la Volée',
      caps: [
        { id: 'member:invite', label: 'member:invite (Recruter)' },
        { id: 'member:read', label: 'member:read (Voir les Profils)' },
        { id: 'member:list', label: 'member:list (Lister la Volée)' },
        { id: 'member:update', label: 'member:update (Modifier les Droits)' },
        { id: 'member:exile', label: 'member:exile (Bannir au loin)' }
      ]
    },
    {
      title: 'Fragments (Projets)',
      caps: [
        { id: 'project:create', label: 'project:create (Forger un Chantier)' },
        { id: 'project:read', label: 'project:read (Voir les Chantiers)' },
        { id: 'project:update', label: 'project:update (Fignoler le Chantier)' },
        { id: 'project:delete', label: 'project:delete (Raser le Chantier)' },
        { id: 'project:archive', label: 'project:archive (Archiver les Traces)' }
      ]
    },
    {
      title: 'Tâches Opérationnelles',
      caps: [
        { id: 'task:create', label: 'task:create (Forger un Atome)' },
        { id: 'task:read', label: 'task:read (Observer les Atomes)' },
        { id: 'task:update', label: 'task:update (Fignoler l\'Atome)' },
        { id: 'task:delete', label: 'task:delete (Désintégrer l\'Atome)' },
        { id: 'task:move', label: 'task:move (Piloter sur le Kanban)' }
      ]
    },
    {
      title: 'Archives & Le Cierge (Storage)',
      caps: [
        { id: 'file:upload', label: 'file:upload (Injecter des Fichiers)' },
        { id: 'file:read', label: 'file:read (Parcourir la Bibliothèque)' },
        { id: 'file:update', label: 'file:update (Renommer la Trace)' },
        { id: 'file:download', label: 'file:download (Extraire la Matière)' },
        { id: 'file:burn', label: 'file:burn (Brûler le document)' }
      ]
    },
    {
      title: 'Pouvoirs Système',
      caps: [
        { id: 'wellbeing:monitor', label: 'wellbeing:monitor (Santé Collective)' },
        { id: 'moderation:execute', label: 'moderation:execute (Modération Alpha)' },
        { id: '*', label: '* (Aura Absolue de l\'Architecte)' }
      ]
    }
  ];

  return (
    <PomodoroProvider>
      <div className="min-h-screen bg-[#05070A] text-slate-100 p-6 md:p-12 relative overflow-x-hidden">
        
        {/* Graphique de Contexte (D3/Neo4j) */}
        {(nexus.selectedProjectUid || nexus.activeInceptionId) && (
          <div className="fixed inset-0 pointer-events-none z-0 opacity-40">
             <ContextualGraph 
               rootUid={nexus.selectedProjectUid || nexus.activeInceptionId || ''} 
               onNodeDoubleClick={(uid) => nexus.setActiveInceptionId(uid)}
             />
          </div>
        )}

        {/* 🚨 Bandeau Mode Éclaireur (Invitation en cours) */}
        {nexus.selectedTeamUid && nexus.isInviteeMode && (
          <div className="relative z-50 max-w-7xl mx-auto mb-6 p-4 bg-gradient-to-r from-[#E5484D]/20 to-amber-500/10 border border-[#E5484D]/30 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 animate-in fade-in slide-in-from-top-4 duration-300">
            <div className="flex items-center gap-3">
              <AlertCircle className="text-[#E5484D] animate-pulse shrink-0" size={20} />
              <div>
                <p className="text-xs font-black uppercase tracking-wide text-slate-200">Mode Éclaireur : Territoire en Consultation</p>
                <p className="text-[11px] font-mono text-slate-400">Vous êtes invité à rejoindre l'escouade "{nexus.activeTeam?.name}". Explorez ses projets avant de valider.</p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button 
                onClick={() => nexus.handleRespondToInvitation('REFUSE')} 
                disabled={nexus.isResponding}
                className="px-4 py-2 bg-black/40 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-wider text-slate-400 hover:text-white hover:border-red-500/40 transition-all"
              >
                Refuser
              </button>
              <button 
                onClick={() => {
                  if (window.confirm("Effacer définitivement TOUTES vos activités et assignations dans ce Nid ?")) {
                    nexus.handleRespondToInvitation('PURGE_REFUSE');
                  }
                }}
                disabled={nexus.isResponding}
                className="px-4 py-2 bg-red-500/10 border border-red-500/20 rounded-xl text-[10px] font-black uppercase tracking-wider text-red-400 hover:bg-red-500/20 transition-all"
              >
                Purger & Refuser
              </button>
              <button 
                onClick={() => nexus.handleRespondToInvitation('ACCEPT')} 
                disabled={nexus.isResponding}
                className="px-5 py-2 bg-[#E5484D] hover:bg-[#c43d41] rounded-xl text-[10px] font-black uppercase tracking-wider text-white shadow-[0_0_20px_rgba(229,72,77,0.2)] flex items-center gap-2 transition-all"
              >
                {nexus.isResponding ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />} Signer le Pacte
              </button>
            </div>
          </div>
        )}

        {/* 🚨 Bandeau Quitter le Nid Volontairement */}
        {nexus.selectedTeamUid && !nexus.isInviteeMode && nexus.activeTeam?.ownerUid !== (nexus.session?.user as any)?.uid && (
          <div className="relative z-50 max-w-7xl mx-auto mb-6 p-4 bg-white/[0.02] border border-white/5 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 animate-in fade-in duration-300">
            <div className="flex items-center gap-3">
              <LogOut className="text-[#E5484D] shrink-0" size={18} />
              <div>
                <p className="text-xs font-black uppercase tracking-wide text-slate-200">Désengagement Volontaire</p>
                <p className="text-[11px] font-mono text-slate-400">Vous êtes membre de l'escouade "{nexus.activeTeam?.name}". Vous êtes libre de vous en détacher.</p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button 
                onClick={() => nexus.handleLeaveTeamVoluntarily(nexus.selectedTeamUid!, 'CLEAN')} 
                className="px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-xl text-[10px] font-black uppercase tracking-wider text-red-400 hover:bg-red-500/20 transition-all"
              >
                Partir avec mes plumes (Clean)
              </button>
              <button 
                onClick={() => nexus.handleLeaveTeamVoluntarily(nexus.selectedTeamUid!, 'TRACE')} 
                className="px-3 py-2 bg-slate-850 border border-white/5 rounded-xl text-[10px] font-black uppercase tracking-wider text-slate-400 hover:text-white hover:bg-white/5 transition-all"
              >
                Laisser mes traces (Trace)
              </button>
            </div>
          </div>
        )}

        {/* En-tête de page global */}
        <header className="relative z-10 mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h1 className="text-4xl font-black uppercase tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-slate-100 to-[#E5484D]">
              Tom-Hat-Toes <span className="text-slate-800">/</span> Hub
            </h1>
            <p className="text-slate-500 font-mono text-[10px] uppercase tracking-[0.3em] mt-2">
              Politique Matrioshka : Nid &gt; Chantier &gt; Atome
            </p>
          </div>

          <div className="flex items-center gap-4">
            <button onClick={nexus.handleLeaveSanctuary} disabled={nexus.isExiling} className="p-4 border border-red-900/30 rounded-xl hover:bg-red-500/10 text-red-600 disabled:opacity-50 transition-all">
              <Trash2 className="w-4 h-4" />
            </button>
            <button 
              onClick={() => { if(!nexus.isInviteeMode) { nexus.setActiveInceptionId('global'); } }}
              disabled={nexus.isInviteeMode && nexus.activeTab === 'projects'}
              className="px-6 py-4 bg-[#E5484D]/10 border border-[#E5484D]/20 rounded-xl text-[10px] font-black uppercase tracking-widest text-[#E5484D] hover:bg-[#E5484D]/20 disabled:opacity-20 disabled:cursor-not-allowed transition-all"
            >
              <Plus className="w-4 h-4 mr-2 inline" /> {nexus.activeTab === 'teams' ? 'Fonder un Nid' : 'Sceller un Chantier'}
            </button>
          </div>
        </header>

        {/* Navigation / Onglets */}
        <nav className="relative z-10 flex gap-10 mb-12 border-b border-white/5">
          {['teams', 'projects', 'horizon'].map((tabId) => (
            <button 
              key={tabId}
              onClick={() => nexus.NavActiveTab(tabId as any)}
              className={`pb-4 text-[11px] uppercase font-black tracking-widest transition-all relative ${nexus.activeTab === tabId ? 'text-[#E5484D]' : 'text-slate-600 hover:text-slate-300'}`}
            >
              {tabId === 'teams' ? 'Escouades (Nids)' : tabId === 'projects' ? 'Chantiers (Projets)' : 'Horizon'}
              {nexus.activeTab === tabId && <div className="absolute bottom-0 left-0 w-full h-[2px] bg-[#E5484D] shadow-[0_0_10px_#E5484D]" />}
            </button>
          ))}
        </nav>

        {/* Contenu Principal */}
        <main className="relative z-10">
          
          {/* ONGLET 1 : ÉQUIPES (NIDS) */}
          {nexus.activeTab === 'teams' ? (
            <div className="grid grid-cols-1 gap-6">
              {nexus.inceptions.map((team) => (
                <TeamCard
                  key={team.uid}
                  team={team}
                  isActive={nexus.selectedTeamUid === team.uid}
                  isInvitation={team.isInvitation === true}
                  onFocus={(uid) => {
                    nexus.setSelectedTeamUid(uid);
                    if (team.isInvitation !== true) {
                      if (nexus.userCaps.includes('team:update') || nexus.userCaps.includes('*')) {
                        nexus.setActiveInceptionId('team_edit');
                      }
                    }
                  }}
                  onRecruit={(uid) => nexus.setActiveInceptionId(uid)}
                  onCreateProject={(uid) => {
                    nexus.setSelectedTeamUid(uid);
                    nexus.NavActiveTab('projects');
                    nexus.setActiveInceptionId('global');
                  }}
                  onRespond={(uid, action) => nexus.handleRespondToInvitation(action as any, uid)}
                  onViewProjects={(uid) => {
                    nexus.setSelectedTeamUid(uid);
                    nexus.setSelectedProjectUid(null);
                    nexus.NavActiveTab('projects');
                  }}
                  onManageInvitation={nexus.handleManageInvitation} 
                  onDelete={nexus.handleDeleteTeam}
                />
              ))}
            </div>
          ) : nexus.activeTab === 'projects' ? (
            
            /* ONGLET 2 : PROJETS & TÂCHES (CHANTIERS & ATOMES) */
            <div className="space-y-12">
              <ProjectDashboard 
                projects={nexus.visibleProjects} 
                onViewTasks={nexus.fetchTasks} 
                onEditProject={(uid) => { 
                  if (!nexus.isInviteeMode) {
                    nexus.setSelectedProjectUid(uid); 
                    nexus.setActiveInceptionId('project_edit'); 
                  }
                }} 
                onCreateTask={(uid) => { 
                  if (!nexus.isInviteeMode) {
                    nexus.setSelectedProjectUid(uid); 
                    nexus.fetchTasks(uid); 
                    nexus.setActiveInceptionId('task_new'); 
                  }
                }} 
                onDelete={nexus.handleDeleteProject}
              />

              {nexus.selectedProjectUid && (
                <div className="mt-12 p-8 bg-white/[0.02] border border-white/5 rounded-3xl animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="flex justify-between items-center mb-8">
                    <h3 className="text-2xl font-black uppercase flex items-center gap-3">
                      <BarChart3 className="text-[#E5484D]" /> Atomes du Chantier
                    </h3>
                    <button onClick={() => nexus.setIsKanbanOpen(true)} className="px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-[10px] uppercase font-black hover:bg-slate-800 transition-colors">
                      Ouvrir le Kanban
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {nexus.projectTasks.map((task: ITask) => (
                      <div key={task.uid} className="relative group/atome cursor-pointer">
                        <TaskCard 
                          task={task} 
                          onStatusChange={nexus.refreshData} 
                          onDelete={nexus.handleDeleteTask} 
                          onEdit={(t) => {
                            if (!nexus.isInviteeMode) {
                              nexus.setSelectedTaskUid(t.uid);
                              nexus.setActiveInceptionId('task_edit');
                            }
                          }}
                        />
                      </div>
                    ))}
                    
                    <button 
                      onClick={() => { if(!nexus.isInviteeMode) { nexus.setActiveInceptionId('task_new'); } }} 
                      disabled={nexus.isInviteeMode}
                      className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center transition-all ${
                        nexus.isInviteeMode 
                          ? 'border-white/5 text-slate-700 cursor-not-allowed bg-black/10' 
                          : 'border-white/5 text-slate-600 hover:text-[#E5484D]'
                      }`}
                    >
                      <Plus /> 
                      <span className="text-[10px] font-black uppercase mt-2">
                        {nexus.isInviteeMode ? "Aura verrouillée (Lecture)" : "Nouvel Atome"}
                      </span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* ONGLET 3 : HORIZON (POMODORO & CALENDRIER) */
            <div className="space-y-8 animate-in fade-in duration-500">
              <PomodoroWarehouse 
                totalPomos={nexus.projectTasks.reduce(
                  (acc: number, t: { pomodoros?: { completed?: number } }) => acc + (t.pomodoros?.completed || 0), 
                  0
                )} 
              />
              <CalendarView 
                tasks={nexus.projectTasks} 
                onEmptySlotClick={(date) => {
                  nexus.setSelectedSlotDate(date);
                  if (!nexus.isInviteeMode) {
                    nexus.setActiveInceptionId('task_new');
                  }
                }} 
                onDelete={nexus.handleDeleteTask} 
                onEdit={(t) => {
                  if (!nexus.isInviteeMode) {
                    nexus.setSelectedTaskUid(t.uid);
                    nexus.setActiveInceptionId('task_edit');
                  }
                }}
                onTaskDrop={() => {
                  if (nexus.selectedProjectUid) {
                    // Relance la requête pour recharger les tâches après un drag & drop (géré par useQuery)
                    nexus.fetchTasks(nexus.selectedProjectUid);
                  }
                }}
              />
            </div>
          )}
        </main>

        {/* 🪟 OVERLAY MATRIOSHKA : MODALES DYNAMIQUES */}
        {nexus.activeInceptionId && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-[#05070A]/95 backdrop-blur-xl">
             <div className="w-full max-w-2xl bio-card p-10 relative border border-white/5">
                <button 
                  onClick={() => { 
                    nexus.setActiveInceptionId(null); 
                    nexus.setSelectedTaskUid(null); 
                    nexus.setSelectedSlotDate(null); 
                  }} 
                  className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors"
                >
                  <X size={20} />
                </button>
                
                {/* 1. FORMULAIRE D'ATOME (TÂCHE) */}
                {nexus.activeInceptionId === 'task_new' || nexus.activeInceptionId === 'task_edit' ? (
                  <TaskForm 
                      projectUid={nexus.selectedProjectUid} 
                      birds={nexus.foundBirds} 
                      existingTasks={nexus.projectTasks}
                      initialScheduledDate={nexus.selectedSlotDate}
                      onCancel={() => { nexus.setSelectedSlotDate(null); nexus.setActiveInceptionId(null); }} 
                      onSubmit={nexus.activeInceptionId === 'task_edit' ? nexus.handleUpdateTask : nexus.handleCreateTask}  
                      projectCapabilities={nexus.userCaps} 
                      loading={nexus.loading} 
                      initialData={nexus.activeInceptionId === 'task_edit' ? nexus.projectTasks.find((t: { uid: string }) => t.uid === nexus.selectedTaskUid) : null}
                    />
                ) : 
                
                /* 2. FORMULAIRES DE NID & CHANTIER (TEAM & PROJECT) */
                (nexus.activeInceptionId === 'global' || nexus.activeInceptionId === 'project_edit' || nexus.activeInceptionId === 'team_edit') ? (
                  (nexus.activeTab === 'teams' && nexus.activeInceptionId !== 'project_edit') || nexus.activeInceptionId === 'team_edit' ? (
                    <TeamForm 
                      onSuccess={nexus.handleCreateSuccess} 
                      onCancel={() => nexus.setActiveInceptionId(null)} 
                      userCapabilities={nexus.userCaps} 
                      initialData={nexus.activeInceptionId === 'team_edit' ? nexus.inceptions.find(t => t.uid === nexus.selectedTeamUid) : null}
                    />
                  ) : (
                    <ProjectForm 
                      ownerUid={nexus.selectedTeamUid || ''} 
                      existingProjects={nexus.projects} 
                      userCapabilities={nexus.userCaps} 
                      onSuccess={nexus.handleCreateSuccess} 
                      onCancel={() => nexus.setActiveInceptionId(null)} 
                      initialData={nexus.activeInceptionId === 'project_edit' ? nexus.projects.find(p => p.uid === nexus.selectedProjectUid) : null}
                    />
                  )
                ) : 
                
                /* 3. RADAR DE RECRUTEMENT (OISEAUX & CAPACITÉS) */
                (
                  <div className="space-y-6">
                    <div className="relative">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                      <input 
                        type="text" 
                        placeholder="Chercher un oiseau..." 
                        value={nexus.searchBird} 
                        onChange={(e) => nexus.handleSearchBirds(e.target.value)} 
                        className="w-full bg-black/40 border border-white/10 p-4 pl-12 rounded-xl outline-none focus:border-[#E5484D] transition-all" 
                      />
                    </div>

                    <div className="p-5 bg-white/[0.01] border border-white/5 rounded-2xl space-y-4 max-h-80 overflow-y-auto custom-scrollbar">
                      <div className="text-[10px] uppercase font-black tracking-widest text-[#E5484D] flex items-center gap-2 sticky top-0 bg-[#05070A]/95 py-1 z-10">
                        <ShieldCheck size={14} /> Configuration complète de l'Aura de l'oiseau
                      </div>
                      
                      {capabilityGroups.map(group => (
                        <div key={group.title} className="space-y-2 pt-2 border-t border-white/5 first:border-t-0">
                          <h4 className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">{group.title}</h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
                            {group.caps.map(cap => {
                              const isChecked = nexus.selectedCaps.includes(cap.id);
                              return (
                                <label key={cap.id} className={`flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition-all border ${isChecked ? 'bg-[#E5484D]/10 border-[#E5484D]/30 text-slate-100' : 'bg-black/20 border-white/5 text-slate-500 hover:border-white/10'}`}>
                                  <input 
                                    type="checkbox" 
                                    checked={isChecked} 
                                    onChange={() => {
                                      if (isChecked) {
                                        nexus.setSelectedCaps(nexus.selectedCaps.filter(c => c !== cap.id));
                                      } else {
                                        nexus.setSelectedCaps([...nexus.selectedCaps, cap.id]);
                                      }
                                    }}
                                    className="accent-[#E5484D] h-3.5 w-3.5 rounded border-white/10 bg-black/40"
                                  />
                                  <span className="text-[10px] font-bold tracking-tight">{cap.label}</span>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Liste des résultats (Oiseaux trouvés) */}
                    <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto custom-scrollbar">
                      {nexus.foundBirds.map(bird => (
                        <div key={bird.uid} className="p-4 bg-white/5 rounded-xl flex justify-between items-center transition-all hover:bg-white/10">
                          <span className="font-bold text-slate-200">{bird.pseudo}</span>
                          
                          <div className="flex items-center gap-2">
                            {/* 🕸️ Intégration du Bouton de Résonance global (Suivre l'Oiseau) */}
                            <ResonanceButton 
                              targetSlug={bird.uid} 
                              type="FOLLOWS_GLOBAL" 
                              variant="icon" 
                            />

                            {/* Bouton de recrutement / invitation au Nid */}
                            <button 
                              onClick={() => nexus.inviteBirdToTeam(nexus.activeInceptionId!, bird.uid)} 
                              disabled={nexus.isRecruiting} 
                              className="p-2.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/20 transition-all disabled:opacity-50"
                              title="Inviter au Nid"
                            >
                              <Plus size={16} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
             </div>
          </div>
        )}

        {/* Tiroirs Globaux (Kanban & Pomodoro) */}
        <KanbanDrawer tasks={nexus.projectTasks} isOpen={nexus.isKanbanOpen} onClose={() => nexus.setIsKanbanOpen(false)} />
        <PomodoroHUD />
      </div>
    </PomodoroProvider>
  );
}