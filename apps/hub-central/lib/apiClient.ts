// apps/hub-central/lib/api.ts
import { IOiseau, ISeed } from "@ilot/types";
import { ITeam, IProject, ITask, IStatus } from "../../../packages/types"; 

const BASE_URL = '/api';

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

export const auth = {
  register: (data: Partial<ISeed>) => 
    apiFetch<IOiseau>('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
};

export const user = {
  getMe: () => apiFetch<IOiseau>('/user/me'),
  mutateStructure: (data: { uid: string, frequenceHEX?: string, sanctuaire?: any, aura?: string[] }) => 
    apiFetch<any>('/auth/user/update', { method: 'PUT', body: JSON.stringify(data) }),
  getLineage: () => apiFetch<any>('/user/lineage'),
  getObservatory: (userSlug: string) => apiFetch<any>(`/users/${userSlug}/observatory`),
  getRecruitable: () => apiFetch<any[]>('/users/recruitable'),
};

export const projects = {
  getAll: () => apiFetch<IProject[]>('/projects'),
  getById: (projectSlug: string) => apiFetch<IProject>(`/projects/${projectSlug}`),
  create: (data: Partial<IProject>) => 
    apiFetch<IProject>('/projects', { method: 'POST', body: JSON.stringify(data) }),
  update: (projectSlug: string, data: Partial<IProject>) => 
    apiFetch<IProject>(`/projects/${projectSlug}`, { method: 'PATCH', body: JSON.stringify(data) }), 
  delete: (projectSlug: string) => apiFetch<void>(`/projects/${projectSlug}`, { method: 'DELETE' }),
  getStatuses: () => apiFetch<IStatus[]>('/projects/statuses/all'),
};

export const tasks = {
  getAll: (projectSlug?: string) => apiFetch<ITask[]>(`/tasks${projectSlug ? `?projectUid=${projectSlug}` : ''}`),
  getBySlug: (taskSlug: string) => apiFetch<ITask>(`/tasks/${taskSlug}`),
  create: (data: Partial<ITask>) => apiFetch<ITask>('/tasks', { method: 'POST', body: JSON.stringify(data) }),
  update: (taskSlug: string, data: Partial<ITask>) => apiFetch<ITask>(`/tasks/${taskSlug}`, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (taskSlug: string) => apiFetch<void>(`/tasks/${taskSlug}`, { method: 'DELETE' }),
  irrigate: (taskSlug: string) => apiFetch<any>(`/tasks/${taskSlug}/irrigate`, { method: 'POST' }),
};

export const teams = {
  getAll: () => apiFetch<any[]>('/teams'), 
  create: (data: any) => apiFetch<any>('/teams', { method: 'POST', body: JSON.stringify(data) }),
  getById: (teamSlug: string) => apiFetch<ITeam>(`/teams/${teamSlug}`),
  update: (teamSlug: string, data: Partial<ITeam>) => 
    apiFetch<ITeam>(`/teams/${teamSlug}`, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (teamSlug: string) => apiFetch<void>(`/teams/${teamSlug}`, { method: 'DELETE' }),
  getChirps: (teamSlug: string) => apiFetch<any[]>(`/teams/${teamSlug}/chirps`),
  sendChirp: (teamSlug: string, content: string) => 
    apiFetch<any>(`/teams/${teamSlug}/chirps`, { method: 'POST', body: JSON.stringify({ content }) }),
  removeMember: (teamSlug: string, userSlug: string) => 
    apiFetch<void>(`/teams/${teamSlug}/members/${userSlug}`, { method: 'DELETE' }),
  inviteBird: (teamSlug: string, userSlug: string, capabilities: string[]) => 
    apiFetch<any>(`/teams/${teamSlug}/members`, { 
      method: 'POST', 
      body: JSON.stringify({ userSlug, action: 'INVITE', capabilities }) 
    }),
};

export const storage = {
  upload: async (file: File, entityType: string, entitySlug: string) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('entityType', entityType);
    formData.append('entityId', entitySlug);
    return apiFetch<{ url: string; fileId: string }>('/storage/upload', { 
      method: 'POST', 
      body: formData 
    });
  }
};

export const users = {
  getAll: () => apiFetch<Partial<IOiseau>[]>('/users'),
  getByUid: (userSlug: string) => apiFetch<IOiseau>(`/users/${userSlug}`)
};

export const sujets = {
  getAll: () => apiFetch<any[]>('/sujets'),
  create: (data: any) => apiFetch<any>('/sujets', { method: 'POST', body: JSON.stringify(data) }),
  update: (sujetSlug: string, data: any) => apiFetch<any>(`/sujets/${sujetSlug}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (sujetSlug: string) => apiFetch<void>(`/sujets/${sujetSlug}`, { method: 'DELETE' }),
};

export const partitions = {
  getAll: () => apiFetch<any[]>('/partitions'),
  getById: (partitionSlug: string) => apiFetch<any>(`/partitions/${partitionSlug}`),
  create: (data: any) => apiFetch<any>('/partitions', { method: 'POST', body: JSON.stringify(data) }),
  update: (partitionSlug: string, data: any) => apiFetch<any>(`/partitions/${partitionSlug}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (partitionSlug: string) => apiFetch<void>(`/partitions/${partitionSlug}`, { method: 'DELETE' }),
};

export const lettrinSprites = {
  getAll: () => apiFetch<any[]>('/letrin/sprites'),
  getById: (fontSlug: string) => apiFetch<any>(`/letrin/sprites/${fontSlug}`),
  create: (data: any) => apiFetch<any>('/letrin/sprites', { method: 'POST', body: JSON.stringify(data) }),
  update: (fontSlug: string, data: any) => apiFetch<any>(`/letrin/sprites/${fontSlug}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (fontSlug: string) => apiFetch<void>(`/letrin/sprites/${fontSlug}`, { method: 'DELETE' }),
};

export const kontakt = {
  getProfiles: (params?: { alignment?: string; status?: string }) => {
    const query = new URLSearchParams(params as any).toString();
    return apiFetch<any[]>(`/kontakt/profiles${query ? `?${query}` : ''}`);
  },
  getProfileByUserUid: (userSlug: string) => apiFetch<any>(`/kontakt/profiles/${userSlug}`),
  saveProfile: (data: any) => apiFetch<any>('/kontakt/profiles', { method: 'POST', body: JSON.stringify(data) }),
  swipe: (targetSlug: string, action: 'LIKE' | 'PASS') => apiFetch<any>('/kontakt/swipes', { method: 'POST', body: JSON.stringify({ targetUid: targetSlug, action }) }),
  getQuests: () => apiFetch<any[]>('/kontakt/quests'),
  createQuest: (data: any) => apiFetch<any>('/kontakt/quests', { method: 'POST', body: JSON.stringify(data) }),
};

export const ecommerce = {
  getMarketplace: () => apiFetch<any>('/ecommerce/marketPlace'),
  getStores: () => apiFetch<any[]>('/ecommerce/stores'),
  getStoreBySlug: (storeSlug: string) => apiFetch<any>(`/ecommerce/stores/${storeSlug}`),
  createStore: (data: { storeName: string; description?: string; stripeAccountId?: string }) => 
    apiFetch<any>('/ecommerce/stores', { method: 'POST', body: JSON.stringify(data) }),
  deleteStore: (storeSlug: string) => apiFetch<void>(`/ecommerce/stores/${storeSlug}`, { method: 'DELETE' }),
  getProducts: (params?: { storeUid?: string; category?: string }) => {
    const query = new URLSearchParams(params as any).toString();
    return apiFetch<any[]>(`/ecommerce/products${query ? `?${query}` : ''}`);
  },
  getProductBySlug: (productSlug: string) => apiFetch<any>(`/ecommerce/products/${productSlug}`),
  createProduct: (data: any) => apiFetch<any>('/ecommerce/products', { method: 'POST', body: JSON.stringify(data) }),
  deleteProduct: (productSlug: string) => apiFetch<void>(`/ecommerce/products/${productSlug}`, { method: 'DELETE' }),
  getWishlist: () => apiFetch<any>('/ecommerce/wishlist'),
  getWishlists: () => apiFetch<any>('/ecommerce/wishlist'),
  createWishlist: (name: string) => apiFetch<any>('/ecommerce/wishlist', { method: 'POST', body: JSON.stringify({ name }) }),
  toggleWishlist: (productSlug: string, wishlistSlug?: string) => apiFetch<any>('/ecommerce/wishlist', { method: 'POST', body: JSON.stringify({ productUid: productSlug, wishlistUid: wishlistSlug }) }),
  deleteWishlistOrItem: (itemSlug: string) => apiFetch<void>(`/ecommerce/wishlist/${itemSlug}`, { method: 'DELETE' }),
  createOrder: (orderData: any) => apiFetch<any>('/ecommerce/orders', { method: 'POST', body: JSON.stringify(orderData) }),
  getOrder: (orderSlug: string) => apiFetch<any>(`/ecommerce/orders/${orderSlug}`),
  updateOrderStatus: (orderSlug: string, status: string) => apiFetch<any>(`/ecommerce/orders/${orderSlug}`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  getBarterOffers: () => apiFetch<any[]>('/ecommerce/barter'),
  proposeBarter: (data: { receiverUid?: string; offeredProductUids: string[]; requestedProductUids: string[] }) => 
    apiFetch<any>('/ecommerce/barter', { method: 'POST', body: JSON.stringify(data) }),
  resolveBarter: (barterSlug: string, status: 'ACCEPTED' | 'REJECTED') => 
    apiFetch<any>('/ecommerce/barter', { method: 'PATCH', body: JSON.stringify({ barterUid: barterSlug, status }) })
};

export const games = {
  getPlayerStats: (userSlug: string) => apiFetch<any>(`/games/stats/${userSlug}`),
  updatePlayerStats: (userSlug: string, data: { game: string, isWin: boolean, score: number }) => 
    apiFetch<any>(`/games/stats/${userSlug}`, { method: 'POST', body: JSON.stringify(data) }),
  getLeaderboard: (gameType: string) => apiFetch<any[]>(`/games/leaderboard/${gameType}`),
};

export const salon = {
  calculateEntanglement: (resonanceScore: number, mutualTrustIndex: number) =>
    apiFetch<{ entanglementLevel: number }>('/salon/thought', {
      method: 'POST',
      body: JSON.stringify({ action: 'ENTANGLEMENT', resonanceScore, mutualTrustIndex })
    }),
  sealThought: (plainThought: string, sharedSecretKey: string) =>
    apiFetch<{ sealed: any }>('/salon/thought', {
      method: 'POST',
      body: JSON.stringify({ action: 'SEAL', plainThought, sharedSecretKey })
    }),
  unsealThought: (enactedThought: any, sharedSecretKey: string) =>
    apiFetch<{ unsealed: string }>('/salon/thought', {
      method: 'POST',
      body: JSON.stringify({ action: 'UNSEAL', enactedThought, sharedSecretKey })
    }),
};

// ==========================================
// 🆕 NOUVELLES ROUTES (Canopée, Graphe & Évanescence)
// ==========================================

export const messages = {
  getHistory: (conversationSlug: string, limit?: number, before?: string) => {
    const params = new URLSearchParams();
    params.append('conversationSlug', conversationSlug);
    if (limit) params.append('limit', limit.toString());
    if (before) params.append('before', before);
    return apiFetch<any[]>(`/messages?${params.toString()}`);
  },
  send: (data: { conversationSlug: string; content: string; rawAttachments?: any[]; replyToSlug?: string }) =>
    apiFetch<any>('/messages', { method: 'POST', body: JSON.stringify(data) }),
  getUnreadCount: () => apiFetch<{ unreadCount: number }>('/messages/unread'),
};

export const sovereign = {
  purge: (reason: string, archiveData: boolean = false) =>
    apiFetch<any>('/sovereign/purge', { method: 'POST', body: JSON.stringify({ reason, archiveData }) }),
};

export const resonance = {
  weaveLink: (sourceSlug: string, targetSlug: string, resonanceType: string) =>
    apiFetch<any>('/resonance/links', { method: 'POST', body: JSON.stringify({ sourceSlug, targetSlug, resonanceType }) }),
  getEchoes: (entitySlug: string) => 
    apiFetch<any[]>(`/resonance/echoes?slug=${entitySlug}`),
};

export const graph = {
  getContext: (entitySlug: string, depth?: number) =>
    apiFetch<any>(`/graph/context?entitySlug=${entitySlug}${depth ? `&depth=${depth}` : ''}`),
};

export const media = {
  getStreamFeed: () => apiFetch<any[]>('/media/stream-feed'),
};

export const taxonomy = {
  getAll: () => apiFetch<any>('/taxonomy'),
};