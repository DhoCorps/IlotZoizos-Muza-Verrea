// apps/hub-central/app/[locale]/(inceptions)/tom-hat-toes/useHubNexus.ts
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSession, signOut } from 'next-auth/react'; 
import { teams as apiTeams, projects as apiProjects } from '../../../../lib/apiClient';

// 🪡 SUTURE : Centralisation et unification des routes d'Atomes
const apiTasks = {
  getByProject: (pUid: string) => 
    fetch(`/api/tasks?projectUid=${pUid}&t=${Date.now()}`).then(r => r.json()),
  create: (payload: any) => 
    fetch('/api/tasks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }),
  update: (taskUid: string, payload: any) => 
    fetch(`/api/tasks/${taskUid}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }),
  delete: (taskUid: string) => 
    fetch(`/api/tasks/${taskUid}`, { method: 'DELETE' })
};

// 🪡 SUTURE : Centralisation des opérations de gouvernance système
const apiSystem = {
  respondToInvitation: (teamUid: string, action: string) => 
    fetch(`/api/teams/${teamUid}/respond`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action }) }),
  manageInvitation: (teamUid: string, targetUid: string, action: 'CANCEL' | 'REINVITE', selectedCaps: string[]) => {
    if (action === 'CANCEL') return fetch(`/api/teams/${teamUid}/invitations/${targetUid}`, { method: 'DELETE' });
    return apiTeams.inviteBird(teamUid, targetUid, selectedCaps);
  },
  deleteTeam: (teamUid: string) => fetch(`/api/teams/${teamUid}`, { method: 'DELETE' }),
  deleteProject: (projectUid: string) => fetch(`/api/projects/${projectUid}`, { method: 'DELETE' }),
  leaveTeam: (teamUid: string, mode: 'CLEAN' | 'TRACE') => 
    fetch(`/api/teams/${teamUid}/leave`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mode }) }),
  leaveSanctuary: (userUid: string) => 
    fetch(`/api/users/${userUid}/actions/leave`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mode: 'CLEAN', teamId: 'GLOBAL_SYSTEM' }) }),
  searchBirds: (val: string) => fetch(`/api/users/recruitable?search=${val}`).then(r => r.json())
};

export function useHubNexus() {
  const { data: session, status } = useSession(); 
  const userCaps = (session as any)?.user?.capabilities || [];
  const userUid = (session as any)?.user?.uid;
  
  const [inceptions, setInceptions] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [projectTasks, setProjectTasks] = useState<any[]>([]); 
  
  const [selectedProjectUid, setSelectedProjectUid] = useState<string | null>(null);
  const [selectedTeamUid, setSelectedTeamUid] = useState<string | null>(null); 
  const [selectedTaskUid, setSelectedTaskUid] = useState<string | null>(null); 
  
  const [loading, setLoading] = useState(true);
  const [activeInceptionId, setActiveInceptionId] = useState<string | null>(null);
  const [activeTab, NavActiveTab] = useState<'teams' | 'projects' | 'horizon'>('teams');
  const [isKanbanOpen, setIsKanbanOpen] = useState(false); 

  const [searchBird, setSearchBird] = useState("");
  const [foundBirds, setFoundBirds] = useState<any[]>([]);
  const [isRecruiting, setIsRecruiting] = useState(false);
  const [isExiling, setIsExiling] = useState(false);
  const [isResponding, setIsResponding] = useState(false);
  const [selectedSlotDate, setSelectedSlotDate] = useState<Date | null>(null);
  const [selectedCaps, setSelectedCaps] = useState<string[]>(['project:read', 'task:create']);

  const activeTeam = useMemo(() => {
    return inceptions.find(t => t.uid === selectedTeamUid) || null;
  }, [inceptions, selectedTeamUid]);

  const isInviteeMode = useMemo(() => {
    return activeTeam?.isInvitation === true;
  }, [activeTeam]);

  const visibleProjects = useMemo(() => {
    if (!selectedTeamUid) return []; 
    return projects.filter(p => p.ownerUid === selectedTeamUid);
  }, [projects, selectedTeamUid]);

  const fetchTasks = async (pUid: string) => {
    try {
      const res = await apiTasks.getByProject(pUid);
      const tasks = Array.isArray(res) ? res : (res.data || []);
      setProjectTasks(tasks);
      setSelectedProjectUid(pUid);
    } catch (err) {
      console.error("🔥 Erreur radar tâches :", err);
      setProjectTasks([]); 
    }
  };

  const refreshData = async () => {
    setLoading(true);
    try {
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

  useEffect(() => {
    if (activeTab === 'projects' && visibleProjects.length > 0 && !selectedProjectUid) {
      fetchTasks(visibleProjects[0].uid);
    }
  }, [visibleProjects, activeTab]);

  const handleSearchBirds = async (val: string) => {
    setSearchBird(val);
    if (val.length < 2) return setFoundBirds([]);
    try {
      const res = await apiSystem.searchBirds(val);
      setFoundBirds(Array.isArray(res) ? res : (res.data || []));
    } catch (err) { console.error("Erreur radar", err); }
  };

  const inviteBirdToTeam = async (teamUid: string, birdUid: string) => {
    setIsRecruiting(true);
    try {
      await apiTeams.inviteBird(teamUid, birdUid, selectedCaps);
      await refreshData();
      setActiveInceptionId(null);
      setSearchBird("");
      setFoundBirds([]);
    } catch (err) {
      console.error("🔥 Erreur Recruitment unifié :", err);
    } finally {
      setIsRecruiting(false); 
    }
  };

  const handleRespondToInvitation = async (action: 'ACCEPT' | 'REFUSE' | 'PURGE_REFUSE', teamUid?: string) => {
    const targetUid = teamUid || selectedTeamUid;
    if (!targetUid) return;
    setIsResponding(true);
    try {
      const res = await apiSystem.respondToInvitation(targetUid, action);
      if (res.ok) {
        await refreshData();
        if (action === 'REFUSE' || action === 'PURGE_REFUSE') {
          setSelectedTeamUid(null);
          setSelectedProjectUid(null);
          NavActiveTab('teams');
        }
      }
    } catch (err) {
      console.error("🔥 Erreur de traitement du pacte :", err);
    } finally {
      setIsResponding(false);
    }
  };

  const handleManageInvitation = async (teamUid: string, targetUid: string, action: 'CANCEL' | 'REINVITE') => {
    setLoading(true);
    try {
      await apiSystem.manageInvitation(teamUid, targetUid, action, selectedCaps);
      await refreshData();
    } catch (err) {
      console.error("🔥 Erreur de régulation de volée :", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTeam = async (teamUid: string) => {
    if (!window.confirm("Êtes-vous sûr de vouloir dissoudre définitivement ce Nid ?")) return;
    setLoading(true);
    try {
      const res = await apiSystem.deleteTeam(teamUid);
      if (res.ok) {
        if (selectedTeamUid === teamUid) {
          setSelectedTeamUid(null);
          setSelectedProjectUid(null);
          setProjectTasks([]);
        }
        await refreshData();
      }
    } catch (err) {
      console.error("🔥 Impossible de dissoudre le Nid parent :", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProject = async (projectUid: string) => {
    if (!window.confirm("Êtes-vous sûr de vouloir raser définitivement ce Chantier ?")) return;
    setLoading(true);
    try {
      const res = await apiSystem.deleteProject(projectUid);
      if (res.ok) {
        if (selectedProjectUid === projectUid) {
          setSelectedProjectUid(null);
          setProjectTasks([]);
        }
        await refreshData();
      }
    } catch (err) {
      console.error("🔥 Impossible de détruire le Chantier :", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTask = async (taskUid: string) => {
    if (!window.confirm("Êtes-vous sûr de vouloir désintégrer cet Atome ?")) return;
    setLoading(true);
    try {
      const res = await apiTasks.delete(taskUid);
      if (res.ok) {
        if (selectedTaskUid === taskUid) {
          setSelectedTaskUid(null);
        }
        if (selectedProjectUid) {
          await fetchTasks(selectedProjectUid);
        }
        await refreshData();
      }
    } catch (err) {
      console.error("🔥 Erreur de désintégration atomique :", err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateTask = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedTaskUid || isInviteeMode) return;

    const formData = new FormData(e.currentTarget);
    const rawDate = formData.get('scheduledAt') as string;
    
    const taskPayload = {
      content: {
        title: formData.get('title'),
        description: formData.get('description'),
      },
      priority: formData.get('priority'),
      status: formData.get('status'), 
      parentUid: formData.get('parentUid') || null, 
      assigneeUids: Array.from(formData.getAll('assignees')), 
      pomodoros: { estimated: Number(formData.get('pomoEst')) },
      metrics: { complexity: Number(formData.get('complexity')) || 1 },
      dates: { scheduledAt: rawDate ? new Date(rawDate).toISOString() : null }
    };

    try {
      setLoading(true);
      const res = await apiTasks.update(selectedTaskUid, taskPayload);
      if (res.ok) {
        setActiveInceptionId(null);
        setSelectedTaskUid(null);
        if (selectedProjectUid) await fetchTasks(selectedProjectUid);
      } else {
        const err = await res.json();
        alert(`Impossible d'enregistrer les modifications : ${err.error}`);
      }
    } catch (err) {
      console.error("🔥 Erreur radar lors de la modification de l'Atome :", err);
    } finally {
      setLoading(false);
    }
  };

  const handleLeaveTeamVoluntarily = async (teamUid: string, mode: 'CLEAN' | 'TRACE') => {
    const confirmLeave = window.confirm(mode === 'CLEAN' ? "Quitter définitivement..." : "Quitter...");
    if (!confirmLeave) return;

    setLoading(true);
    try {
      const res = await apiSystem.leaveTeam(teamUid, mode);
      if (res.ok) {
        setSelectedTeamUid(null);
        setSelectedProjectUid(null);
        NavActiveTab('teams');
        await refreshData();
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
    setSelectedTaskUid(null);
    setSelectedSlotDate(null);
    if (pUid || selectedProjectUid) {
      fetchTasks(pUid || selectedProjectUid || "");
    }
  };

  const handleCreateTask = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!userUid || isInviteeMode) return; 

    const formData = new FormData(e.currentTarget);
    const pUid = (formData.get('projectUid') as string) || selectedProjectUid;
    const rawDate = formData.get('scheduledAt') as string;

    const taskPayload = {
      projectUid: pUid,
      creatorUid: userUid, 
      parentUid: formData.get('parentUid') || null,
      assigneeUids: Array.from(formData.getAll('assignees')),
      title: formData.get('title'), 
      description: formData.get('description'),
      priority: formData.get('priority'),
      pomoEst: Number(formData.get('pomoEst')),
      complexity: Number(formData.get('complexity')) || 1,
      scheduledAt: rawDate ? new Date(rawDate).toISOString() : undefined 
    };

    try {
      setLoading(true);
      const res = await apiTasks.create(taskPayload);
      if (res.ok) {
        handleCreateSuccess(pUid || undefined);
      }
    } catch (err) {
      console.error("🔥 Erreur création atome:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleLeaveSanctuary = async () => {
    if (!userUid) return;
    if (!window.confirm("Dissoudre ton lien avec l'Îlot ?")) return;

    setIsExiling(true);
    try {
      const res = await apiSystem.leaveSanctuary(userUid);
      if (res.ok) {
        await signOut({ callbackUrl: '/' });
      }
    } catch (err) {
      console.error("🔥 Erreur critique lors de l'exil :", err);
    } finally {
      setIsExiling(false);
    }
  };

  return {
    session, status, userCaps, inceptions, projects, projectTasks,
    selectedProjectUid, setSelectedProjectUid, selectedTeamUid, setSelectedTeamUid,
    selectedTaskUid, setSelectedTaskUid, loading, activeInceptionId, setActiveInceptionId,
    activeTab, NavActiveTab, isKanbanOpen, setIsKanbanOpen, searchBird, handleSearchBirds,
    foundBirds, isRecruiting, isExiling, isResponding, selectedSlotDate, setSelectedSlotDate,
    selectedCaps, setSelectedCaps, activeTeam, isInviteeMode, visibleProjects, fetchTasks,
    refreshData, inviteBirdToTeam, handleRespondToInvitation, handleManageInvitation,
    handleDeleteTeam, handleDeleteProject, handleDeleteTask, handleUpdateTask,
    handleLeaveTeamVoluntarily, handleCreateSuccess, handleCreateTask, handleLeaveSanctuary
  };
}