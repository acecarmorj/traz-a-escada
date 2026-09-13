import React from 'react';

export function BadgeStatus({ status }) {
  const configs = {
    solicitado: {
      label: 'Aguardando Escada',
      bg: 'bg-amber-100 text-amber-800 border-amber-300',
      dot: 'bg-amber-500 animate-ping'
    },
    a_caminho: {
      label: 'Escada a Caminho',
      bg: 'bg-blue-100 text-blue-800 border-blue-300',
      dot: 'bg-blue-500 animate-pulse'
    },
    entregue: {
      label: 'Entregue no Imóvel',
      bg: 'bg-emerald-100 text-emerald-800 border-emerald-300',
      dot: 'bg-emerald-500'
    },
    concluido: {
      label: 'Concluído / Recolhida',
      bg: 'bg-slate-100 text-slate-700 border-slate-300',
      dot: 'bg-slate-400'
    },
    cancelado: {
      label: 'Cancelado',
      bg: 'bg-rose-100 text-rose-700 border-rose-300',
      dot: 'bg-rose-400'
    }
  };

  const config = configs[status] || configs.solicitado;

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${config.bg}`}>
      <span className={`w-2 h-2 rounded-full ${config.dot}`} />
      {config.label}
    </span>
  );
}
