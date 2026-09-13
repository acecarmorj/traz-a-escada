import React, { useState, useEffect } from 'react';
import { MapaPedidos } from '../../maps/MapaPedidos';
import { BadgeStatus } from '../../components/BadgeStatus';
import { 
  playNewRequestSound, playSuccessSound, 
  startAlarmLoop, stopAlarmLoop, setMuted, isAlarmMuted 
} from '../../lib/soundAlert';
import { 
  Navigation, Clock, Volume2, VolumeX, CheckCircle2, 
  Truck, MapPin, User, Home, BellRing, AlertCircle,
  Compass, Radio, X, Check
} from 'lucide-react';

export function PainelCentralScreen({ pedidos, onMudarStatus, driverPos }) {
  const [filtro, setFiltro] = useState('ativos'); // 'ativos' | 'todos'
  const [somSilenciado, setSomSilenciado] = useState(() => isAlarmMuted());

  const pendentes = (pedidos || []).filter(p => p.status === 'solicitado');
  const aCaminho = (pedidos || []).filter(p => p.status === 'a_caminho');
  const entregues = (pedidos || []).filter(p => p.status === 'entregue');

  // Controle do alarme sonoro
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

  const handleFecharOrdem = async (id) => {
    if (window.confirm('Deseja concluir e arquivar este chamado?')) {
      await onMudarStatus(id, 'concluido');
      playSuccessSound();
      stopAlarmLoop();
    }
  };

  const pedidosFiltrados = (pedidos || []).filter(p => {
    if (filtro === 'ativos') return p.status !== 'concluido' && p.status !== 'cancelado';
    return true;
  });

  return (
    <div className="max-w-md mx-auto space-y-3 pb-12 font-sans">
      {/* 1. ALERTA INSTITUCIONAL DE CHAMADO AGUARDANDO */}
      {pendentes.length > 0 && (
        <section className="bg-amber-500 text-slate-950 p-3 rounded-xl shadow-xs border border-amber-600 flex items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <BellRing className="w-5 h-5 animate-bounce shrink-0" />
            <div>
              <div className="text-xs font-black uppercase tracking-wide leading-tight">
                {pendentes.length} {pendentes.length === 1 ? 'Chamado Aguardando' : 'Chamados Aguardando'}
              </div>
              <div className="text-[11px] font-medium text-slate-900 leading-tight">
                Alarme sonoro ativo. Despache para atender.
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={toggleMute}
            className="px-2.5 py-1.5 bg-slate-950 text-white rounded-lg text-xs font-bold shrink-0 hover:bg-slate-800"
          >
            {somSilenciado ? 'Ativar Som' : 'Silenciar'}
          </button>
        </section>
      )}

      {/* 2. CABEÇALHO DO DESPACHO E CONTROLES */}
      <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Truck className="w-4 h-4 text-emerald-700" />
          <div>
            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wide leading-none">
              Despacho Operacional
            </h2>
            <span className="text-[10px] text-slate-500">
              {pedidosFiltrados.length} ordem(ns) no sistema
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={toggleMute}
            className={`p-1.5 rounded-lg text-xs font-semibold border flex items-center gap-1 ${
              somSilenciado 
                ? 'bg-slate-100 text-slate-500 border-slate-200' 
                : 'bg-emerald-50 text-emerald-800 border-emerald-200'
            }`}
            title={somSilenciado ? 'Alarme Silenciado' : 'Alarme Ativo'}
          >
            {somSilenciado ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            <span className="text-[10px]">{somSilenciado ? 'Mudo' : 'Som Ativo'}</span>
          </button>
        </div>
      </div>

      {/* 3. MAPA OPERACIONAL EMBUTIDO NO PRÓPRIO APLICATIVO DO MOTORISTA */}
      <section className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs space-y-1.5">
        <div className="flex items-center justify-between text-[11px] font-semibold text-slate-700 px-0.5">
          <span className="flex items-center gap-1">
            <Compass className="w-3.5 h-3.5 text-emerald-700" />
            <span>Mapa Operacional de Carmo (134 Quarteirões)</span>
          </span>
          <span className="text-[10px] text-slate-500 font-normal">
            {driverPos ? 'GPS Motorista Ativo' : 'Aguardando GPS Veículo'}
          </span>
        </div>

        {/* CONTAINER DO MAPA OTIMIZADO PARA MOBILE */}
        <div className="h-64 sm:h-72 w-full rounded-lg overflow-hidden border border-slate-200">
          <MapaPedidos
            pedidos={pedidosFiltrados}
            driverPos={driverPos}
            onMudarStatus={handleStatus}
          />
        </div>
      </section>

      {/* 4. FILA DE ORDENS DE SERVIÇO */}
      <section className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wide">
            Ordens de Serviço em Aberto
          </h3>
          <div className="flex gap-1 bg-slate-200 p-0.5 rounded text-[10px] font-semibold">
            <button
              onClick={() => setFiltro('ativos')}
              className={`px-2 py-0.5 rounded ${filtro === 'ativos' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600'}`}
            >
              Ativos ({pendentes.length + aCaminho.length + entregues.length})
            </button>
            <button
              onClick={() => setFiltro('todos')}
              className={`px-2 py-0.5 rounded ${filtro === 'todos' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600'}`}
            >
              Todos ({pedidos.length})
            </button>
          </div>
        </div>

        {pedidosFiltrados.length === 0 ? (
          <div className="bg-white rounded-xl p-6 text-center border border-slate-200 text-slate-500 text-xs">
            Nenhuma ordem de serviço pendente no momento.
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
              <article
                key={pedido.id}
                className={`bg-white rounded-xl p-3.5 border shadow-2xs space-y-2.5 transition-all ${
                  isPendente 
                    ? 'border-amber-400 bg-amber-50/20 ring-1 ring-amber-300' 
                    : pedido.status === 'a_caminho'
                    ? 'border-blue-300 bg-blue-50/20'
                    : pedido.status === 'entregue'
                    ? 'border-emerald-300 bg-emerald-50/20'
                    : 'border-slate-200'
                }`}
              >
                {/* Topo do Card com Botão Fechar */}
                <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-xs text-slate-900">{pedido.agente_nome}</span>
                    <span className="text-[10px] text-slate-400">às {horaFormatada}</span>
                  </div>
                  
                  <div className="flex items-center gap-1.5">
                    <BadgeStatus status={pedido.status} />
                    {/* BOTÃO FECHAR / ARQUIVAR */}
                    <button
                      type="button"
                      onClick={() => handleFecharOrdem(pedido.id)}
                      className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-slate-100"
                      title="Fechar e arquivar ordem"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Dados do Imóvel */}
                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-xs space-y-1 text-slate-800">
                  <div className="font-semibold text-slate-900 flex items-center gap-1">
                    <Home className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span>Morador: <strong>{pedido.morador_nome || 'Não informado'}</strong></span>
                  </div>

                  <div className="text-slate-700 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span>{pedido.rua} {pedido.numero && `nº ${pedido.numero}`}</span>
                  </div>

                  <div className="text-[11px] text-slate-600 flex items-center gap-2 pt-0.5">
                    <span className="bg-white px-1.5 py-0.5 rounded border border-slate-200 font-medium">
                      Quarteirão: <strong>{pedido.quarteirao}</strong>
                    </span>
                    <span className="bg-white px-1.5 py-0.5 rounded border border-slate-200 font-medium">
                      Microárea: <strong>{pedido.microarea}</strong>
                    </span>
                  </div>

                  {pedido.referencia && (
                    <div className="text-[11px] text-slate-600 pt-0.5">
                      <strong>Ref:</strong> {pedido.referencia}
                    </div>
                  )}
                </div>

                {/* Botões de Ação Ergonômicos para Celular */}
                <div className="grid grid-cols-2 gap-2">
                  <a
                    href={gmapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="h-11 bg-slate-100 active:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 border border-slate-300 shadow-2xs"
                  >
                    <Navigation className="w-3.5 h-3.5 text-blue-600" />
                    <span>Google Maps</span>
                  </a>

                  <a
                    href={wazeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="h-11 bg-slate-100 active:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 border border-slate-300 shadow-2xs"
                  >
                    <Navigation className="w-3.5 h-3.5 text-cyan-600" />
                    <span>Waze</span>
                  </a>

                  {/* Ação Primária de Status */}
                  <div className="col-span-2">
                    {isPendente && (
                      <button
                        type="button"
                        onClick={() => handleStatus(pedido.id, 'a_caminho')}
                        className="w-full h-11 bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 text-white font-bold rounded-lg text-xs uppercase tracking-wider transition-all shadow-xs flex items-center justify-center gap-1.5 border border-emerald-800"
                      >
                        <Truck className="w-4 h-4" />
                        <span>Despachar / A Caminho</span>
                      </button>
                    )}

                    {pedido.status === 'a_caminho' && (
                      <button
                        type="button"
                        onClick={() => handleStatus(pedido.id, 'entregue')}
                        className="w-full h-11 bg-blue-700 hover:bg-blue-800 active:bg-blue-900 text-white font-bold rounded-lg text-xs uppercase tracking-wider transition-all shadow-xs flex items-center justify-center gap-1.5 border border-blue-800"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Confirmar Entrega</span>
                      </button>
                    )}

                    {pedido.status === 'entregue' && (
                      <button
                        type="button"
                        onClick={() => handleStatus(pedido.id, 'concluido')}
                        className="w-full h-11 bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white font-bold rounded-lg text-xs uppercase tracking-wider transition-all shadow-xs flex items-center justify-center gap-1.5 border border-slate-800"
                      >
                        <Check className="w-4 h-4 text-emerald-400" />
                        <span>Concluir e Arquivar</span>
                      </button>
                    )}
                  </div>
                </div>
              </article>
            );
          })
        )}
      </section>
    </div>
  );
}
