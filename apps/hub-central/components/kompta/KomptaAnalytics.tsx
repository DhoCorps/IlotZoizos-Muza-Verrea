'use client';

import React from 'react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { TrendingUp, BarChart3, Activity } from 'lucide-react';

// ==========================================
// INTERFACES (Peuvent être importées depuis @ilot/shared-core)
// ==========================================
export interface TrafficDataPoint {
  date: string;
  visitors: number;
  pageViews: number;
}

export interface ERPFinancialStats {
  yearMonth: string;
  caTTC: number;
  caHT: number;
  tvaCollected: number;
  platformFees: number;
  netMargin: number;
  transactionCount: number;
}

export interface StoreTrafficStats {
  storeUid: string;
  yearMonth: string;
  dailyTraffic: TrafficDataPoint[];
  historicalMonthlyTraffic: TrafficDataPoint[];
}

export interface UnifiedAnalyticsData {
  revenue: ERPFinancialStats;
  traffic: StoreTrafficStats;
}

interface KomptaAnalyticsProps {
  data: UnifiedAnalyticsData;
}

// ==========================================
// COMPOSANT PRINCIPAL
// ==========================================
export function KomptaAnalytics({ data }: KomptaAnalyticsProps) {
  const { revenue, traffic } = data;

  // 1. Formatage des données de trafic (Mois en cours)
  const trafficData = traffic.dailyTraffic.map(point => ({
    ...point,
    // Formatage de la date (ex: "2026-08-01" -> "01/08")
    formattedDate: point.date.split('-').slice(1, 3).reverse().join('/'),
  }));

  // 2. Formatage des données de revenus (Conversion des centimes en devise réelle)
  const revenueData = [
    {
      name: `Bilan ${revenue.yearMonth}`,
      'CA TTC': revenue.caTTC / 100,
      'CA HT': revenue.caHT / 100,
      'TVA Collectée': revenue.tvaCollected / 100,
      'Frais Plateforme': revenue.platformFees / 100,
      'Marge Nette': revenue.netMargin / 100,
    }
  ];

  // 3. Style personnalisé pour les Tooltips Recharts en mode sombre
  const CustomTooltipStyle = {
    backgroundColor: 'rgba(15, 23, 42, 0.9)', // slate-900
    borderColor: 'rgba(245, 158, 11, 0.3)', // amber-500
    color: '#f1f5f9', // slate-100
    borderRadius: '0.75rem',
    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)',
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* En-tête ERP */}
      <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
        <Activity className="text-amber-400" size={24} />
        <h2 className="text-xl font-black uppercase tracking-wider text-slate-100">
          Analytique ERP & Trafic
        </h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* GRAPHIQUE 1 : Courbe de Trafic */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col space-y-6">
          <div className="flex items-center gap-2 text-slate-300">
            <TrendingUp size={18} className="text-emerald-400" />
            <h3 className="font-bold uppercase tracking-widest text-xs">Visites & Vues (Mois en cours)</h3>
          </div>
          
          <div className="h-72 w-full">
            {trafficData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trafficData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis 
                    dataKey="formattedDate" 
                    stroke="#64748b" 
                    fontSize={10} 
                    tickMargin={10}
                    tickLine={false}
                  />
                  <YAxis 
                    stroke="#64748b" 
                    fontSize={10} 
                    tickLine={false} 
                    axisLine={false} 
                  />
                  <Tooltip 
                    contentStyle={CustomTooltipStyle}
                    itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                  <Line 
                    type="monotone" 
                    name="Visiteurs Uniques"
                    dataKey="visitors" 
                    stroke="#10b981" // emerald-500
                    strokeWidth={3} 
                    dot={{ r: 4, fill: '#10b981', strokeWidth: 0 }}
                    activeDot={{ r: 6, strokeWidth: 0 }} 
                  />
                  <Line 
                    type="monotone" 
                    name="Vues Totales"
                    dataKey="pageViews" 
                    stroke="#3b82f6" // blue-500
                    strokeWidth={3} 
                    dot={{ r: 4, fill: '#3b82f6', strokeWidth: 0 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-500 text-xs uppercase font-mono tracking-widest border-2 border-dashed border-slate-800 rounded-xl">
                Aucune donnée de trafic ce mois-ci.
              </div>
            )}
          </div>
        </div>

        {/* GRAPHIQUE 2 : Histogramme des Revenus (Fiscalité) */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col space-y-6">
          <div className="flex items-center gap-2 text-slate-300">
            <BarChart3 size={18} className="text-amber-400" />
            <h3 className="font-bold uppercase tracking-widest text-xs">Ventilation Fiscale (Devise)</h3>
          </div>
          
          <div className="h-72 w-full">
            {revenue.caTTC > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenueData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis 
                    dataKey="name" 
                    stroke="#64748b" 
                    fontSize={10} 
                    tickLine={false} 
                  />
                  <YAxis 
                    stroke="#64748b" 
                    fontSize={10} 
                    tickLine={false} 
                    axisLine={false} 
                  />
                  <Tooltip 
                    cursor={{ fill: 'rgba(30, 41, 59, 0.4)' }}
                    contentStyle={CustomTooltipStyle}
                    itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                    // 🛡️ CORRECTION : Typage générique "any" + Vérification pour éviter le plantage sur undefined
                    formatter={(value) => [typeof value === 'number' ? `${value.toFixed(2)} €` : `${String(value || 0)} €`]}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                  <Bar dataKey="CA TTC" fill="#94a3b8" radius={[4, 4, 0, 0]} maxBarSize={50} />
                  <Bar dataKey="CA HT" fill="#f59e0b" radius={[4, 4, 0, 0]} maxBarSize={50} />
                  <Bar dataKey="TVA Collectée" fill="#f43f5e" radius={[4, 4, 0, 0]} maxBarSize={50} />
                  <Bar dataKey="Marge Nette" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={50} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-500 text-xs uppercase font-mono tracking-widest border-2 border-dashed border-slate-800 rounded-xl">
                Aucun revenu généré ce mois-ci.
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}