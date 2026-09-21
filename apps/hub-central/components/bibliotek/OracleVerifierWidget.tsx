'use client';

import React, { useState } from 'react';
import { ShieldCheck, ShieldAlert, Loader2, Search, CheckCircle2, XCircle } from 'lucide-react';

interface OracleVerificationResult {
  uid: string;
  title: string;
  authorSlug: string;
  writingType: string;
  style: string;
  digitalSignature: string;
  timestampedAt: string;
}

export function OracleVerifierWidget() {
  const [hashInput, setHashInput] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [verificationResult, setVerificationResult] = useState<OracleVerificationResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hashInput.trim()) return;

    setIsLoading(true);
    setVerificationResult(null);
    setErrorMessage(null);

    try {
      const res = await fetch(`/api/bibliotek/oracle?signature=${encodeURIComponent(hashInput.trim())}`);
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || "Sceau introuvable dans le Sanctuaire.");
      }

      setVerificationResult(json.data);
    } catch (err: any) {
      setErrorMessage(err.message || "Échec de la vérification par l'Oracle.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-[#1A1D24] border border-[#2A2E39] rounded-3xl p-6 md:p-8 shadow-2xl space-y-6 font-sans text-[#E1E4E8]">
      <div className="flex items-center gap-3 border-b border-[#2A2E39] pb-4">
        <div className="p-2 bg-[#E5484D]/10 rounded-2xl text-[#E5484D]">
          <ShieldCheck size={24} />
        </div>
        <div>
          <h3 className="text-base font-black uppercase tracking-widest text-white">L'Oracle du Sceau</h3>
          <p className="text-xs text-[#8B949E]">Vérifie publiquement l'antériorité et l'intégrité infalsifiable d'un ouvrage via son hachage SHA-256.</p>
        </div>
      </div>

      <form onSubmit={handleVerify} className="space-y-4">
        <div className="relative">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8B949E]" />
          <input
            type="text"
            placeholder="Colle le sceau SHA-256 de l'ouvrage ici..."
            value={hashInput}
            onChange={(e) => setHashInput(e.target.value)}
            className="w-full bg-[#121417] border border-[#2A2E39] rounded-2xl pl-11 pr-4 py-3 text-xs text-white font-mono outline-none focus:border-[#E5484D] placeholder-[#484F58]"
          />
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isLoading || !hashInput.trim()}
            className="px-6 py-3 bg-[#E5484D] hover:bg-[#D43D42] text-white font-black uppercase text-xs rounded-xl shadow-lg transition-all flex items-center gap-2 disabled:opacity-50"
            data-testid="oracle-submit-btn"
          >
            {isLoading ? <Loader2 size={14} className="animate-spin" /> : 'Consulter l’Oracle'}
          </button>
        </div>
      </form>

      {/* Résultat positif */}
      {verificationResult && (
        <div className="bg-[#121417] border border-emerald-500/30 rounded-2xl p-5 space-y-4 animate-in fade-in duration-300" data-testid="oracle-success-box">
          <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-wider">
            <CheckCircle2 size={16} /> Sceau Authentifié & Certifié
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
            <div>
              <span className="text-[10px] text-[#8B949E] uppercase block">Ouvrage :</span>
              <span className="text-white font-bold font-serif text-sm">{verificationResult.title}</span>
            </div>
            <div>
              <span className="text-[10px] text-[#8B949E] uppercase block">Auteur :</span>
              <span className="text-[#C9D1D9]">{verificationResult.authorSlug}</span>
            </div>
            <div>
              <span className="text-[10px] text-[#8B949E] uppercase block">Genre / Style :</span>
              <span className="uppercase text-[#C9D1D9]">{verificationResult.writingType} / {verificationResult.style}</span>
            </div>
            <div>
              <span className="text-[10px] text-[#8B949E] uppercase block">Horodatage :</span>
              <span className="text-[#C9D1D9]">{new Date(verificationResult.timestampedAt).toLocaleString()}</span>
            </div>
          </div>

          <div className="pt-2 border-t border-[#2A2E39] text-[10px] text-[#8B949E] font-mono truncate">
            Sceau SHA-256 : <span className="text-slate-300">{verificationResult.digitalSignature}</span>
          </div>
        </div>
      )}

      {/* Résultat d'erreur */}
      {errorMessage && (
        <div className="bg-[#121417] border border-red-500/30 rounded-2xl p-4 flex items-center gap-3 text-red-400 text-xs font-sans animate-in fade-in duration-300" data-testid="oracle-error-box">
          <XCircle size={18} className="shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}
    </div>
  );
}