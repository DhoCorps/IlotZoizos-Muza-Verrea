import { useState } from 'react';
import { randomUUID } from 'crypto';

export function TaskForm({ projectUid, birds, existingTasks, onSubmit, onCancel }: any) {
  return (
    <form onSubmit={onSubmit} className="space-y-6 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
      <div className="space-y-4">
        <h4 className="text-[10px] font-black text-[#E5484D] uppercase tracking-widest">Atome de Travail</h4>
        <input name="title" placeholder="Titre de la tâche" className="bio-input" required />
        <textarea name="description" placeholder="Détails techniques..." className="bio-input h-20" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-[8px] uppercase text-slate-500 font-black">Escouade d'Oiseaux</label>
          <select name="assignees" multiple className="bio-input h-24 text-xs">
            {birds.map((b: any) => (
              <option key={b.uid} value={b.uid}>{b.username}</option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <label className="text-[8px] uppercase text-slate-500 font-black">Tâche Parente (Optionnel)</label>
          <select name="parentUid" className="bio-input text-xs">
            <option value="">Tâche Racine</option>
            {existingTasks.map((t: any) => (
              <option key={t.uid} value={t.uid}>{t.content.title}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="text-[8px] uppercase text-slate-500 mb-2 block">Pomodoros Est.</label>
          <input name="pomoEst" type="number" defaultValue="1" className="bio-input" />
        </div>
        <div>
          <label className="text-[8px] uppercase text-slate-500 mb-2 block">Priorité</label>
          <select name="priority" className="bio-input text-xs">
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
            <option value="CRITICAL">Critical</option>
          </select>
        </div>
        <div>
          <label className="text-[8px] uppercase text-slate-500 mb-2 block">Charge Mentale</label>
          <input name="mentalLoad" type="number" defaultValue="10" className="bio-input" />
        </div>
      </div>

      <div className="pt-6 flex flex-col gap-3">
        <button type="submit" className="w-full bg-[#E5484D] py-4 rounded-xl font-black uppercase text-sm shadow-[0_0_20px_rgba(229,72,77,0.2)]">
          Sceller la Tâche
        </button>
        <button type="button" onClick={onCancel} className="text-[9px] uppercase font-mono text-slate-500">Annuler</button>
      </div>
    </form>
  );
}