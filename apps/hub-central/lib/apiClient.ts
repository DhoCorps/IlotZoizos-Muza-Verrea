// apps/hub-central/lib/api.ts
import { IOiseau, ISeed } from "@ilot/types";
import { ITeam, IProject, ITask, IStatus } from "../../../packages/types"; 

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
  
  const headers = new Headers(options.headers);
  if (!isFormData && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const res = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    credentials: 'include',
    headers, 
  });

  if (res.status === 204) return {} as T;

  const responseData = await res.json().catch(() => ({})) as ApiResponse<T>;
  
  if (!res.ok) {
    const errorMessage = responseData.error || responseData.message || `L'onde s'est brisée sur la vitre: ${res.status}`;
    console.error(`🚨 Perturbation sur ${endpoint}:`, errorMessage);
    throw new Error(errorMessage);
  }

  return (responseData.data !== undefined ? responseData.data : responseData) as T;
}

/**
 * 🔑 MODULE : L'ARRIVÉE (Auth)
 */
export const auth = {
  register: (data: Partial<ISeed>) => 
    apiFetch<IOiseau>('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
};

/**
 * 👤 MODULE : LE SANCTUAIRE (Users)
 */
export const user = {
  getMe: () => apiFetch<IOiseau>('/user/me'),
  mutateStructure: (data: { uid: string, frequenceHEX?: string, sanctuaire?: any, aura?: string[] }) => 
    apiFetch<any>('/auth/user/update', { method: 'PUT', body: JSON.stringify(data) }),
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
    apiFetch<IProject>(`/projects/${uid}`, { method: 'PATCH', body: JSON.stringify(data) }), 
  delete: (uid: string) => apiFetch<void>(`/projects/${uid}`, { method: 'DELETE' }),
  getStatuses: () => apiFetch<IStatus[]>('/projects/statuses/all'),
};

/**
 * 🏘️ MODULE : LES NIDS (Teams)
 */
export const teams = {
  getAll: () => apiFetch<any[]>('/teams'), 
  create: (data: any) => apiFetch<any>('/teams', { method: 'POST', body: JSON.stringify(data) }),
  getById: (teamUid: string) => apiFetch<ITeam>(`/teams/${teamUid}`),
  update: (teamUid: string, data: Partial<ITeam>) => 
    apiFetch<ITeam>(`/teams/${teamUid}`, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (teamUid: string) => apiFetch<void>(`/teams/${teamUid}`, { method: 'DELETE' }),
  getChirps: (teamUid: string) => apiFetch<any[]>(`/teams/${teamUid}/chirps`),
  sendChirp: (teamUid: string, content: string) => 
    apiFetch<any>(`/teams/${teamUid}/chirps`, { method: 'POST', body: JSON.stringify({ content }) }),
  removeMember: (teamUid: string, userUid: string) => 
    apiFetch<void>(`/teams/${teamUid}/members/${userUid}`, { method: 'DELETE' }),
  inviteBird: (teamUid: string, userUid: string, capabilities: string[]) => 
    apiFetch<any>(`/teams/${teamUid}/members`, { 
      method: 'POST', 
      body: JSON.stringify({ userUid, action: 'INVITE', capabilities }) 
    }),
};

/**
 * ☁️ MODULE : LE CIERGE (Storage/Upload)
 */
export const storage = {
  upload: async (file: File, entityType: 'project' | 'task' | 'team' | 'sujet' | 'font' | string, entityId: string) => {
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
 * 🦅 MODULE : LA VOLÉE (Tous les oiseaux)
 */
export const users = {
  getAll: () => apiFetch<Partial<IOiseau>[]>('/users'),
  getByUid: (uid: string) => apiFetch<IOiseau>(`/users/${uid}`)
};

/**
 * 📜 MODULE : ABYSS BLOG (Sujets & Monologues)
 */
export const sujets = {
  getAll: () => apiFetch<any[]>('/sujets'),
  create: (data: any) => apiFetch<any>('/sujets', { method: 'POST', body: JSON.stringify(data) }),
  update: (uid: string, data: any) => apiFetch<any>(`/sujets/${uid}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (uid: string) => apiFetch<void>(`/sujets/${uid}`, { method: 'DELETE' }),
};

/**
 * 🎸 MODULE : PARTITA (Partitions & Tablatures)
 */
export const partitions = {
  getAll: () => apiFetch<any[]>('/partitions'),
  getById: (uid: string) => apiFetch<any>(`/partitions/${uid}`),
  create: (data: any) => apiFetch<any>('/partitions', { method: 'POST', body: JSON.stringify(data) }),
  update: (uid: string, data: any) => apiFetch<any>(`/partitions/${uid}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (uid: string) => apiFetch<void>(`/partitions/${uid}`, { method: 'DELETE' }),
};

/**
 * 🔠 MODULE : LETR'IN & SPRITES (Typographies)
 */
export const lettrinSprites = {
  getAll: () => apiFetch<any[]>('/letrin/sprites'),
  getById: (fontId: string) => apiFetch<any>(`/letrin/sprites/${fontId}`),
  create: (data: any) => apiFetch<any>('/letrin/sprites', { method: 'POST', body: JSON.stringify(data) }),
  update: (fontId: string, data: any) => apiFetch<any>(`/letrin/sprites/${fontId}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (fontId: string) => apiFetch<void>(`/letrin/sprites/${fontId}`, { method: 'DELETE' }),
};

/**
 * 💘 MODULE : KONTAKT-RH (Tinder Pro & Quêtes)
 */
export const kontakt = {
  getProfiles: (params?: { alignment?: string; status?: string }) => {
    const query = new URLSearchParams(params as any).toString();
    return apiFetch<any[]>(`/kontakt/profiles${query ? `?${query}` : ''}`);
  },
  getProfileByUserUid: (userUid: string) => apiFetch<any>(`/kontakt/profiles/${userUid}`),
  saveProfile: (data: any) => apiFetch<any>('/kontakt/profiles', { method: 'POST', body: JSON.stringify(data) }),
  swipe: (targetUid: string, action: 'LIKE' | 'PASS') => apiFetch<any>('/kontakt/swipes', { method: 'POST', body: JSON.stringify({ targetUid, action }) }),
  getQuests: () => apiFetch<any[]>('/kontakt/quests'),
  createQuest: (data: any) => apiFetch<any>('/kontakt/quests', { method: 'POST', body: JSON.stringify(data) }),
};

/**
 * 🛒 MODULE : LE MARCHAND DE L'ÎLOT (E-commerce & Troc)
 */
export const ecommerce = {
  getStores: () => apiFetch<any[]>('/ecommerce/stores'),
  createStore: (data: { storeName: string; description: string; stripeAccountId?: string }) => 
    apiFetch<any>('/ecommerce/stores', { method: 'POST', body: JSON.stringify(data) }),
  
  getProducts: (params?: { storeUid?: string; category?: string }) => {
    const query = new URLSearchParams(params as any).toString();
    return apiFetch<any[]>(`/ecommerce/products${query ? `?${query}` : ''}`);
  },
  createProduct: (data: any) => apiFetch<any>('/ecommerce/products', { method: 'POST', body: JSON.stringify(data) }),
  
  getWishlist: () => apiFetch<any>('/ecommerce/wishlist'),
  toggleWishlist: (productUid: string) => apiFetch<any>('/ecommerce/wishlist', { method: 'POST', body: JSON.stringify({ productUid }) }),
  
  getBarterOffers: () => apiFetch<any[]>('/ecommerce/barter'),
  proposeBarter: (data: { receiverUid?: string; offeredProductUids: string[]; requestedProductUids: string[] }) => 
    apiFetch<any>('/ecommerce/barter', { method: 'POST', body: JSON.stringify(data) }),
  resolveBarter: (barterUid: string, status: 'ACCEPTED' | 'REJECTED') => 
    apiFetch<any>('/ecommerce/barter', { method: 'PATCH', body: JSON.stringify({ barterUid, status }) })
};

/**
 * 🕸️ MODULE : LA RÉSONANCE (Transdisciplinaire)
 */
export const resonance = {
  weaveLink: (data: { sourceUid: string; sourceLabel: string; targetUid: string; targetLabel: string; relationType: string }) => 
    apiFetch<any>('/resonance/links', { method: 'POST', body: JSON.stringify(data) }),
  getEchoes: (targetUid: string) => 
    apiFetch<any[]>(`/resonance/echoes?targetUid=${encodeURIComponent(targetUid)}`),
  sendEcho: (data: { targetUid: string; targetLabel: string; echoType: 'TEXT' | 'EMOJI'; content: string }) => 
    apiFetch<any>('/resonance/echoes', { method: 'POST', body: JSON.stringify(data) }),
};