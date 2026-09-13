import React, { useState, useEffect } from 'react';
import { MapaPedidos } from '../../maps/MapaPedidos';
import { BadgeStatus } from '../../components/BadgeStatus';
import { 
  playNewRequestSound, playSuccessSound, 
  startAlarmLoop, stopAlarmLoop, setMuted, isAlarmMuted 
} from '../../lib/soundAlert';
import { 
  Navigation, Clock, Volume2, VolumeX, CheckCircle, 
  Truck, MapPin, User, Home, BellRing, AlertCircle 
} from 'lucide-react';

export function PainelCentralScreen({ pedidos, onMudarStatus, driverPos }) {
  const [filtro, setFiltro] = useState('ativos'); // 'ativos' | 'todos'
  const [somSilenciado, setSomSilenciado] = useState(() => isAlarmMuted());

  const pendentes = (pedidos || []).filter(p => p.status === 'solicitado');
  const aCaminho = (pedidos || []).filter(p => p.status === 'a_caminho');
  const entregues = (pedidos || []).filter(p => p.status === 'entregue');

  // Controle de alarme sonoro quando há pedidos pendentes
  useEffect(() => {
    if (pendentes.length > 0 && !somSilenciado) {
      startAlarmLoop();
    } else {
      stopAlarmLoop();
    }
    return () => stopAlarmLoop();
  }, [pendentes.length, somSilenciado]);

  const toggleMute = () => {
    const novo = !somSilenciado;
    setSomSilenciado(novo);
    setMuted(novo);
  };

  const handleStatus = async (id, status) => {
    await onMudarStatus(id, status);
    playSuccessSound();
    if (status === 'a_caminho' || status === 'concluido') {
      stopAlarmLoop();
    }
  };

  const pedidosFiltrados = (pedidos || []).filter(p => {
    if (filtro === 'ativos') return p.status !== 'concluido' && p.status !== 'cancelado';
    return true;
  });

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      {/* ALERTA VISUAL E SONORO SE HOUVER PEDIDO PENDENTE */}
      {pendentes.length > 0 && (
        <div className="bg-rose-500 text-white p-4 rounded-2xl shadow-lg animate-pulse flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <BellRing className="w-6 h-6 animate-bounce shrink-0" />
            <div>
              <div className="text-sm font-black uppercase tracking-wider">
                {pendentes.length} {pendentes.length === 1 ? 'Pedido de Escada Aguardando!' : 'Pedidos de Escada Aguardando!'}
              </div>
              <div className="text-xs opacity-90 font-bold">
                Alarme sonoro ativo. Clique em "Saí para Entregar" para atender.
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={toggleMute}
            className="bg-white text-rose-700 px-3 py-1.5 rounded-xl text-xs font-black hover:bg-rose-100 shrink-0"
          >
            {somSilenciado ? 'Ativar Som' : 'Silenciar Alarme'}
          </button>
        </div>
      )}

      {/* BARRA DE STATS RÁPIDOS */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        <div className="bg-amber-50 border-2 border-amber-400 p-3 rounded-2xl flex flex-col items-center text-center shadow-xs">
          <span className="text-2xl sm:text-3xl font-black text-amber-900">{pendentes.length}</span>
          <span className="text-[11px] sm:text-xs font-bold text-amber-800 uppercase tracking-tight">Aguardando</span>
        </div>
        <div className="bg-blue-50 border-2 border-blue-400 p-3 rounded-2xl flex flex-col items-center text-center shadow-xs">
          <span className="text-2xl sm:text-3xl font-black text-blue-900">{aCaminho.length}</span>
          <span className="text-[11px] sm:text-xs font-bold text-blue-800 uppercase tracking-tight">A Caminho</span>
        </div>
        <div className="bg-emerald-50 border-2 border-emerald-400 p-3 rounded-2xl flex flex-col items-center text-center shadow-xs">
          <span className="text-2xl sm:text-3xl font-black text-emerald-900">{entregues.length}</span>
          <span className="text-[11px] sm:text-xs font-bold text-emerald-800 uppercase tracking-tight">Entregues</span>
        </div>
      </div>

      {/* CONTROLE DE SOM E STATUS */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
          <span className="text-xs font-bold text-slate-800">Monitoramento Ativo em Carmo - RJ</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={playNewRequestSound}
            className="text-xs font-bold px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg flex items-center gap-1.5 transition-all border border-slate-200"
          >
            <BellRing className="w-3.5 h-3.5 text-amber-600" />
            Testar Alarme
          </button>
          <button
            type="button"
            onClick={toggleMute}
            className={`text-xs font-bold px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 transition-all border ${
              somSilenciado 
                ? 'bg-rose-50 text-rose-700 border-rose-200' 
                : 'bg-emerald-50 text-emerald-800 border-emerald-200'
            }`}
          >
            {somSilenciado ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
            {somSilenciado ? 'Mudo' : 'Som Ligado'}
          </button>
        </div>
      </div>

      {/* MAPA INTERATIVO COM OS 134 POLÍGONOS DE CARMO */}
      <div className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-200 shadow-xs space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-black text-slate-900 flex items-center gap-1.5 uppercase tracking-wide">
            <MapPin className="w-4 h-4 text-rose-600" />
            Mapa com Polígonos de Carmo e Chamados
          </h2>
          <span className="text-[11px] font-bold text-slate-500">
            {pedidosFiltrados.length} {pedidosFiltrados.length === 1 ? 'chamado' : 'chamados'}
          </span>
        </div>
        <MapaPedidos
          pedidos={pedidosFiltrados}
          driverPos={driverPos}
          onMudarStatus={handleStatus}
        />
      </div>

      {/* FILTROS E LISTA COMPLETA DE CHAMADOS */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">
            Fila de Atendimento aos Agentes
          </h3>
          <div className="flex gap-1 bg-slate-200 p-0.5 rounded-lg text-xs font-bold">
            <button
              onClick={() => setFiltro('ativos')}
              className={`px-3 py-1 rounded-md transition-all ${
                filtro === 'ativos' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
              }`}
            >
              Ativos ({pendentes.length + aCaminho.length + entregues.length})
            </button>
            <button
              onClick={() => setFiltro('todos')}
              className={`px-3 py-1 rounded-md transition-all ${
                filtro === 'todos' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
              }`}
            >
              Todos ({pedidos.length})
            </button>
          </div>
        </div>

        {pedidosFiltrados.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center border border-slate-200 text-slate-500 text-sm">
            Nenhum pedido de escada no momento.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {pedidosFiltrados.map((pedido) => {
              const gmapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${pedido.latitude},${pedido.longitude}`;
              const wazeUrl = `https://waze.com/ul?ll=${pedido.latitude},${pedido.longitude}&navigate=yes`;

              return (
                <div
                  key={pedido.id}
                  className={`bg-white rounded-2xl p-4 border-2 shadow-xs space-y-3 transition-all ${
                    pedido.status === 'solicitado'
                      ? 'border-amber-400 bg-amber-50/30 ring-2 ring-amber-300'
                      : pedido.status === 'a_caminho'
                      ? 'border-blue-400 bg-blue-50/30'
                      : pedido.status === 'entregue'
                      ? 'border-emerald-400 bg-emerald-50/20'
                      : 'border-slate-200'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2">
                    <div>
                      <div className="text-base font-black text-slate-900 flex items-center gap-1.5">
                        <span className="text-xl">🪜</span>
                        <span>{pedido.agente_nome}</span>
                      </div>
                      {pedido.morador_nome && (
                        <div className="text-xs font-bold text-slate-600 flex items-center gap-1 mt-0.5">
                          <Home className="w-3.5 h-3.5 text-slate-400" />
                          Morador: <span className="text-slate-900 font-black">{pedido.morador_nome}</span>
                        </div>
                      )}
                    </div>
                    <BadgeStatus status={pedido.status} />
                  </div>

                  {/* ENDEREÇO COMPLETO: RUA, NÚMERO, BAIRRO */}
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-xs space-y-1">
                    <div className="font-bold text-slate-900 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                      <span>
                        {pedido.rua ? `${pedido.rua}${pedido.numero ? `, ${pedido.numero}` : ''}` : 'Rua a confirmar'} 
                        {pedido.bairro ? ` - Bairro: ${pedido.bairro}` : ''}
                      </span>
                    </div>

                    <div className="font-black text-amber-950 flex items-center gap-2 pt-0.5">
                      <span className="bg-amber-200 px-2 py-0.5 rounded text-[11px]">
                        Microárea: {pedido.microarea}
                      </span>
                      <span className="bg-amber-300 px-2 py-0.5 rounded text-[11px]">
                        {pedido.quarteirao}
                      </span>
                    </div>
                  </div>

                  {pedido.referencia && (
                    <div className="text-xs bg-amber-50/80 p-2 rounded-lg text-slate-800 border border-amber-200">
                      <strong>Ref:</strong> {pedido.referencia}
                    </div>
                  )}

                  <div className="text-[11px] text-slate-500 flex items-center justify-between pt-1">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(pedido.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <span>GPS: ±{pedido.precisao_gps || 10}m</span>
                  </div>

                  {/* BOTÕES DE NAVEGAÇÃO DIRETA (GOOGLE MAPS / WAZE) */}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <a
                      href={gmapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-1.5 py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black shadow-xs transition-all cursor-pointer"
                    >
                      <Navigation className="w-3.5 h-3.5" />
                      Google Maps
                    </a>
                    <a
                      href={wazeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-1.5 py-2 px-3 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl text-xs font-black shadow-xs transition-all cursor-pointer"
                    >
                      <span>🚗</span>
                      Waze
                    </a>
                  </div>

                  {/* BOTÕES DE TRANSIÇÃO DE STATUS */}
                  <div className="border-t border-slate-100 pt-2 flex items-center gap-2">
                    {pedido.status === 'solicitado' && (
                      <button
                        type="button"
                        onClick={() => handleStatus(pedido.id, 'a_caminho')}
                        className="flex-1 py-2.5 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer"
                      >
                        <Truck className="w-4 h-4" />
                        Saí para Entregar (A Caminho)
                      </button>
                    )}

                    {pedido.status === 'a_caminho' && (
                      <button
                        type="button"
                        onClick={() => handleStatus(pedido.id, 'entregue')}
                        className="flex-1 py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer"
                      >
                        <CheckCircle className="w-4 h-4" />
                        Marcar como Entregue no Local
                      </button>
                    )}

                    {pedido.status === 'entregue' && (
                      <button
                        type="button"
                        onClick={() => handleStatus(pedido.id, 'concluido')}
                        className="flex-1 py-2.5 px-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer"
                      >
                        <CheckCircle className="w-4 h-4 text-emerald-400" />
                        Recolhida / Finalizar Chamado
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
