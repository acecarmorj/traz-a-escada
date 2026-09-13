import React, { useState, useEffect } from 'react';
import { MapaPedidos } from '../../maps/MapaPedidos';
import { BadgeStatus } from '../../components/BadgeStatus';
import { 
  playNewRequestSound, playSuccessSound, 
  startAlarmLoop, stopAlarmLoop, setMuted, isAlarmMuted 
} from '../../lib/soundAlert';
import { 
  Navigation, Clock, Volume2, VolumeX, CheckCircle, 
  Truck, MapPin, User, Home, BellRing, AlertCircle,
  MessageSquare, Compass, CheckCheck
} from 'lucide-react';

export function PainelCentralScreen({ pedidos, onMudarStatus, driverPos }) {
  const [abaCentral, setAbaCentral] = useState('mensagens'); // 'mensagens' | 'mapa'
  const [filtro, setFiltro] = useState('ativos'); // 'ativos' | 'todos'
  const [somSilenciado, setSomSilenciado] = useState(() => isAlarmMuted());

  const pendentes = (pedidos || []).filter(p => p.status === 'solicitado');
  const aCaminho = (pedidos || []).filter(p => p.status === 'a_caminho');
  const entregues = (pedidos || []).filter(p => p.status === 'entregue');

  // Controle de alarme sonoro contínuo quando há pedidos pendentes
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
    <div className="max-w-2xl mx-auto space-y-3 pb-8">
      {/* 1. ALERTA VISUAL E SONORO DE PEDIDO PENDENTE (ESTILO WHATSAPP) */}
      {pendentes.length > 0 && (
        <div className="bg-rose-600 text-white p-3.5 rounded-2xl shadow-md animate-pulse flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <BellRing className="w-5 h-5 animate-bounce shrink-0 text-white" />
            <div>
              <div className="text-xs font-black uppercase tracking-wider">
                {pendentes.length} {pendentes.length === 1 ? 'PEDIDO DE ESCADA AGUARDANDO!' : 'PEDIDOS DE ESCADA AGUARDANDO!'}
              </div>
              <div className="text-[11px] opacity-95">
                Alarme tocando. Toque em "A Caminho" para atender.
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={toggleMute}
            className="bg-white text-rose-700 px-3 py-1.5 rounded-xl text-xs font-black hover:bg-rose-50 shrink-0 shadow-xs"
          >
            {somSilenciado ? 'Ligar Som' : 'Silenciar'}
          </button>
        </div>
      )}

      {/* 2. BARRA DE STATUS / CONTROLE WHATSAPP */}
      <div className="bg-white p-2.5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
        {/* Alternador de Visão: Lista x Mapa */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setAbaCentral('mensagens')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              abaCentral === 'mensagens'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5 text-[#128C7E]" />
            <span>Chamados ({pedidosFiltrados.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setAbaCentral('mapa')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              abaCentral === 'mapa'
                ? 'bg-[#128C7E] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Mapa Polígonos</span>
          </button>
        </div>

        {/* Teste de Som e Silenciador */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={toggleMute}
            className={`p-2 rounded-xl text-xs font-bold transition-all border ${
              somSilenciado 
                ? 'bg-rose-50 text-rose-700 border-rose-200' 
                : 'bg-emerald-50 text-emerald-800 border-emerald-200'
            }`}
            title={somSilenciado ? 'Alarme Silenciado' : 'Alarme Ativo'}
          >
            {somSilenciado ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 text-[#25D366]" />}
          </button>
        </div>
      </div>

      {/* 3. VISÃO DO MAPA DE CARMO COM OS 134 POLÍGONOS */}
      {abaCentral === 'mapa' && (
        <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-700">
            <span className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-rose-600" />
              134 Quarteirões Oficiais de Carmo
            </span>
            <span className="text-[11px] text-slate-500">
              {pedidosFiltrados.length} local(is) no mapa
            </span>
          </div>
          <div className="h-[360px] w-full rounded-xl overflow-hidden">
            <MapaPedidos
              pedidos={pedidosFiltrados}
              driverPos={driverPos}
              onMudarStatus={handleStatus}
            />
          </div>
        </div>
      )}

      {/* 4. VISÃO DE CHAMADOS: BALÕES ESTILO WHATSAPP */}
      {abaCentral === 'mensagens' && (
        <div className="space-y-2.5">
          {pedidosFiltrados.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 text-center border border-slate-200 text-slate-500 text-xs">
              <span className="text-3xl block mb-2">🎉</span>
              Nenhum pedido de escada aguardando no momento.
            </div>
          ) : (
            pedidosFiltrados.map((pedido) => {
              const gmapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${pedido.latitude},${pedido.longitude}`;
              const wazeUrl = `https://waze.com/ul?ll=${pedido.latitude},${pedido.longitude}&navigate=yes`;

              const horaFormatada = pedido.created_at 
                ? new Date(pedido.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
                : '';

              const isPendente = pedido.status === 'solicitado';

              return (
                <div
                  key={pedido.id}
                  className={`bg-white rounded-2xl p-3.5 border shadow-xs space-y-2.5 transition-all ${
                    isPendente 
                      ? 'border-amber-400 bg-[#FFFDF5] ring-2 ring-amber-300' 
                      : pedido.status === 'a_caminho'
                      ? 'border-blue-300 bg-blue-50/20'
                      : pedido.status === 'entregue'
                      ? 'border-emerald-300 bg-emerald-50/20'
                      : 'border-slate-200'
                  }`}
                >
                  {/* Topo do Balão: Agente + Horário */}
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 font-black text-slate-900">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#25D366]" />
                      <span className="text-sm">{pedido.agente_nome || 'Agente'}</span>
                    </div>
                    <div className="flex items-center gap-1 text-[11px] text-slate-500">
                      <span>{horaFormatada}</span>
                      <CheckCheck className="w-3.5 h-3.5 text-[#53bdeb]" />
                    </div>
                  </div>

                  {/* Informações do Morador e Local */}
                  <div className="bg-[#F0F2F5] p-2.5 rounded-xl text-xs space-y-1 text-slate-800">
                    <div className="font-bold text-slate-900 flex items-center gap-1">
                      <span>🏠 Morador:</span>
                      <span className="text-sm font-black text-[#075E54]">
                        {pedido.morador_nome || 'Não informado'}
                      </span>
                    </div>

                    <div className="font-semibold text-slate-800 flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                      <span>{pedido.rua} {pedido.numero && `nº ${pedido.numero}`}</span>
                    </div>

                    <div className="text-[11px] font-bold text-slate-600 flex items-center gap-2 pt-0.5">
                      <span className="bg-white px-2 py-0.5 rounded border border-slate-200">
                        {pedido.quarteirao}
                      </span>
                      <span className="bg-white px-2 py-0.5 rounded border border-slate-200">
                        Microárea: {pedido.microarea}
                      </span>
                    </div>

                    {pedido.referencia && (
                      <div className="text-[11px] text-slate-600 italic pt-0.5">
                        📝 Ref: {pedido.referencia}
                      </div>
                    )}
                  </div>

                  {/* Botões de Ação e Rota GPS */}
                  <div className="flex items-center gap-2 pt-0.5">
                    {/* Botão Google Maps */}
                    <a
                      href={gmapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold text-center flex items-center justify-center gap-1 transition-all border border-slate-200"
                    >
                      <Navigation className="w-3.5 h-3.5 text-blue-600" />
                      <span>Google Maps</span>
                    </a>

                    {/* Botão Waze */}
                    <a
                      href={wazeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold text-center flex items-center justify-center gap-1 transition-all border border-slate-200"
                    >
                      <span className="text-xs">🚙</span>
                      <span>Waze</span>
                    </a>

                    {/* Botão de Avançar Status */}
                    {isPendente && (
                      <button
                        type="button"
                        onClick={() => handleStatus(pedido.id, 'a_caminho')}
                        className="flex-1 py-2 bg-[#25D366] hover:bg-[#1EBE5D] text-slate-950 font-black rounded-xl text-xs transition-all shadow-xs flex items-center justify-center gap-1"
                      >
                        <span>🚚 A Caminho</span>
                      </button>
                    )}

                    {pedido.status === 'a_caminho' && (
                      <button
                        type="button"
                        onClick={() => handleStatus(pedido.id, 'entregue')}
                        className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl text-xs transition-all shadow-xs flex items-center justify-center gap-1"
                      >
                        <span>🪜 Entregue</span>
                      </button>
                    )}

                    {pedido.status === 'entregue' && (
                      <button
                        type="button"
                        onClick={() => handleStatus(pedido.id, 'concluido')}
                        className="flex-1 py-2 bg-[#075E54] hover:bg-[#064e46] text-white font-black rounded-xl text-xs transition-all shadow-xs flex items-center justify-center gap-1"
                      >
                        <span>✓ Concluir</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
