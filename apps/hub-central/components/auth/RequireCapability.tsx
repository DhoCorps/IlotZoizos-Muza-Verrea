// apps/hub-central/components/auth/RequireCapability.tsx
import React from 'react';

interface RequireCapabilityProps {
  capabilities: string[];
  need: string | string[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * 🛡️ REQUIRE CAPABILITY : Le Filtre de Résonance
 * Vérifie si l'Aura de l'Oiseau correspond aux besoins du Chantier.
 */
export const RequireCapability: React.FC<RequireCapabilityProps> = ({ 
  capabilities = [], 
  need, 
  children, 
  fallback = null 
}) => {
  // 🛡️ SUTURE : On normalise tout en minuscules pour éviter les conflits de casse
  const normalizedCaps = capabilities.map(c => c.toLowerCase());
  
  // 🛡️ SUTURE : Reconnaissance du Sceau de l'Architecte (*)
  const isArchitect = normalizedCaps.includes('*');
  
  
  const needs = Array.isArray(need) ? need : [need];
  const normalizedNeeds = needs.map(n => n.toLowerCase());
  
  
  // L'accès est accordé si l'Oiseau est Architecte OU s'il a la capacité spécifique
  const hasPower = isArchitect || normalizedNeeds.some(n => normalizedCaps.includes(n));

  console.log("🕵️ [RequireCapability] Plumes:", normalizedCaps, "Besoin:", normalizedNeeds, "Accordé:", hasPower);

  // 🔍 SONDE DE DIAGNOSTIC (À commenter en production)
  // console.log("🕵️ [RequireCapability] Plumes présentes:", normalizedCaps, "Besoin:", normalizedNeeds, "Accordé:", hasPower);

  if (!hasPower) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};