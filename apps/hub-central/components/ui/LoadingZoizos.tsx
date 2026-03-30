'use client';

export default function LoadingZoizos({ message = "L'oiseau prépare son nid..." }) {
  return (
    <div className="flex flex-col items-center justify-center gap-6 p-10 bg-slate-900/40 backdrop-blur-sm rounded-3xl border border-white/5 shadow-2xl">
      <div className="relative w-20 h-20">
        <div className="absolute inset-0 rounded-full border-2 border-t-emerald-400 border-r-transparent border-b-cyan-400 border-l-transparent animate-spin drop-shadow-[0_0_10px_rgba(52,211,153,0.5)]" />
        
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-3xl text-emerald-100 animate-bounce drop-shadow-md">
            (:
          </span>
        </div>
      </div>
      
      <p className="text-emerald-400/80 text-sm font-medium animate-pulse tracking-widest uppercase">
        {message}
      </p>
      
      <div className="w-56 h-1 bg-slate-800/80 rounded-full overflow-hidden shadow-inner">
        <div className="h-full bg-gradient-to-r from-emerald-400 to-cyan-400 animate-progress-indefinite shadow-[0_0_10px_rgba(52,211,153,0.8)]" />
      </div>

      <style jsx>{`
        @keyframes progress-indefinite {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .animate-progress-indefinite {
          animation: progress-indefinite 1.5s infinite ease-in-out;
        }
      `}</style>
    </div>
  );
}