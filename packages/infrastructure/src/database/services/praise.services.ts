// src/services/praise.service.ts

export interface PraisePayload {
  targetIdentifier: string;
  text: string;
  type?: string;
}

export interface PraiseItem {
  uid: string;
  text: string;
  type: string;
  createdAt: string;
  author: {
    uid: string;
    pseudo: string;
    avatarUrl?: string;
  };
}

export interface PraiseResponse {
  success: boolean;
  message?: string;
  data: PraiseItem[] | PraiseItem;
  error?: string;
}

export const fetchPraises = async (targetUid?: string): Promise<PraiseItem[]> => {
  let response;
  const query = targetUid ? `?targetUid=${targetUid}` : '';

  try {
    response = await fetch(`/api/praises${query}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (networkError) {
    throw new Error("Erreur de connexion à la Matrice lors de la lecture du Panthéon.");
  }

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Impossible de consulter le Panthéon des Éloges.");
  }

  return data.data || [];
};

export const createPraise = async (payload: PraisePayload): Promise<PraiseResponse> => {
  let response;

  try {
    response = await fetch('/api/praises', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch (networkError) {
    throw new Error("Erreur de connexion à la Matrice lors de la gravure de l'éloge.");
  }

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Une interférence a empêché la gravure de l'éloge.");
  }

  return data;
};