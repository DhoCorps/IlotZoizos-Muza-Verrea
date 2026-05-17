// apps/hub-central/app/[locale]/(inceptions)/tom-hat-toes/page.tsx
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSession, signOut } from 'next-auth/react'; 
import { 
  Loader2, Plus, Network, UserPlus, ShieldCheck, 
  Trash2, X, BarChart3, Search, Check, AlertCircle, LogOut
} from 'lucide-react';

import { ProjectDashboard } from '../../../../components/projects/ProjectDashboard';
import { ProjectForm } from '../../../../components/projects/ProjectForm';
import { TaskCard } from '../../../../components/tasks/TaskCard';
import { TaskForm } from '../../../../components/tasks/TaskForm';
import { TeamForm } from '../../../../components/teams/TeamForm'; 
import KanbanDrawer from '../../../../components/kanban/KanbanDrawer'; 
import CalendarView from '../../../../components/calendars/CalendarView';

import { PomodoroProvider } from '../../../../context/PomodoroContext'; 
import PomodoroHUD from '../../../../components/hub/PomodoroHUD'; 

import { teams as apiTeams, projects as apiProjects } from '../../../../lib/apiClient';

import dynamic from 'next/dynamic';

const ContextualGraph = dynamic(
  () => import('../../../../components/graph/ContextualGraph').then((mod) => mod.ContextualGraph), 
  { ssr: false, loading: () => <p className="text-[#E5484D] animate-pulse text-[10px] uppercase font-black">Éveil du Graphe...</p> }
);

