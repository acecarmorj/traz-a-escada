import React from 'react';
import { ShieldCheck, Truck, User } from 'lucide-react';

export function Header({ activeTab, setActiveTab, countPendentes }) {
  return (
    <header className="sticky top-0 z-30 bg-[#075E54] text-white shadow-md">
      <div className="max-w-2xl mx-auto px-3.5 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-full bg-[#25D366] text-slate-950 font-black flex items-center justify-center text-lg shadow-sm">
            🪜
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight text-white leading-tight">
              Traz a Escada
            </h1>
            <p className="text-[11px] text-emerald-100 font-medium flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-[#25D366] shrink-0" />
              <span>Programa Municipal de Combate às Endemias • Carmo - RJ</span>
            </p>
          </div>
        </div>

        {/* Alternador de Modo: Agente x Central estilo WhatsApp */}
        <nav className="flex items-center bg-[#054c44] p-0.5 rounded-full border border-emerald-700/60">
          <button
            type="button"
            onClick={() => setActiveTab('agente')}
            className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold transition-all ${
              activeTab === 'agente'
                ? 'bg-[#25D366] text-slate-950 shadow-xs'
                : 'text-emerald-200 hover:text-white'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Agente</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('central')}
            className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold transition-all relative ${
              activeTab === 'central'
                ? 'bg-[#25D366] text-slate-950 shadow-xs'
                : 'text-emerald-200 hover:text-white'
            }`}
          >
            <Truck className="w-3.5 h-3.5" />
            <span>Central</span>
            {countPendentes > 0 && (
              <span className="w-4 h-4 -top-1 -right-1 absolute bg-rose-600 text-white rounded-full text-[9px] flex items-center justify-center font-black animate-pulse shadow-xs">
                {countPendentes}
              </span>
            )}
          </button>
        </nav>
      </div>
    </header>
  );
}
