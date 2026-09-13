import React, { useState, useEffect, useRef } from 'react';
import { MapaGrandeSuporte } from '../../maps/MapaGrandeSuporte';
import { BadgeStatus } from '../../components/BadgeStatus';
import { 
  playNewRequestSound, playSuccessSound, 
  stopAlarmLoop, setMuted, isAlarmMuted 
} from '../../lib/soundAlert';
import {
  startBackgroundSupervisor, stopBackgroundSupervisor,
  requestNotificationPermission, requestScreenWakeLock
} from '../../lib/backgroundAlertService';
import { api } from '../../lib/api';
import { 
  Navigation, Clock, Volume2, VolumeX, CheckCircle2, 
  Truck, MapPin, User, Home, BellRing, AlertCircle,
  Compass, Radio, X, Check, Bell, Power, ChevronRight, ChevronLeft
} from 'lucide-react';

const OPCOES_DESFECHO = [
  { id: 'Inspecionada Negativa (Sem Foco)', label: 'Inspecionada Negativa (Sem Foco)', cor: 'text-emerald-700 bg-emerald-50 border-emerald-300' },
  { id: 'Foco Encontrado (Positiva com Larvas)', label: 'Foco Encontrado (Positiva com Larvas)', cor: 'text-rose-700 bg-rose-50 border-rose-300' },
  { id: 'Tratada com Larvicida', label: 'Tratada com Larvicida', cor: 'text-blue-700 bg-blue-50 border-blue-300' },
  { id: 'Caixa Vedada / Telada', label: 'Caixa Vedada / Telada', cor: 'text-amber-700 bg-amber-50 border-amber-300' },
  { id: 'Sem Acesso / Imóvel Fechado', label: 'Sem Acesso / Imóvel Fechado', cor: 'text-slate-700 bg-slate-50 border-slate-300' },
];