export default function TomHatToesHub() {
  const { data: session, status } = useSession(); 
  const userCaps = (session as any)?.user?.capabilities || [];
  
  // --- ÉTATS DU NEXUS ---
  const [inceptions, setInceptions] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [projectTasks, setProjectTasks] = useState<any[]>([]); 
  
  const [selectedProjectUid, setSelectedProjectUid] = useState<string | null>(null);
  const [selectedTeamUid, setSelectedTeamUid] = useState<string | null>(null); 
  
  const [loading, setLoading] = useState(true);
  const [activeInceptionId, setActiveInceptionId] = useState<string | null>(null);
  
  const [activeTab, setActiveTab] = useState<'teams' | 'projects' | 'horizon'>('teams');
  const [isKanbanOpen, setIsKanbanOpen] = useState(false); 

  const [searchBird, setSearchBird] = useState("");
  const [foundBirds, setFoundBirds] = useState<any[]>([]);
  const [isRecruiting, setIsRecruiting] = useState(false);
  const [isExiling, setIsExiling] = useState(false);
  const [isResponding, setIsResponding] = useState(false);

  // Déduction dynamique du Nid actuellement ausculté
  const activeTeam = useMemo(() => {
    return inceptions.find(t => t.uid === selectedTeamUid) || null;
  }, [inceptions, selectedTeamUid]);

  // Détermination du mode Visiteur d'Honneur (Invitation reçue non encore acceptée)
  const isInviteeMode = useMemo(() => {
    return activeTeam?.relationType === 'INVITED_TO';
  }, [activeTeam]);

  // --- 🪡 SUTURE : Synchronisation Silice & Graphe ---
  const refreshData = async () => {
    setLoading(true);
    try {
      // 🪡 SUTURE : Utilisation des os unifiés de l'apiClient
      const [teamsRes, projectsRes] = await Promise.all([
        apiTeams.getAll(),
        apiProjects.getAll()
      ]);

      setInceptions(teamsRes);
      setProjects(projectsRes);

      if (selectedProjectUid) {
        await fetchTasks(selectedProjectUid);
      }
    } catch (err) {
      console.error("🚨 Échec de synchronisation Hub via Client API:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { 
    if (status === 'authenticated') refreshData(); 
  }, [status]); 

  // --- 🪡 SUTURE : Logique Matrioshka (Filtrage) ---
  const visibleProjects = useMemo(() => {
    if (!selectedTeamUid) return []; 
    return projects.filter(p => p.ownerUid === selectedTeamUid);
  }, [projects, selectedTeamUid]);

  // 🪡 SUTURE : L'Amorceur Automatique
  useEffect(() => {
    if (activeTab === 'projects' && visibleProjects.length > 0 && !selectedProjectUid) {
      fetchTasks(visibleProjects[0].uid);
    }
  }, [visibleProjects, activeTab]);

  const fetchTasks = async (pUid: string) => {
    try {
      // 🪡 SUTURE : Ajout d'un Cache-Buster (timestamp) pour forcer la lecture de la Silice
      const res = await fetch(`/api/tasks?projectUid=${pUid}&t=${Date.now()}`).then(r => r.json());
      const tasks = Array.isArray(res) ? res : (res.data || []);
      setProjectTasks(tasks);
      setSelectedProjectUid(pUid);
    } catch (err) {
      console.error("🔥 Erreur radar tâches :", err);
      setProjectTasks([]); 
    }
  };
  
  const handleSearchBirds = async (val: string) => {
    setSearchBird(val);
    if (val.length < 2) return setFoundBirds([]);
    try {
      const res = await fetch(`/api/users/recruitable?search=${val}`).then(r => r.json());
      setFoundBirds(Array.isArray(res) ? res : (res.data || []));
    } catch (err) { console.error("Erreur radar", err); }
  };

  const [selectedCaps, setSelectedCaps] = useState<string[]>(['project:read', 'task:create']);

  const inviteBirdToTeam = async (teamUid: string, userUid: string) => {
    setIsRecruiting(true);
    try {
      await apiTeams.inviteBird(teamUid, userUid, selectedCaps);
      refreshData();
      setActiveInceptionId(null);
      setSearchBird("");
      setFoundBirds([]);
    } catch (err) {
      console.error("🔥 Erreur Recrutement unifié :", err);
    } finally {
      setIsRecruiting(false); 
    }
  };

  // 🌟 SUTURE : ACTIONNEUR DU PACTE D'ADHÉSION
  const handleRespondToInvitation = async (action: 'ACCEPT' | 'REFUSE') => {
    if (!selectedTeamUid) return;
    setIsResponding(true);
    try {
      const res = await fetch(`/api/teams/${selectedTeamUid}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });
      if (res.ok) {
        await refreshData();
        if (action === 'REFUSE') {
          setSelectedTeamUid(null);
          setSelectedProjectUid(null);
          setActiveTab('teams');
        }
      }
    } catch (err) {
      console.error("🔥 Erreur de traitement du pacte :", err);
    } finally {
      setIsResponding(false);
    }
  };

  // 🌟 SUTURE : ENVOL VOLONTAIRE D'UNE ESCOUADE (RÉSILIATION DE L'ABONNEMENT DYNAMIQUE)
  const handleLeaveTeamVoluntarily = async (teamUid: string, mode: 'CLEAN' | 'TRACE') => {
    const confirmLeave = window.confirm(
      mode === 'CLEAN' 
        ? "Quitter définitivement en emportant toutes vos plumes (effacera TOUTES vos tâches créées ici) ?" 
        : "Quitter ce Nid en laissant vos traces (vos tâches resteront gravées dans l'histoire de l'équipe) ?"
    );
    if (!confirmLeave) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/teams/${teamUid}/leave`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode })
      });
      if (res.ok) {
        setSelectedTeamUid(null);
        setSelectedProjectUid(null);
        setActiveTab('teams');
        await refreshData();
      } else {
        const err = await res.json();
        console.error("❌ Échec du détachement de l'escouade :", err.error);
      }
    } catch (err) {
      console.error("🔥 Impossible de rompre le lien volontaire :", err);
    } finally {
      setLoading(false);
    }
  };
  
  const handleCreateSuccess = (pUid?: string) => {
    refreshData();
    setActiveInceptionId(null);
    if (pUid || selectedProjectUid) {
      fetchTasks(pUid || selectedProjectUid || "");
    }
  };

  const handleCreateTask = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!session?.user?.uid || isInviteeMode) return; // Sécurité graphique

    const formData = new FormData(e.currentTarget);
    const pUid = (formData.get('projectUid') as string) || selectedProjectUid;

    const taskPayload = {
      projectUid: pUid,
      creatorUid: (session as any).user.uid, 
      parentUid: formData.get('parentUid') || null,
      assigneeUids: Array.from(formData.getAll('assignees')),
      title: formData.get('title'), 
      description: formData.get('description'),
      priority: formData.get('priority'),
      pomoEst: Number(formData.get('pomoEst')),
      complexity: Number(formData.get('complexity')) || 1
    };

    try {
      setLoading(true);
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(taskPayload)
      });
      
      if (res.ok) {
        handleCreateSuccess(pUid || undefined);
      } else {
        const err = await res.json();
        console.error("❌ Échec de scellage :", err.error);
      }
    } catch (err) {
      console.error("🔥 Erreur création atome:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleLeaveSanctuary = async () => {
    if (!session?.user?.uid) return;
    const confirmExile = window.confirm("Dissoudre ton lien avec l'Îlot ?");
    if (!confirmExile) return;

    setIsExiling(true);
    try {
      const res = await fetch(`/api/users/${(session as any).user.uid}/actions/leave`, { method: 'POST' });
      if (res.ok) await signOut({ callbackUrl: '/' });
    } finally {
      setIsExiling(false);
    }
  };

  if (status === 'loading' || (loading && inceptions.length === 0)) return (
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
        
        {(selectedProjectUid || activeInceptionId) && (
          <div className="fixed inset-0 pointer-events-none z-0 opacity-40">
             <ContextualGraph 
                rootUid={selectedProjectUid || activeInceptionId || ''} 
                onNodeDoubleClick={(uid) => setActiveInceptionId(uid)}
              />
          </div>
        )}

        {/* 🌟 SUTURE VISUELLE : LA BANNIÈRE STICKY DU PACTE D'ADHÉSION */}
        {selectedTeamUid && isInviteeMode && (
          <div className="relative z-50 max-w-7xl mx-auto mb-6 p-4 bg-gradient-to-r from-[#E5484D]/20 to-amber-500/10 border border-[#E5484D]/30 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 animate-in fade-in slide-in-from-top-4 duration-300">
            <div className="flex items-center gap-3">
              <AlertCircle className="text-[#E5484D] animate-pulse shrink-0" size={20} />
              <div>
                <p className="text-xs font-black uppercase tracking-wide text-slate-200">Mode Éclaireur : Territoire en Consultation</p>
                <p className="text-[11px] font-mono text-slate-400">Vous êtes invité à rejoindre l'escouade "{activeTeam?.name}". Explorez ses projets avant de valider.</p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button 
                onClick={() => handleRespondToInvitation('REFUSE')} 
                disabled={isResponding}
                className="px-4 py-2 bg-black/40 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-wider text-slate-400 hover:text-white hover:border-red-500/40 transition-all"
              >
                Refuser
              </button>
              <button 
                onClick={() => handleRespondToInvitation('ACCEPT')} 
                disabled={isResponding}
                className="px-5 py-2 bg-[#E5484D] hover:bg-[#c43d41] rounded-xl text-[10px] font-black uppercase tracking-wider text-white shadow-[0_0_20px_rgba(229,72,77,0.2)] flex items-center gap-2 transition-all"
              >
                {isResponding ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />} Signer le Pacte
              </button>
            </div>
          </div>
        )}

        {/* 🌟 SUTURE VISUELLE : LA BANNIÈRE DE DÉSENGAGEMENT SOUVERAIN (ENVOL VOLONTAIRE) */}
        {selectedTeamUid && !isInviteeMode && activeTeam?.ownerUid !== (session?.user as any)?.uid && (
          <div className="relative z-50 max-w-7xl mx-auto mb-6 p-4 bg-white/[0.02] border border-white/5 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 animate-in fade-in duration-300">
            <div className="flex items-center gap-3">
              <LogOut className="text-[#E5484D] shrink-0" size={18} />
              <div>
                <p className="text-xs font-black uppercase tracking-wide text-slate-200">Désengagement Volontaire</p>
                <p className="text-[11px] font-mono text-slate-400">Vous êtes membre de l'escouade "{activeTeam?.name}". Vous êtes libre de vous en détacher.</p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button 
                onClick={() => handleLeaveTeamVoluntarily(selectedTeamUid, 'CLEAN')} 
                className="px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-xl text-[10px] font-black uppercase tracking-wider text-red-400 hover:bg-red-500/20 transition-all"
              >
                Partir avec mes plumes (Clean)
              </button>
              <button 
                onClick={() => handleLeaveTeamVoluntarily(selectedTeamUid, 'TRACE')} 
                className="px-3 py-2 bg-slate-850 border border-white/5 rounded-xl text-[10px] font-black uppercase tracking-wider text-slate-400 hover:text-white hover:bg-white/5 transition-all"
              >
                Laisser mes traces (Trace)
              </button>
            </div>
          </div>
        )}

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
            <button onClick={handleLeaveSanctuary} disabled={isExiling} className="p-4 border border-red-900/30 rounded-xl hover:bg-red-500/10 text-red-600 disabled:opacity-50 transition-all">
              <Trash2 className="w-4 h-4" />
            </button>
            <button 
              onClick={() => { if(!isInviteeMode) setActiveInceptionId('global'); }}
              disabled={isInviteeMode && activeTab === 'projects'}
              className="px-6 py-4 bg-[#E5484D]/10 border border-[#E5484D]/20 rounded-xl text-[10px] font-black uppercase tracking-widest text-[#E5484D] hover:bg-[#E5484D]/20 disabled:opacity-20 disabled:cursor-not-allowed transition-all"
            >
              <Plus className="w-4 h-4 mr-2 inline" /> {activeTab === 'teams' ? 'Fonder un Nid' : 'Sceller un Chantier'}
            </button>
          </div>
        </header>

        {/* 🪡 SUTURE : Unification de la navigation (La duplication de la barre d'onglets a été éteinte) */}
        <nav className="relative z-10 flex gap-10 mb-12 border-b border-white/5">
          {['teams', 'projects', 'horizon'].map((tabId) => (
            <button 
              key={tabId}
              onClick={() => setActiveTab(tabId as any)}
              className={`pb-4 text-[11px] uppercase font-black tracking-widest transition-all relative ${activeTab === tabId ? 'text-[#E5484D]' : 'text-slate-600 hover:text-slate-300'}`}
            >
              {tabId === 'teams' ? 'Escouades (Nids)' : tabId === 'projects' ? 'Chantiers (Projets)' : 'Horizon'}
              {activeTab === tabId && <div className="absolute bottom-0 left-0 w-full h-[2px] bg-[#E5484D] shadow-[0_0_10px_#E5484D]" />}
            </button>
          ))}
        </nav>

        <main className="relative z-10">
          {activeTab === 'teams' ? (
            <div className="grid grid-cols-1 gap-6">
              {inceptions.map((team) => {
                const isTeamInvitation = team.relationType === 'INVITED_TO';
                return (
                  <section 
                    key={team.uid} 
                    onClick={() => { 
                      setSelectedTeamUid(team.uid); 
                      setSelectedProjectUid(null); 
                      setActiveTab('projects'); 
                    }}
                    className={`bio-card p-6 border-l-4 transition-all cursor-pointer relative group ${
                      selectedTeamUid === team.uid 
                        ? 'border-l-emerald-500 bg-emerald-500/5' 
                        : isTeamInvitation 
                          ? 'border-l-amber-500 bg-amber-500/[0.02] hover:bg-amber-500/[0.05]' 
                          : 'border-l-[#E5484D]'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-4">
                         <Network className={selectedTeamUid === team.uid ? 'text-emerald-400' : isTeamInvitation ? 'text-amber-400' : 'text-[#E5484D]'} />
                         <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                           <h2 className="text-xl font-bold uppercase">{team.name}</h2>
                           {/* 🌟 SUTURE VISUELLE : BADGE D'INVITATION SUR LA CARDE */}
                           {isTeamInvitation && (
                             <span className="px-2 py-0.5 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded text-[9px] font-mono uppercase tracking-wider self-start sm:self-center">
                               Invitation en attente
                             </span>
                           )}
                         </div>
                      </div>
                      <button 
                        onClick={(e) => { e.stopPropagation(); if(!isTeamInvitation) setActiveInceptionId(team.uid); }} 
                        disabled={isTeamInvitation}
                        className="p-2 text-slate-500 hover:text-[#E5484D] disabled:opacity-0 transition-colors"
                      >
                        <UserPlus size={18} />
                      </button>
                    </div>
                  </section>
                );
              })}
            </div>
          ) : activeTab === 'projects' ? (
            <div className="space-y-12">
              <ProjectDashboard 
                projects={visibleProjects} 
                onViewTasks={fetchTasks} 
                onEditProject={(uid) => { 
                  if (!isInviteeMode) {
                    setSelectedProjectUid(uid); 
                    setActiveInceptionId('project_edit'); 
                  }
                }} 
                onCreateTask={(uid) => { 
                  if (!isInviteeMode) {
                    setSelectedProjectUid(uid); 
                    fetchTasks(uid); 
                    setActiveInceptionId('task_new'); 
                  }
                }} 
              />

              {selectedProjectUid && (
                <div className="mt-12 p-8 bg-white/[0.02] border border-white/5 rounded-3xl animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="flex justify-between items-center mb-8">
                    <h3 className="text-2xl font-black uppercase flex items-center gap-3">
                      <BarChart3 className="text-[#E5484D]" /> Atomes du Chantier
                    </h3>
                    <button onClick={() => setIsKanbanOpen(true)} className="px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-[10px] uppercase font-black">
                      Ouvrir le Kanban
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {projectTasks.map(task => <TaskCard key={task.uid} task={task} onStatusChange={refreshData} />)}
                    
                    {/* 🌟 SUTURE VISUELLE : DÉSACTIVATION SÉCURISÉE DU BOUTON CRÉATION D'ATOME */}
                    <button 
                      onClick={() => { if(!isInviteeMode) setActiveInceptionId('task_new'); }} 
                      disabled={isInviteeMode}
                      className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center transition-all ${
                        isInviteeMode 
                          ? 'border-white/5 text-slate-700 cursor-not-allowed bg-black/10' 
                          : 'border-white/5 text-slate-600 hover:text-[#E5484D]'
                      }`}
                    >
                      <Plus /> 
                      <span className="text-[10px] font-black uppercase mt-2">
                        {isInviteeMode ? "Aura verrouillée (Lecture)" : "Nouvel Atome"}
                      </span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <CalendarView tasks={projectTasks} />
          )}
        </main>

        {activeInceptionId && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-[#05070A]/95 backdrop-blur-xl">
             <div className="w-full max-w-2xl bio-card p-10 relative border border-white/5">
                <button onClick={() => { setActiveInceptionId(null); setFoundBirds([]); }} className="absolute top-4 right-4 text-slate-500 hover:text-white"><X size={20} /></button>
                
                {activeInceptionId === 'task_new' ? (
                  <TaskForm 
                    projectUid={selectedProjectUid} 
                    birds={foundBirds} 
                    existingTasks={projectTasks} 
                    onSubmit={handleCreateTask} 
                    onCancel={() => setActiveInceptionId(null)} 
                    projectCapabilities={userCaps} 
                    loading={loading} 
                  />
                ) : (activeInceptionId === 'global' || activeInceptionId === 'project_edit') ? (
                  activeTab === 'teams' && activeInceptionId !== 'project_edit' ? (
                    <TeamForm onSuccess={handleCreateSuccess} onCancel={() => setActiveInceptionId(null)} userCapabilities={userCaps} />
                  ) : (
                    <ProjectForm 
                      ownerUid={selectedTeamUid || ''} 
                      existingProjects={projects} 
                      userCapabilities={userCaps} 
                      onSuccess={handleCreateSuccess} 
                      onCancel={() => setActiveInceptionId(null)} 
                      initialData={activeInceptionId === 'project_edit' ? projects.find(p => p.uid === selectedProjectUid) : null}
                    />
                  )
                ) : (
                  <div className="space-y-6">
                    <div className="relative">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                      <input type="text" placeholder="Chercher un oiseau..." value={searchBird} onChange={(e) => handleSearchBirds(e.target.value)} className="w-full bg-black/40 border border-white/10 p-4 pl-12 rounded-xl outline-none focus:border-[#E5484D] transition-all" />
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
                              const isChecked = selectedCaps.includes(cap.id);
                              return (
                                <label key={cap.id} className={`flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition-all border ${isChecked ? 'bg-[#E5484D]/10 border-[#E5484D]/30 text-slate-100' : 'bg-black/20 border-white/5 text-slate-500 hover:border-white/10'}`}>
                                  <input 
                                    type="checkbox" 
                                    checked={isChecked} 
                                    onChange={() => {
                                      if (isChecked) {
                                        setSelectedCaps(selectedCaps.filter(c => c !== cap.id));
                                      } else {
                                        setSelectedCaps([...selectedCaps, cap.id]);
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

                    <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto custom-scrollbar">
                      {foundBirds.map(bird => (
                        <button key={bird.uid} onClick={() => inviteBirdToTeam(activeInceptionId, bird.uid)} disabled={isRecruiting} className="p-4 bg-white/5 hover:bg-emerald-500/20 rounded-xl flex justify-between items-center transition-all">
                          <span className="font-bold text-slate-200">{bird.pseudo}</span>
                          <Plus size={16} className="text-emerald-400" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
             </div>
          </div>
        )}

        <KanbanDrawer tasks={projectTasks} isOpen={isKanbanOpen} onClose={() => setIsKanbanOpen(false)} />
        <PomodoroHUD />
      </div>
    </PomodoroProvider>
  );
}