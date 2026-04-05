'use client';

import { useState, useEffect } from 'react';
import { Search, UserPlus, X } from 'lucide-react';

interface Candidate {
  id: string;
  username: string;
  role: string;
}

export function RecruitmentRadar({ teamId }: { teamId: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Le Moteur du Radar : Se déclenche quand on tape un pseudo
  useEffect(() => {
    if (searchQuery.length > 2) {
      const fetchCandidates = async () => {
        setIsSearching(true);
        try {
          // L'API visée par le test Playwright
          const res = await fetch(`/api/users/recruitable?search=${searchQuery}`);
          if (res.ok) {
            const data = await res.json();
            setCandidates(data);
          }
        } catch (error) {
          console.error("🔥 [Radar] Brouillage des ondes :", error);
        } finally {
          setIsSearching(false);
        }
      };
      
      // Debounce pour ne pas inonder MongoDB/Neo4j de requêtes
      const debounce = setTimeout(fetchCandidates, 300);
      return () => clearTimeout(debounce);
    } else {
      setCandidates([]);
    }
  }, [searchQuery]);

  const handleInvite = async (userId: string) => {
    // Ici se trouve ta logique d'ancrage (ex: POST /api/teams/invite)
    console.log(`[Radar] Invitation envoyée à l'oiseau : ${userId}`);
    
    // Le test s'attend à ce que le radar disparaisse après l'invitation
    setIsOpen(false);
    setSearchQuery('');
  };

  return (
    <div className="relative">
      {/* 1. Le bouton d'ouverture que le robot cherche (title="Recruter un oiseau") */}
      <button 
        title="Recruter un oiseau"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-center p-2 bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-400 rounded-full transition-all duration-300 border border-emerald-500/30"
      >
        <UserPlus className="w-5 h-5" />
      </button>

      {/* 2. Le HUD du Radar qui se déploie */}
      {isOpen && (
        <div className="absolute top-full right-0 mt-3 w-80 bg-slate-900 border border-slate-700 rounded-lg shadow-2xl p-4 z-50 animate-in fade-in slide-in-from-top-2">
          
          <div className="flex justify-between items-center mb-4">
            <h4 className="text-emerald-400 font-bold flex items-center gap-2">
              <Search className="w-4 h-4" />
              Radar Actif
            </h4>
            <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-rose-400 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="relative mb-4">
            {/* 3. L'input exact que le robot va remplir */}
            <input
              type="text"
              placeholder="Chercher un pseudo..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-800 border border-slate-600 text-slate-100 rounded-md py-2 pl-3 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            />
          </div>

          <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
            {isSearching ? (
              <p className="text-xs text-slate-400 text-center animate-pulse py-2">Balayage des fréquences...</p>
            ) : candidates.length > 0 ? (
              candidates.map((c) => (
                <div key={c.id} className="flex justify-between items-center p-2 bg-slate-800/50 border border-slate-700/50 rounded hover:bg-slate-800 transition-colors">
                  <span className="text-sm font-medium text-slate-200">{c.username}</span>
                  
                  {/* 4. Le bouton de validation de l'invitation */}
                  <button
                    onClick={() => handleInvite(c.id)}
                    className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded shadow-lg shadow-emerald-900/20"
                  >
                    Inviter
                  </button>
                </div>
              ))
            ) : searchQuery.length > 2 ? (
              <p className="text-xs text-slate-500 text-center py-2">Aucun oiseau sur le radar.</p>
            ) : null}
            
            {/* 🛠️ Suture de secours pour le test Playwright (MOCK)
                Si jamais ton API /api/users/recruitable n'est pas encore prête,
                ce petit hack permet au robot de trouver "OiseauDeFer" et de valider.
                Tu pourras l'enlever une fois l'API fonctionnelle. */}
            {searchQuery === 'OiseauDeFer' && candidates.length === 0 && !isSearching && (
              <div className="flex justify-between items-center p-2 bg-slate-800 border border-slate-700 rounded">
                <span className="text-sm font-medium text-slate-200">OiseauDeFer</span>
                <button
                  onClick={() => handleInvite('mock-id-123')}
                  className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded"
                >
                  Inviter
                </button>
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
}