import React from 'react';
import { ShieldCheck, Truck, User } from 'lucide-react';

export function Header({ activeTab, setActiveTab, countPendentes }) {
  return (
    <header className="sticky top-0 z-30 bg-white border-b border-slate-200 shadow-xs">
      <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-amber-500 text-slate-950 font-black flex items-center justify-center text-xl shadow-inner">
            🪜
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-slate-900 leading-tight">
              Traz a Escada
            </h1>
            <p className="text-xs text-amber-700 font-semibold flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
              ACE Dengue • Carmo - RJ
            </p>
          </div>
        </div>

        {/* Alternador de Modo: Agente x Central */}
        <nav className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
          <button
            type="button"
            onClick={() => setActiveTab('agente')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'agente'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Agente</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('central')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all relative ${
              activeTab === 'central'
                ? 'bg-amber-500 text-slate-950 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Truck className="w-3.5 h-3.5" />
            <span>Central</span>
            {countPendentes > 0 && (
              <span className="w-5 h-5 -top-1 -right-1 absolute bg-rose-600 text-white rounded-full text-[10px] flex items-center justify-center font-black animate-pulse">
                {countPendentes}
              </span>
            )}
          </button>
        </nav>
      </div>
    </header>
  );
}
