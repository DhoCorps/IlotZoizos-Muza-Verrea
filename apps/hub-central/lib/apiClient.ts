import { ITeam, IUser, ITask, IProject, IStatus } from "@ilot/types";  

const BASE_URL = '/api';

/**
 * 🌀 TYPE DE RÉPONSE UNIFIÉ
 */
interface ApiResponse<T> {
  data?: T;
  error?: string;
  success?: boolean;
  message?: string;
}

/**
 * ⚡ LE SOUFFLE DE ZONZON (apiFetch)
 */
async function apiFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const isFormData = options.body instanceof FormData;
  
  // 🛡️ FIX : On laisse le navigateur gérer 100% des headers si c'est un FormData
  // (Il doit y injecter le "boundary" obligatoire)
  const headers = new Headers(options.headers);
  if (!isFormData && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const res = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    credentials: 'include',
    headers, // 👈 Application propre des headers
  });

  if (res.status === 204) return {} as T;

  const responseData = await res.json().catch(() => ({})) as ApiResponse<T>;
  
  if (!res.ok) {
    const errorMessage = responseData.error || responseData.message || `L'oiseau s'est cogné contre la vitre: ${res.status}`;
    console.error(`🚨 Perturbation sur ${endpoint}:`, errorMessage);
    throw new Error(errorMessage);
  }

  return (responseData.data !== undefined ? responseData.data : responseData) as T;
}

/**
 * 🔑 MODULE : FORGE DES ACCÈS (Auth)
 */
export const auth = {
  register: (data: Partial<IUser>) => 
    apiFetch<IUser>('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  
  // 🛑 ATTENTION : Utiliser `signIn` et `signOut` de 'next-auth/react' pour la session !
};

/**
 * 👤 MODULE : LE PLUMAGE (Users)
 */
export const user = {
  getMe: () => apiFetch<IUser>('/user/me'),
  
  updateProfile: (data: Partial<IUser>) => 
    apiFetch<IUser>('/user/profile', { method: 'PATCH', body: JSON.stringify(data) }), // 🛡️ Remplacé par PATCH
  
  getLineage: () => apiFetch<any>('/user/lineage'),
};

/**
 * 🌿 MODULE : LES FRAGMENTS (Projets)
 */
export const projects = {
  getAll: () => apiFetch<IProject[]>('/projects'),
  getById: (uid: string) => apiFetch<IProject>(`/projects/${uid}`),
  create: (data: Partial<IProject>) => 
    apiFetch<IProject>('/projects', { method: 'POST', body: JSON.stringify(data) }),
  update: (uid: string, data: Partial<IProject>) => 
    apiFetch<IProject>(`/projects/${uid}`, { method: 'PATCH', body: JSON.stringify(data) }), // 🛡️ Remplacé par PATCH
  delete: (uid: string) => apiFetch<void>(`/projects/${uid}`, { method: 'DELETE' }),
  getStatuses: () => apiFetch<IStatus[]>('/projects/statuses/all'),
};

/**
 * 🍂 MODULE : LES BRINDILLES (Tasks)
 */
export const tasks = {
  // 🛡️ SUTURE : projectUid -> projectId
  getAll: (projectId?: string) => 
    apiFetch<ITask[]>(`/tasks${projectId ? `?projectId=${projectId}` : ''}`),
  getById: (uid: string) => apiFetch<ITask>(`/tasks/${uid}`),
  create: (data: Partial<ITask>) => 
    apiFetch<ITask>('/tasks', { method: 'POST', body: JSON.stringify(data) }),
  
  // 🛡️ SUTURE : Le bon verbe HTTP (PATCH)
  update: (uid: string, data: Partial<ITask>) => 
    apiFetch<ITask>(`/tasks/${uid}`, { method: 'PATCH', body: JSON.stringify(data) }),
  
  burn: (uid: string) => apiFetch<void>(`/tasks/${uid}`, { method: 'DELETE' }),
};

/**
 * 🛡️ MODULE : LE LIVRE DES SORTILÈGES (Rôles & Permissions)
 */
export const roles = {
  getAllRoles: () => apiFetch<any[]>('/roles'),
  createRole: (data: { intitule: string; description?: string; status?: string }) => 
    apiFetch<any>('/roles', { method: 'POST', body: JSON.stringify(data) }),
  getAllPermissions: () => apiFetch<any[]>('/roles/permissions'),
  createPermission: (data: { intitule: string; code: string; description?: string }) => 
    apiFetch<any>('/roles/permissions', { method: 'POST', body: JSON.stringify(data) }),
};

/**
 * 🏘️ MODULE : LES NIDS (Teams)
 */
export const teams = {
  getAll: () => 
    apiFetch<any[]>('/teams'), 
  create: (data: any) =>
    apiFetch<any>('/teams', { method: 'POST', body: JSON.stringify(data) }),
  getById: (teamUid: string) => apiFetch<ITeam>(`/teams/${teamUid}`),
  
  update: (teamUid: string, data: Partial<ITeam>) => 
    apiFetch<ITeam>(`/teams/${teamUid}`, { 
      method: 'PATCH', // 🛡️ Remplacé par PATCH pour coller aux standards Next.js
      body: JSON.stringify(data) 
    }),
  delete: (teamUid: string) => apiFetch<void>(`/teams/${teamUid}`, { method: 'DELETE' }),
  
  getChirps: (teamUid: string) => apiFetch<any[]>(`/teams/${teamUid}/chirps`),
  sendChirp: (teamUid: string, content: string) => 
    apiFetch<any>(`/teams/${teamUid}/chirps`, { method: 'POST', body: JSON.stringify({ content }) }),
  removeMember: (teamUid: string, userUid: string) => 
    apiFetch<void>(`/teams/${teamUid}/members/${userUid}`, { method: 'DELETE' }),
  invite: (data: { teamId: string; email: string; role: string; permissions?: string[] }) => 
    apiFetch<any>('/teams/invite', { method: 'POST', body: JSON.stringify(data) }),
};

/**
 * ☁️ MODULE : LE CIERGE (Storage/Upload)
 */
export const storage = {
  upload: async (file: File, entityType: 'project' | 'task' | 'team', entityId: string) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('entityType', entityType);
    formData.append('entityId', entityId);
    return apiFetch<{ url: string; fileId: string }>('/storage/upload', { 
      method: 'POST', 
      body: formData 
    });
  }
};

/**
 * 🧪 MODULE : LABORATOIRE DE ZONZON
 */
export const lab = {
  getNestLoad: (teamUid: string) => apiFetch<{ load: number; alerts: string[] }>(`/lab/nest-load/${teamUid}`),
  getIslandWeather: () => apiFetch<{ weather: string; temp: number; trend: 'up' | 'down' }>('/lab/weather'),
  predictSuccess: (projectUid: string) => apiFetch<{ probability: number; factors: string[] }>(`/lab/predict/${projectUid}`),
};

/**
 * 🦅 MODULE : LE TROUPEAU (Tous les utilisateurs)
 */
export const users = {
  getAll: () => apiFetch<any[]>('/users'),
};