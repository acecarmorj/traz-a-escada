import React from 'react';
import { Shield, Truck, UserCheck } from 'lucide-react';

/**
 * Header institucional compacto otimizado para celulares estilo MOTOJAGEMINI.
 */
export function Header({ activeTab, setActiveTab, countPendentes }) {
  return (
    <header className="shrink-0 z-40 bg-slate-900 text-white border-b border-slate-800 shadow-sm select-none">
      <div className="max-w-md sm:max-w-xl mx-auto px-3 py-2 flex items-center justify-between gap-2">
        {/* Identificação Institucional SUS / Vigilância */}
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-black text-xs shadow-xs shrink-0">
            ACE
          </div>
          <div className="min-w-0">
            <h1 className="text-xs font-black tracking-tight text-white uppercase truncate leading-none">
              Traz a Escada
            </h1>
            <p className="text-[10px] text-slate-400 font-semibold truncate mt-0.5">
              Vigilância Ambiental • Carmo - RJ
            </p>
          </div>
        </div>

        {/* Switcher de Telas Estilo MotoJá (Agente / Leva a Escada) */}
        <nav className="flex items-center bg-slate-800/90 p-1 rounded-xl border border-slate-700/80 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('agente')}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
              activeTab === 'agente'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>Agente</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('central')}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all relative ${
              activeTab === 'central'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <Truck className="w-3.5 h-3.5" />
            <span>Escada</span>
            {countPendentes > 0 && (
              <span className="ml-1 px-1.5 py-0.2 bg-amber-500 text-slate-950 rounded-full text-[10px] font-black animate-pulse">
                {countPendentes}
              </span>
            )}
          </button>
        </nav>
      </div>
    </header>
  );
}
