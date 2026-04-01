// 🎖️ LES RÔLES ET LEURS BADGES
export const ROLE_BADGES = {
  ARCHITECTE: { 
    label: "Architecte", 
    icon: "💠", 
    color: "border-emerald-500 text-emerald-500 bg-emerald-500/10",
    signature: "<(:<" 
  },
  BATISSEUR: { 
    label: "Bâtisseur", 
    icon: "🏗️", 
    color: "border-cyan-500 text-cyan-500 bg-cyan-500/10",
    signature: ">:)>"
  },
  VISITEUR: { 
    label: "Visiteur", 
    icon: "👁️", 
    color: "border-slate-500 text-slate-500 bg-slate-500/10",
    signature: ">:)>"
  }
} as const;

export type UserRole = keyof typeof ROLE_BADGES;

export interface IRole {
  uid: string;
  id: string;                
  name: string;              
  slug: string;              
  permissions: string[];     
  description?: string;      
  color: string;             
  isDefault: boolean;        
  level: number;             
  createdAt: Date | string;
  updatedAt: Date | string;
}