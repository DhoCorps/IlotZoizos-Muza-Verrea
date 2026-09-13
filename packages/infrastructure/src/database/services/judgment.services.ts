// src/services/judgment.service.ts

export interface SummonResponse {
  success: boolean;
  jurors: string[];
}

export interface JudgmentPayload {
  targetIdentifier: string;
  reportUid: string;
  judgmentLevel: 1 | 2 | 3;
}

export interface JudgmentResponse {
  success: boolean;
  message: string;
  data?: {
    appliedLevel: number;
    usedGrace: boolean;
    newKarmaStatus: string;
    strikes: number;
    gracesRemaining: number;
  };
  error?: string;
}

export const summonJurors = async (plaintiffId: string, defendantId: string): Promise<SummonResponse> => {
  let response; // 👈 On déclare la variable ici pour qu'elle survive au bloc try
  
  try {
    response = await fetch(`/api/judgment?plaintiffId=${plaintiffId}&defendantId=${defendantId}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (networkError) {
    throw new Error("Erreur de connexion à la Matrice lors de la convocation.");
  }

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Impossible de réunir un tribunal impartial.");
  }

  return data;
};

export const executeJudgment = async (payload: JudgmentPayload): Promise<JudgmentResponse> => {
  let response;
  
  try {
    response = await fetch('/api/judgment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch (networkError) {
    throw new Error("Erreur de connexion à la Matrice lors du jugement.");
  }

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Une interférence a empêché l'exécution de la sentence.");
  }

  return data;
};