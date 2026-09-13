// packages/infrastructure/src/database/services/report.service.ts
// (ou src/services/report.service.ts selon ton arborescence)

export interface ReportPayload {
  targetIdentifier: string;
  reason: string;
}

export interface ReportResponse {
  success: boolean;
  message: string;
  data?: {
    uid: string;
    status: string;
  };
  error?: string;
}

export const initiateMediation = async (payload: ReportPayload): Promise<ReportResponse> => {
  let response;
  
  try {
    // 1. Appel réseau (C'est ici que fetch peut crasher si coupure internet)
    response = await fetch('/api/reports', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
  } catch (networkError) {
    // Interception pure et dure de la fracture réseau
    throw new Error("Erreur de connexion à la Matrice.");
  }

  // 2. Traitement de la réponse de l'API
  const data = await response.json();

  if (!response.ok) {
    // Si l'API renvoie une erreur métier (400, 403, 404, 500)
    throw new Error(data.error || "Une interférence a empêché l'envoi du signalement.");
  }

  return data;
};