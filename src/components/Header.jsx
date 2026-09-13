import React from 'react';
import { Shield, Truck, UserCheck } from 'lucide-react';

export function Header({ activeTab, setActiveTab, countPendentes }) {
  return (
    <header className="sticky top-0 z-30 bg-slate-900 text-white border-b border-slate-800 shadow-sm">
      <div className="max-w-4xl mx-auto px-4 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-sm shadow-xs border border-emerald-500">
            ACE
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm sm:text-base font-semibold tracking-tight text-white leading-none">
                Logística de Apoio de Escadas
              </h1>
              <span className="hidden sm:inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                PM Carmo - RJ
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-normal flex items-center gap-1.5 mt-0.5">
              <Shield className="w-3 h-3 text-emerald-400 shrink-0" />
              <span>Programa Municipal de Combate às Endemias</span>
            </p>
          </div>
        </div>

        {/* Segmented Control Corporativo */}
        <nav className="flex items-center bg-slate-800 p-1 rounded-lg border border-slate-700">
          <button
            type="button"
            onClick={() => setActiveTab('agente')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              activeTab === 'agente'
                ? 'bg-emerald-600 text-white shadow-xs font-semibold'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span className="hidden xs:inline">Agente em</span> Campo
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('central')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all relative ${
              activeTab === 'central'
                ? 'bg-emerald-600 text-white shadow-xs font-semibold'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <Truck className="w-3.5 h-3.5" />
            <span>Despacho</span>
            {countPendentes > 0 && (
              <span className="ml-1 px-1.5 py-0.2 bg-amber-500 text-slate-950 rounded-full text-[10px] font-bold">
                {countPendentes}
              </span>
            )}
          </button>
        </nav>
      </div>
    </header>
  );
}
