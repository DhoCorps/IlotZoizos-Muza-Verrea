// apps/hub-central/components/users/CvProfileEditor.tsx
'use client';

import React from 'react';
import { Plus, Trash2, Eye, EyeOff } from 'lucide-react';

interface Experience {
  title: string;
  company: string;
  isVisibleInCv?: boolean;
  [key: string]: unknown;
}

interface Education {
  degree: string;
  school: string;
  isVisibleInCv?: boolean;
  [key: string]: unknown;
}

interface CvProfileEditorProps {
  cvProfile: {
    experiences?: Experience[];
    educations?: Education[];
    [key: string]: unknown;
  };
  onChange: (updatedCvProfile: any) => void;
}

export function CvProfileEditor({ cvProfile, onChange }: CvProfileEditorProps) {
  const experiences = cvProfile.experiences || [];
  const educations = cvProfile.educations || [];

  // 🛠️ Imirimo y'ubusesenguzi ku bumenyi n'uburambe (Experiences)
  const handleAddExperience = () => {
    const newExp = { title: '', company: '', isVisibleInCv: true };
    onChange({
      ...cvProfile,
      experiences: [...experiences, newExp]
    });
  };

  const handleRemoveExperience = (index: number) => {
    const updated = experiences.filter((_, i) => i !== index);
    onChange({ ...cvProfile, experiences: updated });
  };

  const handleExperienceChange = (index: number, field: string, value: any) => {
    const updated = [...experiences];
    updated[index] = { ...updated[index], [field]: value };
    onChange({ ...cvProfile, experiences: updated });
  };

  // 🛠️ Amashuri n'amahugurwa (Educations)
  const handleAddEducation = () => {
    const newEdu = { degree: '', school: '', isVisibleInCv: true };
    onChange({
      ...cvProfile,
      educations: [...educations, newEdu]
    });
  };

  const handleRemoveEducation = (index: number) => {
    const updated = educations.filter((_, i) => i !== index);
    onChange({ ...cvProfile, educations: updated });
  };

  const handleEducationChange = (index: number, field: string, value: any) => {
    const updated = [...educations];
    updated[index] = { ...updated[index], [field]: value };
    onChange({ ...cvProfile, educations: updated });
  };

  return (
    <div className="space-y-8 p-6 bg-white/[0.02] rounded-3xl border border-white/5">
      
      {/* 💼 IBYEREKEYE UBURAMBE BW'AKAZI (EXPERIENCES) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-300">Uburambe bw'Akazi (Experiences)</h3>
          <button
            type="button"
            onClick={handleAddExperience}
            className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-slate-200 text-xs font-mono rounded-xl border border-white/10 flex items-center gap-1.5 transition-all"
          >
            <Plus size={14} /> Yongeraho
          </button>
        </div>

        {experiences.map((exp, index) => (
          <div key={index} className="p-4 bg-black/40 border border-white/10 rounded-2xl space-y-3 relative group">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input
                type="text"
                placeholder="Umwanya w'Akazi (ex: Lead Dev)"
                value={exp.title || ''}
                onChange={(e) => handleExperienceChange(index, 'title', e.target.value)}
                className="bg-black/60 border border-white/10 p-3 rounded-xl text-xs text-slate-100 outline-none focus:border-[#E5484D]/50"
              />
              <input
                type="text"
                placeholder="Ikigo / Ishyirahamwe"
                value={exp.company || ''}
                onChange={(e) => handleExperienceChange(index, 'company', e.target.value)}
                className="bg-black/60 border border-white/10 p-3 rounded-xl text-xs text-slate-100 outline-none focus:border-[#E5484D]/50"
              />
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-white/5">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-400 font-mono">
                <input
                  type="checkbox"
                  checked={exp.isVisibleInCv !== false}
                  onChange={(e) => handleExperienceChange(index, 'isVisibleInCv', e.target.checked)}
                  className="rounded border-white/10 bg-black text-[#E5484D] focus:ring-0"
                />
                {exp.isVisibleInCv !== false ? <span className="flex items-center gap-1 text-emerald-400"><Eye size={12} /> Bigaragara kuri Bose</span> : <span className="flex items-center gap-1 text-slate-500"><EyeOff size={12} /> Byihishwe (Intime)</span>}
              </label>

              <button
                type="button"
                onClick={() => handleRemoveExperience(index)}
                className="p-2 text-red-400 hover:bg-red-500/10 rounded-xl transition-all"
                title="Siba ubu burambe"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* 🎓 IBYEREKEYE AMASHURI (EDUCATIONS) */}
      <div className="space-y-4 pt-4 border-t border-white/5">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-300">Amashuri n'Impamyabumenyi (Educations)</h3>
          <button
            type="button"
            onClick={handleAddEducation}
            className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-slate-200 text-xs font-mono rounded-xl border border-white/10 flex items-center gap-1.5 transition-all"
          >
            <Plus size={14} /> Yongeraho
          </button>
        </div>

        {educations.map((edu, index) => (
          <div key={index} className="p-4 bg-black/40 border border-white/10 rounded-2xl space-y-3 relative group">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input
                type="text"
                placeholder="Impamyabumenyi (ex: Master en Informatique)"
                value={edu.degree || ''}
                onChange={(e) => handleEducationChange(index, 'degree', e.target.value)}
                className="bg-black/60 border border-white/10 p-3 rounded-xl text-xs text-slate-100 outline-none focus:border-[#E5484D]/50"
              />
              <input
                type="text"
                placeholder="Ishuri / Kaminuza"
                value={edu.school || ''}
                onChange={(e) => handleEducationChange(index, 'school', e.target.value)}
                className="bg-black/60 border border-white/10 p-3 rounded-xl text-xs text-slate-100 outline-none focus:border-[#E5484D]/50"
              />
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-white/5">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-400 font-mono">
                <input
                  type="checkbox"
                  checked={edu.isVisibleInCv !== false}
                  onChange={(e) => handleEducationChange(index, 'isVisibleInCv', e.target.checked)}
                  className="rounded border-white/10 bg-black text-[#E5484D] focus:ring-0"
                />
                {edu.isVisibleInCv !== false ? <span className="flex items-center gap-1 text-emerald-400"><Eye size={12} /> Bigaragara kuri Bose</span> : <span className="flex items-center gap-1 text-slate-500"><EyeOff size={12} /> Byihishwe (Intime)</span>}
              </label>

              <button
                type="button"
                onClick={() => handleRemoveEducation(index)}
                className="p-2 text-red-400 hover:bg-red-500/10 rounded-xl transition-all"
                title="Siba iri shuri"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
}