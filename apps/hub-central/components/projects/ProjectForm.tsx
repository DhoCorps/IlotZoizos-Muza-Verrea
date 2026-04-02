import { useState } from 'react';

export function ProjectForm({ ownerUid, existingProjects, onSuccess, onCancel }: any) {
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    
    const formData = new FormData(e.currentTarget);
    
    // 🏗️ Construction de l'objet Gargantuesque
    const payload = {
      ownerUid, // L'UID de l'oiseau ou du nid propriétaire
      name: formData.get('name'),
      tag: formData.get('tag'),
      description: formData.get('description'),
      parentId: formData.get('parentId') || null, // Récursivité
      status: formData.get('status'),
      priority: formData.get('priority'),
      category: formData.get('category'),
      // On transforme la chaîne d'URLs en tableau
      fileUploads: formData.get('fileUrls') 
        ? (formData.get('fileUrls') as string).split(',').map(url => url.trim()) 
        : [],
      appearance: {
        color: formData.get('color') || '#E5484D',
        icon: formData.get('icon') || 'folder'
      },
      health: {
        complexityLevel: Number(formData.get('complexity')),
        averageMentalLoad: Number(formData.get('mentalLoad'))
      }
    };

    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error("Erreur lors de la fondation");
      
      onSuccess(); // Rafraîchit la liste et ferme la modale
    } catch (err) {
      console.error("🔥 Erreur Fondation:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
      <div className="space-y-4">
        <h4 className="text-[10px] font-black text-[#E5484D] uppercase tracking-widest">Identité & Hiérarchie</h4>
        <input name="name" placeholder="Nom du projet" className="bio-input" required />
        <div className="grid grid-cols-2 gap-4">
          <input name="tag" placeholder="TAG (ex: RNWL)" className="bio-input" />
          <select name="parentId" className="bio-input">
            <option value="">Projet Racine</option>
            {existingProjects.map((p: any) => (
              <option key={p.uid} value={p.uid}>{p.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <select name="status" className="bio-input text-xs"><option value="CONCEPT">Concept</option><option value="ACTIVE">Actif</option></select>
        <select name="priority" className="bio-input text-xs"><option value="MEDIUM">Medium</option><option value="HIGH">High</option></select>
        <select name="category" className="bio-input text-xs"><option value="TECHNICAL">Technique</option><option value="ARTISTIC">Artistique</option></select>
      </div>

      <div className="space-y-4">
        <h4 className="text-[10px] font-black text-[#E5484D] uppercase tracking-widest">Actifs Numériques</h4>
        <input name="fileUrls" placeholder="URLs des fichiers (séparées par des virgules)" className="bio-input" />
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="text-[8px] uppercase text-slate-500">Charge Mentale Initiale</label>
          <input type="range" name="mentalLoad" className="w-full accent-[#E5484D]" />
        </div>
        <div className="space-y-2">
          <label className="text-[8px] uppercase text-slate-500">Couleur Organique</label>
          <input type="color" name="color" defaultValue="#E5484D" className="w-full h-8 bg-transparent border-none" />
        </div>
      </div>

      <div className="pt-6 flex flex-col gap-3">
        <button disabled={loading} type="submit" className="w-full bg-[#E5484D] py-4 rounded-xl font-black uppercase text-sm hover:scale-[1.02] transition-all">
          {loading ? 'Amorçage...' : 'Sceller le Projet'}
        </button>
        <button type="button" onClick={onCancel} className="text-[9px] uppercase font-mono text-slate-500">Abandonner</button>
      </div>
    </form>
  );
}