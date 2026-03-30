'use client';

import React, { useState } from 'react';
import { IRole } from '@ilot/types'; 

interface RoleFormProps {
  currentRole: string; 
  availableRoles: IRole[];
  isLoading: boolean;
  onRoleChange: (roleName: string, rolePermissions: string[]) => void;
}

export const RoleForm = ({ currentRole, availableRoles, isLoading, onRoleChange }: RoleFormProps) => {
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [customRoleName, setCustomRoleName] = useState('');

  if (isLoading) {
    return (
      <div className="bg-[#05070A]/80 p-8 rounded-2xl border border-slate-800/50 flex justify-center items-center h-40 backdrop-blur-md relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-red-900/10 blur-[40px] rounded-full animate-pulse pointer-events-none" />
        <span className="text-red-500/50 animate-pulse font-mono tracking-[0.2em] text-xs uppercase relative z-10 flex items-center gap-3">
          <span className="h-1.5 w-1.5 rounded-full bg-red-500/50"></span>
          Scan des habilitations...
        </span>
      </div>
    );
  }

  const handleCustomRoleChange = (newName: string) => {
    const formattedName = newName.replace(/\s+/g, '_').toUpperCase(); // ⚡ Normalisation technique
    setCustomRoleName(formattedName);
    onRoleChange(formattedName || 'SUR_MESURE', []); 
  };

  return (
    <div className="bg-[#05070A]/60 p-8 md:p-10 rounded-2xl border border-slate-800/80 backdrop-blur-xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.8)] relative overflow-hidden group/form">
      
      <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-red-900/5 blur-[80px] rounded-full pointer-events-none opacity-0 group-hover/form:opacity-100 transition-opacity duration-1000 -z-10" />

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 border-b border-slate-800/50 pb-6">
        <div>
          <h3 className="text-xl font-bold text-slate-100 tracking-tight flex items-center gap-3">
            <span className="text-red-500 font-mono text-sm">01.</span> Définir le Rôle
          </h3>
          <p className="text-xs font-mono text-slate-500 uppercase tracking-widest mt-2">Niveau d'accès dans la matrice</p>
        </div>
        
        <button
          onClick={() => {
            setIsCustomMode(!isCustomMode);
            if (isCustomMode) {
              if (availableRoles.length > 0) onRoleChange(availableRoles[0].name, []);
            } else {
              setCustomRoleName('');
            }
          }}
          className="text-xs font-mono font-medium text-red-400 hover:text-red-300 transition-colors flex items-center gap-2 px-3 py-1.5 rounded-md hover:bg-red-950/20"
        >
          {isCustomMode ? "← Retour aux modèles" : "✨ Forger un rôle"}
        </button>
      </div>

      {isCustomMode ? (
        <div className="p-6 bg-slate-900/40 border border-slate-800 rounded-xl shadow-inner animate-in fade-in slide-in-from-top-2 duration-300">
          <label className="block text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest mb-3">
            Identifiant du rôle (Unique) :
          </label>
          <input 
            type="text"
            placeholder="Ex: MAITRE_DES_CLEFS"
            value={customRoleName}
            onChange={(e) => handleCustomRoleChange(e.target.value)}
            className="w-full px-5 py-4 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:border-red-500 focus:ring-1 focus:ring-red-500/50 outline-none transition-all font-mono tracking-wide placeholder-slate-700"
          />
        </div>
      ) : (
        <div className="animate-in fade-in duration-500">
          <div className="flex flex-wrap gap-3">
            {availableRoles.map((role: IRole) => {
              const roleId = role.uid || (role as any)._id || role.name;
              const roleName = role.name;
              
              // ⚡ FIX : On transforme les objets permissions en tableau de chaînes (clés/UID)
              const permissionKeys = (role.permissions || []).map((p: any) => 
                typeof p === 'string' ? p : (p.uid || p.slug || p.name)
              );

              return (
                <button
                  key={roleId}
                  type="button"
                  onClick={() => onRoleChange(roleName, permissionKeys)}
                  className={`px-5 py-3 rounded-xl text-xs font-mono font-bold uppercase tracking-wider transition-all duration-300 border ${
                    currentRole === roleName
                      ? 'bg-red-950/30 text-red-400 border-red-900/50 shadow-[0_0_15px_rgba(229,72,77,0.1)] ring-1 ring-red-500/20'
                      : 'bg-slate-900/50 text-slate-400 border-slate-800 hover:bg-slate-800 hover:text-slate-200 hover:border-slate-700'
                  }`}
                >
                  {roleName}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};