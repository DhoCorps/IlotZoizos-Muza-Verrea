// apps/hub-central/app/inception/canopy/stats/page.tsx
'use client';

import React from 'react';
import CanopyStatsDashboard from '@/components/canopy/CanopyStatsDashBoard';

export default function CanopyStatsPage() {
  return (
    <div className="space-y-8">
      <CanopyStatsDashboard />
    </div>
  );
}