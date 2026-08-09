// apps/hub-central/app/[locale]/(inceptions)/tom-hat-toes/useHubNexus.ts
'use client';

import { useState, useMemo } from 'react';
import { useSession, signOut } from 'next-auth/react'; 
import { teams as apiTeams, projects as apiProjects } from '../../../../lib/apiClient';
import { toast } from 'sonner';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// 🪡 SUTURE : Routes d'Atomes
const apiTasks = {
  getByProject: async (pUid: string) => {
    const res = await fetch(`/api/tasks?projectUid=${pUid}&t=${Date.now()}`);
    return res.json();
  },
  create: (payload: any) => 
    fetch('/api/tasks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }),
  update: (taskUid: string, payload: any) => 
    fetch(`/api/tasks/${taskUid}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }),
  delete: (taskUid: string) => 
    fetch(`/api/tasks/${taskUid}`, { method: 'DELETE' })
};

// 🪡 SUTURE : Opérations de gouvernance système
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
  searchBirds: async (val: string) => {
    const res = await fetch(`/api/users/recruitable?search=${val}`);
    return res.json();
  }
};

export function useHubNexus() {
  const { data: session, status } = useSession(); 
  const userCaps = (session as any)?.user?.capabilities || [];
  const userUid = (session as any)?.user?.uid;
  const queryClient = useQueryClient();
  
  const [selectedProjectUid, setSelectedProjectUid] = useState<string | null>(null);
  const [selectedTeamUid, setSelectedTeamUid] = useState<string | null>(null); 
  const [selectedTaskUid, setSelectedTaskUid] = useState<string | null>(null); 
  
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

  // 🌀 SUTURE REACT QUERY : Récupération automatique des Nids (Teams)
  const { data: inceptions = [], isLoading: teamsLoading } = useQuery({
    queryKey: ['hub-teams'],
    queryFn: () => apiTeams.getAll(),
    enabled: status === 'authenticated',
  });

  // 🌀 SUTURE REACT QUERY : Récupération automatique des Chantiers (Projects)
  const { data: projects = [], isLoading: projectsLoading } = useQuery({
    queryKey: ['hub-projects'],
    queryFn: () => apiProjects.getAll(),
    enabled: status === 'authenticated',
  });

  // 🌀 SUTURE REACT QUERY : Récupération automatique des Atomes (Tasks) du projet sélectionné
  const { data: projectTasks = [], refetch: refetchTasks } = useQuery({
    queryKey: ['hub-tasks', selectedProjectUid],
    queryFn: async () => {
      if (!selectedProjectUid) return [];
      const res = await apiTasks.getByProject(selectedProjectUid);
      return Array.isArray(res) ? res : (res.data || []);
    },
    enabled: !!selectedProjectUid && status === 'authenticated',
  });

  const loading = teamsLoading || projectsLoading;

  const activeTeam = useMemo(() => {
    return inceptions.find((t: any) => t.uid === selectedTeamUid) || null;
  }, [inceptions, selectedTeamUid]);

  const isInviteeMode = useMemo(() => {
    return activeTeam?.isInvitation === true;
  }, [activeTeam]);

  const visibleProjects = useMemo(() => {
    if (!selectedTeamUid) return []; 
    return projects.filter((p: any) => p.ownerUid === selectedTeamUid);
  }, [projects, selectedTeamUid]);

  const fetchTasks = async (pUid: string) => {
    setSelectedProjectUid(pUid);
    await refetchTasks();
  };

  const refreshData = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['hub-teams'] }),
      queryClient.invalidateQueries({ queryKey: ['hub-projects'] }),
      selectedProjectUid ? queryClient.invalidateQueries({ queryKey: ['hub-tasks', selectedProjectUid] }) : Promise.resolve()
    ]);
  };

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
    try {
      await apiSystem.manageInvitation(teamUid, targetUid, action, selectedCaps);
      await refreshData();
    } catch (err) {
      console.error("🔥 Erreur de régulation de volée :", err);
    }
  };

  const handleDeleteTeam = async (teamUid: string) => {
    if (!window.confirm("Êtes-vous sûr de vouloir dissoudre définitivement ce Nid ?")) return;
    try {
      const res = await apiSystem.deleteTeam(teamUid);
      if (res.ok) {
        if (selectedTeamUid === teamUid) {
          setSelectedTeamUid(null);
          setSelectedProjectUid(null);
        }
        await refreshData();
      }
    } catch (err) {
      console.error("🔥 Impossible de dissoudre le Nid parent :", err);
    }
  };

  const handleDeleteProject = async (projectUid: string) => {
    if (!window.confirm("Êtes-vous sûr de vouloir raser définitivement ce Chantier ?")) return;
    try {
      const res = await apiSystem.deleteProject(projectUid);
      if (res.ok) {
        if (selectedProjectUid === projectUid) {
          setSelectedProjectUid(null);
        }
        await refreshData();
      }
    } catch (err) {
      console.error("🔥 Impossible de détruire le Chantier :", err);
    }
  };

  const handleDeleteTask = async (taskUid: string) => {
    if (!window.confirm("Êtes-vous sûr de vouloir désintégrer cet Atome ?")) return;
    try {
      const res = await apiTasks.delete(taskUid);
      if (res.ok) {
        if (selectedTaskUid === taskUid) {
          setSelectedTaskUid(null);
        }
        if (selectedProjectUid) {
          await refetchTasks();
        }
        await refreshData();
      }
    } catch (err) {
      console.error("🔥 Erreur de désintégration atomique :", err);
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
      const res = await apiTasks.update(selectedTaskUid, taskPayload);
      if (res.ok) {
        setActiveInceptionId(null);
        setSelectedTaskUid(null);
        if (selectedProjectUid) await refetchTasks();
      } else {
        const err = await res.json();
        toast.error(`Impossible d'enregistrer les modifications : ${err.error}`);
      }
    } catch (err) {
      console.error("🔥 Erreur radar lors de la modification de l'Atome :", err);
    }
  };

  const handleLeaveTeamVoluntarily = async (teamUid: string, mode: 'CLEAN' | 'TRACE') => {
    const confirmLeave = window.confirm(mode === 'CLEAN' ? "Quitter définitivement..." : "Quitter...");
    if (!confirmLeave) return;

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
      const res = await apiTasks.create(taskPayload);
      if (res.ok) {
        handleCreateSuccess(pUid || undefined);
      }
    } catch (err) {
      console.error("🔥 Erreur création atome:", err);
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