export function PainelCentralScreen({ pedidos, onMudarStatus, driverPos }) {
  const [online, setOnline] = useState(true);
  const [somSilenciado, setSomSilenciado] = useState(() => isAlarmMuted());
  const [segundoPlanoAtivo, setSegundoPlanoAtivo] = useState(false);
  const [pedidoFocadoIndex, setPedidoFocadoIndex] = useState(0);

  // Modal de Desfecho da Visita
  const [modalDesfechoAberto, setModalDesfechoAberto] = useState(false);
  const [pedidoFinalizando, setPedidoFinalizando] = useState(null);
  const [opcaoSelecionada, setOpcaoSelecionada] = useState(OPCOES_DESFECHO[0].id);
  const [observacaoDesfecho, setObservacaoDesfecho] = useState('');

  const pedidosRef = useRef(pedidos);
  pedidosRef.current = pedidos;

  const pedidosAtivos = (pedidos || []).filter(
    (p) => p.status === 'solicitado' || p.status === 'a_caminho' || p.status === 'entregue'
  );

  const pendentes = pedidosAtivos.filter((p) => p.status === 'solicitado');

  // Supervisor em segundo plano com alertas a cada pedido e a cada 1 minuto
  useEffect(() => {
    if (!online) {
      stopBackgroundSupervisor();
      stopAlarmLoop();
      return;
    }

    startBackgroundSupervisor({
      getPedidosAtuais: () => pedidosRef.current,
      onPedidosAtualizados: () => {}
    });

    requestNotificationPermission().then((granted) => {
      setSegundoPlanoAtivo(granted);
    });
    requestScreenWakeLock();

    return () => {
      stopBackgroundSupervisor();
    };
  }, [online]);

  // Alerta sonoro imediato se houver pedido pendente e estiver online
  useEffect(() => {
    if (online && pendentes.length > 0 && !somSilenciado) {
      playNewRequestSound();
    }
  }, [pendentes.length, somSilenciado, online]);

  // Transmissão contínua do GPS do motorista para o Cloudflare D1
  useEffect(() => {
    if (!online || !driverPos?.latitude || !driverPos?.longitude) return;

    const pedidosEmTransito = (pedidos || []).filter(
      (p) => p.status === 'a_caminho' || p.status === 'solicitado'
    );

    if (pedidosEmTransito.length === 0) return;

    pedidosEmTransito.forEach((p) => {
      api.atualizarGpsMotorista(p.id, driverPos.latitude, driverPos.longitude, 'Suporte Escada');
    });
  }, [driverPos?.latitude, driverPos?.longitude, online, pedidos]);

  const toggleOnline = () => {
    const novo = !online;
    setOnline(novo);
    if (!novo) {
      stopAlarmLoop();
    }
  };

  const toggleMute = () => {
    const novo = !somSilenciado;
    setSomSilenciado(novo);
    setMuted(novo);
  };

  const ativarSegundoPlanoManual = async () => {
    const ok = await requestNotificationPermission();
    setSegundoPlanoAtivo(ok);
    await requestScreenWakeLock();
    if (ok) {
      alert('Alertas em segundo plano ativos! O aparelho tocará mesmo com tela apagada a cada 1 minuto.');
    } else {
      alert('Permissão de notificações não concedida.');
    }
  };

  const handleStatus = async (id, status, dadosExtras = {}) => {
    await onMudarStatus(id, status, dadosExtras);
    playSuccessSound();
    if (status === 'a_caminho' || status === 'concluido' || status === 'cancelado') {
      stopAlarmLoop();
    }
  };

  const handleAbrirDesfecho = (pedido) => {
    setPedidoFinalizando(pedido);
    setOpcaoSelecionada(OPCOES_DESFECHO[0].id);
    setObservacaoDesfecho('');
    setModalDesfechoAberto(true);
  };

  const handleConfirmarDesfecho = async () => {
    if (!pedidoFinalizando) return;
    await handleStatus(pedidoFinalizando.id, 'concluido', {
      resultado_visita: opcaoSelecionada,
      observacao_desfecho: observacaoDesfecho.trim() || null,
      finalizado_por: 'Equipe da Escada'
    });
    setModalDesfechoAberto(false);
    setPedidoFinalizando(null);
  };

  const handleFecharOrdem = async (id) => {
    await onMudarStatus(id, 'cancelado');
    playSuccessSound();
    stopAlarmLoop();
  };

  // Pedido focado no card inferior
  const pedidoFocado = pedidosAtivos[pedidoFocadoIndex] || pedidosAtivos[0] || null;

  return (
    <div className="relative w-full h-full flex flex-col overflow-hidden font-sans select-none">
      {/* 1. MAPA GRANDE EM TELA CHEIA (ESTILO MOTOJAGEMINI) */}
      <div className="absolute inset-0 z-0">
        <MapaGrandeSuporte
          pedidos={pedidos}
          driverPos={driverPos}
          pedidoFocadoId={pedidoFocado?.id}
          onSelecionarPedido={(id) => {
            const idx = pedidosAtivos.findIndex((p) => p.id === id);
            if (idx !== -1) setPedidoFocadoIndex(idx);
          }}
        />
      </div>

      {/* 2. HEADER FLUTUANTE SUPERIOR COM BOTÃO FICAR ONLINE/OFFLINE (ESTILO MOTOJA) */}
      <header className="absolute top-2.5 left-3 right-3 z-20 flex items-center justify-between pointer-events-none">
        {/* BOTÃO FICAR ONLINE / OFFLINE */}
        <button
          type="button"
          onClick={toggleOnline}
          className={`px-3 py-1.5 rounded-full border shadow-md flex items-center gap-2 text-xs font-black tracking-wide pointer-events-auto transition-transform active:scale-95 ${
            online
              ? 'bg-emerald-600 text-white border-emerald-700'
              : 'bg-slate-900 text-slate-300 border-slate-700'
          }`}
        >
          <span className={`w-2.5 h-2.5 rounded-full ${online ? 'bg-white animate-pulse' : 'bg-slate-500'}`} />
          <span>{online ? 'ONLINE' : 'OFFLINE'}</span>
        </button>

        {/* CONTROLES DE ALARME E 2º PLANO */}
        <div className="flex items-center gap-1.5 pointer-events-auto">
          <button
            type="button"
            onClick={ativarSegundoPlanoManual}
            className={`p-2 rounded-full border shadow-sm backdrop-blur-md ${
              segundoPlanoAtivo
                ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                : 'bg-white/90 text-amber-800 border-amber-300'
            }`}
            title="Alertas em 2º plano (tela bloqueada)"
          >
            <Bell className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={toggleMute}
            className={`p-2 rounded-full border shadow-sm backdrop-blur-md ${
              somSilenciado
                ? 'bg-slate-100 text-slate-400 border-slate-300'
                : 'bg-white/90 text-emerald-800 border-emerald-300'
            }`}
            title={somSilenciado ? 'Som silenciado' : 'Som ativo'}
          >
            {somSilenciado ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </header>

      {/* 3. ALERTA DE CHAMADOS PENDENTES (REPETE A CADA 1 MINUTO) */}
      {online && pendentes.length > 0 && (
        <div className="absolute top-12 left-3 right-3 z-20 pointer-events-none">
          <div className="bg-amber-500 text-slate-950 px-3 py-1.5 rounded-xl shadow-lg border border-amber-600 flex items-center justify-between pointer-events-auto">
            <div className="flex items-center gap-2 text-xs font-black uppercase">
              <BellRing className="w-4 h-4 animate-bounce shrink-0" />
              <span>{pendentes.length} {pendentes.length === 1 ? 'Chamado Aguardando Despacho' : 'Chamados Aguardando Despacho'}</span>
            </div>
            <button
              type="button"
              onClick={toggleMute}
              className="px-2 py-0.5 bg-slate-950 text-white rounded text-[10px] font-bold"
            >
              {somSilenciado ? 'Som On' : 'Mudo'}
            </button>
          </div>
        </div>
      )}

      {/* 4. CARD FLUTUANTE NA BASE (ESTILO BOTTOM SHEET DO MOTOJA) */}
      <div className="absolute left-0 right-0 bottom-0 z-30 p-3 sm:p-4 max-w-md mx-auto w-full pointer-events-none">
        <div className="bg-white/98 backdrop-blur-md rounded-2xl shadow-xl border border-slate-200 p-3.5 space-y-3 pointer-events-auto max-h-[75dvh] overflow-y-auto">
          
          {/* SE ESTIVER OFFLINE */}
          {!online ? (
            <div className="text-center py-4 space-y-3">
              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
                <Power className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">Você está Offline</h3>
                <p className="text-xs text-slate-500">Fique online para receber ordens de escada em tempo real.</p>
              </div>
              <button
                type="button"
                onClick={toggleOnline}
                className="w-full h-12 bg-emerald-700 hover:bg-emerald-800 text-white font-black rounded-xl text-xs uppercase tracking-wide transition-all shadow-md active:scale-98"
              >
                FICAR ONLINE AGORA
              </button>
            </div>
          ) : pedidosAtivos.length === 0 ? (
            /* SE ESTIVER ONLINE SEM CHAMADOS */
            <div className="text-center py-4 space-y-1.5">
              <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
                <Check className="w-5 h-5" />
              </div>
              <h3 className="text-xs font-bold text-slate-800">Pronto para Atendimento</h3>
              <p className="text-[11px] text-slate-500">Aguardando solicitações de escada dos agentes de campo.</p>
            </div>
          ) : (
            /* SE HOUVER CHAMADOS ATIVOS */
            <div className="space-y-2.5">
              {/* Seletor entre pedidos se houver mais de 1 */}
              {pedidosAtivos.length > 1 && (
                <div className="flex items-center justify-between bg-slate-100 p-1 rounded-lg text-xs font-bold text-slate-700">
                  <button
                    type="button"
                    disabled={pedidoFocadoIndex === 0}
                    onClick={() => setPedidoFocadoIndex((prev) => Math.max(0, prev - 1))}
                    className="p-1 rounded hover:bg-white disabled:opacity-30"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span>Ordem {pedidoFocadoIndex + 1} de {pedidosAtivos.length}</span>
                  <button
                    type="button"
                    disabled={pedidoFocadoIndex === pedidosAtivos.length - 1}
                    onClick={() => setPedidoFocadoIndex((prev) => Math.min(pedidosAtivos.length - 1, prev + 1))}
                    className="p-1 rounded hover:bg-white disabled:opacity-30"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Cabeçalho do Card com Botão Fechar */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <div className="flex items-center gap-2">
                  <BadgeStatus status={pedidoFocado.status} />
                  <span className="text-xs font-bold text-slate-900">{pedidoFocado.agente_nome}</span>
                </div>

                {/* BOTÃO FECHAR CHAMADO */}
                <button
                  type="button"
                  onClick={() => handleFecharOrdem(pedidoFocado.id)}
                  className="flex items-center gap-1 text-[11px] font-bold text-slate-400 hover:text-rose-600 px-2 py-0.5 rounded hover:bg-slate-100"
                  title="Fechar / dispensar ordem"
                >
                  <X className="w-4 h-4" />
                  <span>Fechar</span>
                </button>
              </div>

              {/* Dados do Imóvel */}
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-xs space-y-1 text-slate-800">
                <div className="font-bold text-slate-900 flex items-center gap-1.5">
                  <Home className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <span>Morador: {pedidoFocado.morador_nome || 'Não informado'}</span>
                </div>
                <div className="flex items-center gap-1.5 text-slate-700">
                  <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>{pedidoFocado.rua} {pedidoFocado.numero && `nº ${pedidoFocado.numero}`}</span>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-slate-600 pt-0.5">
                  <span className="bg-white px-2 py-0.5 rounded border border-slate-200 font-bold text-emerald-800">
                    {pedidoFocado.quarteirao}
                  </span>
                  <span className="bg-white px-2 py-0.5 rounded border border-slate-200 font-medium text-slate-700">
                    {pedidoFocado.microarea}
                  </span>
                </div>
                {pedidoFocado.referencia && (
                  <div className="text-[11px] text-slate-500">
                    <strong>Ref:</strong> {pedidoFocado.referencia}
                  </div>
                )}
              </div>

              {/* Botões de Rota Externa e Ação Primária Touch */}
              <div className="grid grid-cols-2 gap-2">
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${pedidoFocado.latitude},${pedidoFocado.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="h-10 bg-slate-100 active:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border border-slate-300"
                >
                  <Navigation className="w-3.5 h-3.5 text-blue-600" />
                  <span>Google Maps</span>
                </a>

                <a
                  href={`https://waze.com/ul?ll=${pedidoFocado.latitude},${pedidoFocado.longitude}&navigate=yes`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="h-10 bg-slate-100 active:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border border-slate-300"
                >
                  <Navigation className="w-3.5 h-3.5 text-cyan-600" />
                  <span>Waze</span>
                </a>

                {/* BOTÃO PRINCIPAL TOUCH */}
                <div className="col-span-2">
                  {pedidoFocado.status === 'solicitado' && (
                    <button
                      type="button"
                      onClick={() => handleStatus(pedidoFocado.id, 'a_caminho')}
                      className="w-full h-12 bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 text-white font-black rounded-xl text-xs uppercase tracking-wider transition-all shadow-md flex items-center justify-center gap-2 border border-emerald-800 active:scale-[0.98]"
                    >
                      <Truck className="w-4 h-4" />
                      <span>DESPACHAR / A CAMINHO</span>
                    </button>
                  )}

                  {pedidoFocado.status === 'a_caminho' && (
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => handleStatus(pedidoFocado.id, 'entregue')}
                        className="h-12 bg-blue-700 hover:bg-blue-800 text-white font-bold rounded-xl text-[11px] uppercase tracking-wide transition-all shadow-md flex items-center justify-center gap-1"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Confirmar Chegada</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAbrirDesfecho(pedidoFocado)}
                        className="h-12 bg-slate-900 hover:bg-slate-800 text-white font-black rounded-xl text-[11px] uppercase tracking-wide transition-all shadow-md flex items-center justify-center gap-1 border border-slate-800"
                      >
                        <Check className="w-4 h-4 text-emerald-400" />
                        <span>Concluir Vistoria</span>
                      </button>
                    </div>
                  )}

                  {pedidoFocado.status === 'entregue' && (
                    <button
                      type="button"
                      onClick={() => handleAbrirDesfecho(pedidoFocado)}
                      className="w-full h-12 bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white font-black rounded-xl text-xs uppercase tracking-wider transition-all shadow-md flex items-center justify-center gap-2 border border-slate-800 active:scale-[0.98]"
                    >
                      <Check className="w-4 h-4 text-emerald-400" />
                      <span>INFORMAR RESULTADO E CONCLUIR</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* 5. MODAL INSTITUCIONAL DE DESFECHO DA VISTORIA NA CAIXA D'ÁGUA */}
      {modalDesfechoAberto && pedidoFinalizando && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-end sm:items-center justify-center p-3 sm:p-4">
          <div className="bg-white w-full max-w-md rounded-2xl p-4 space-y-3.5 shadow-2xl border border-slate-200 animate-in fade-in slide-in-from-bottom duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div>
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wide">
                  Desfecho da Vistoria da Caixa d'Água
                </h3>
                <p className="text-[11px] text-slate-500">
                  Morador: {pedidoFinalizando.morador_nome} • {pedidoFinalizando.quarteirao}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalDesfechoAberto(false)}
                className="p-1 rounded text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Lista de Opções de Desfecho */}
            <div className="space-y-2">
              {OPCOES_DESFECHO.map((opcao) => (
                <label
                  key={opcao.id}
                  className={`flex items-center gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-all ${
                    opcaoSelecionada === opcao.id
                      ? `${opcao.cor} ring-2 ring-emerald-500 font-bold`
                      : 'border-slate-200 bg-slate-50/50 hover:bg-slate-50 text-slate-800'
                  }`}
                >
                  <input
                    type="radio"
                    name="desfecho_visita"
                    value={opcao.id}
                    checked={opcaoSelecionada === opcao.id}
                    onChange={() => setOpcaoSelecionada(opcao.id)}
                    className="w-4 h-4 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span className="text-xs">{opcao.label}</span>
                </label>
              ))}
            </div>

            {/* Observações Adicionais */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Observações Adicionais (Opcional)
              </label>
              <input
                type="text"
                value={observacaoDesfecho}
                onChange={(e) => setObservacaoDesfecho(e.target.value)}
                placeholder="Ex: morador orientado, tampa substituída"
                className="w-full h-10 px-3 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-hidden"
              />
            </div>

            {/* Botões do Modal */}
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setModalDesfechoAberto(false)}
                className="flex-1 h-11 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmarDesfecho}
                className="flex-1 h-11 bg-emerald-700 hover:bg-emerald-800 text-white font-black rounded-xl text-xs uppercase tracking-wider shadow-md"
              >
                SALVAR E CONCLUIR
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
