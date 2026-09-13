import React, { useState, useEffect } from 'react';
import { 
  MapPin, Send, CheckCircle2, Clock, 
  RefreshCw, User, Home, ChevronDown, ChevronUp,
  Shield, Check, Compass, Radio, X, AlertCircle
} from 'lucide-react';
import { resolveAddressFromGps } from '../../lib/geoDetection';
import { MapaGrandeAgente } from '../../maps/MapaGrandeAgente';
import { playSuccessSound } from '../../lib/soundAlert';

export function SolicitarEscadaScreen({ pedidos, onCriarPedido, onConcluirPedido, driverPos }) {
  // 1. Identificação do Agente
  const [nomeAgente, setNomeAgente] = useState(() => localStorage.getItem('escada_agente_nome') || '');
  const [nomeMorador, setNomeMorador] = useState('');
  const [referencia, setReferencia] = useState('');
  const [mostrandoRef, setMostrandoRef] = useState(false);

  // 2. Endereço e Território Automáticos por GPS de Carmo
  const [localizacao, setLocalizacao] = useState({
    rua: 'Detectando logradouro...',
    bairro: 'Carmo',
    microarea: 'Centro',
    quarteirao: 'Q-01',
    numero: '',
    latitude: -21.9339,
    longitude: -42.6089,
    accuracy: null,
    isExact: false
  });

  const [gpsStatus, setGpsStatus] = useState('buscando'); // 'buscando' | 'pronto' | 'erro'
  const [enviando, setEnviando] = useState(false);
  const [cardExpandido, setCardExpandido] = useState(true);

  const handleAgenteChange = (val) => {
    setNomeAgente(val);
    localStorage.setItem('escada_agente_nome', val);
  };

  // Captura automática de GPS (alta precisão)
  const capturarLocalizacao = () => {
    setGpsStatus('buscando');
    if (!navigator.geolocation) {
      setGpsStatus('erro');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        try {
          const det = await resolveAddressFromGps(latitude, longitude);
          setLocalizacao({
            rua: det.rua || 'Rua Principal',
            bairro: det.bairro || det.microarea || 'Centro',
            microarea: det.microarea || 'Centro',
            quarteirao: det.quarteirao || 'Q-01',
            numero: det.numero || '',
            latitude,
            longitude,
            accuracy: Math.round(accuracy),
            isExact: det.isExactPolygon
          });
          setGpsStatus('pronto');
        } catch (e) {
          setGpsStatus('pronto');
        }
      },
      (err) => {
        console.warn('Falha GPS:', err);
        setGpsStatus('erro');
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 5000 }
    );
  };

  useEffect(() => {
    capturarLocalizacao();
  }, []);

  // Busca pedido mais recente deste agente
  const pedidoRecente = (pedidos || []).find(
    (p) => p.agente_nome && nomeAgente && 
           p.agente_nome.trim().toLowerCase() === nomeAgente.trim().toLowerCase()
  );

  const isPedidoAtivo = pedidoRecente && pedidoRecente.status !== 'cancelado';
  const isConcluido = pedidoRecente && (pedidoRecente.status === 'concluido' || pedidoRecente.status === 'entregue');

  const handleSolicitar = async (e) => {
    e.preventDefault();
    if (!nomeAgente.trim()) {
      alert('Identifique o nome do agente.');
      return;
    }
    if (!nomeMorador.trim()) {
      alert('Informe o nome do morador ou responsável pelo imóvel.');
      return;
    }

    setEnviando(true);
    try {
      await onCriarPedido({
        agente_nome: nomeAgente.trim(),
        morador_nome: nomeMorador.trim(),
        rua: localizacao.rua,
        numero: localizacao.numero,
        bairro: localizacao.bairro,
        microarea: localizacao.microarea,
        quarteirao: localizacao.quarteirao,
        latitude: localizacao.latitude,
        longitude: localizacao.longitude,
        precisao_gps: localizacao.accuracy,
        referencia: referencia.trim()
      });
      playSuccessSound();
      setNomeMorador('');
      setReferencia('');
    } catch (err) {
      alert('Não foi possível registrar o pedido.');
    } finally {
      setEnviando(false);
    }
  };

  const handleFecharChamado = async (id) => {
    if (window.confirm('Deseja fechar esta ordem de apoio?')) {
      await onConcluirPedido(id);
      playSuccessSound();
    }
  };

  return (
    <div className="relative w-full h-full flex flex-col overflow-hidden font-sans select-none">
      {/* 1. MAPA GRANDE EM TELA CHEIA NO FUNDO (ESTILO MOTOJAGEMINI) */}
      <div className="absolute inset-0 z-0">
        <MapaGrandeAgente
          userPos={localizacao}
          microarea={localizacao.microarea}
          quarteirao={localizacao.quarteirao}
          pedidoAtivo={isPedidoAtivo && !isConcluido ? pedidoRecente : null}
          driverPos={driverPos}
        />
      </div>

      {/* 2. HEADER FLUTUANTE DISCRETO NO TOPO */}
      <header className="absolute top-2.5 left-3 right-3 z-20 flex items-center justify-between pointer-events-none">
        <div className="bg-slate-900/90 backdrop-blur-md text-white px-3 py-1.5 rounded-full border border-slate-700 shadow-md flex items-center gap-2 pointer-events-auto">
          <Shield className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span className="text-[11px] font-bold tracking-tight truncate max-w-[140px] sm:max-w-[200px]">
            {nomeAgente ? `Agente: ${nomeAgente}` : 'Identifique o Agente'}
          </span>
        </div>

        <button
          type="button"
          onClick={capturarLocalizacao}
          className="bg-white/95 backdrop-blur-md text-slate-800 px-2.5 py-1.5 rounded-full border border-slate-300 shadow-sm flex items-center gap-1.5 text-[10px] font-bold pointer-events-auto active:scale-95"
          title="Atualizar GPS"
        >
          <RefreshCw className={`w-3 h-3 text-emerald-600 ${gpsStatus === 'buscando' ? 'animate-spin' : ''}`} />
          <span>{localizacao.accuracy ? `GPS ±${localizacao.accuracy}m` : 'GPS'}</span>
        </button>
      </header>

      {/* 3. CARD FLUTUANTE NA BASE (ESTILO BOTTOM SHEET DO MOTOJA) */}
      <div className="absolute left-0 right-0 bottom-0 z-30 p-3 sm:p-4 max-w-md mx-auto w-full pointer-events-none">
        <div className="bg-white/98 backdrop-blur-md rounded-2xl shadow-xl border border-slate-200 p-3.5 space-y-3 pointer-events-auto max-h-[75dvh] overflow-y-auto">
          
          {/* CASO A: POSSUI PEDIDO ATIVO (OU RECÉM CONCLUÍDO) */}
          {isPedidoAtivo ? (
            <div className="space-y-2.5">
              {/* Topo do Card com Botão Fechar */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <div className="flex items-center gap-1.5">
                  <span className={`w-2.5 h-2.5 rounded-full ${isConcluido ? 'bg-emerald-600' : 'bg-blue-600 animate-pulse'}`} />
                  <span className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                    {isConcluido ? 'Chamado Concluído' : 'Ordem de Apoio em Aberto'}
                  </span>
                </div>

                {/* BOTÃO FECHAR SOLICITADO */}
                <button
                  type="button"
                  onClick={() => handleFecharChamado(pedidoRecente.id)}
                  className="flex items-center gap-1 text-[11px] font-bold text-slate-500 hover:text-rose-600 px-2 py-1 rounded-lg hover:bg-slate-100 transition-colors"
                  title="Fechar este chamado"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Fechar</span>
                </button>
              </div>

              {/* 3 ETAPAS DE STATUS CONFORME PEDIDO */}
              <div className="grid grid-cols-3 gap-1.5 text-center text-[10px] font-bold uppercase">
                <div className={`py-2 px-1 rounded-lg border flex flex-col items-center justify-center min-h-[46px] ${
                  pedidoRecente.status === 'solicitado'
                    ? 'bg-amber-100 text-amber-950 border-amber-400 ring-2 ring-amber-300 font-black'
                    : 'bg-slate-50 text-slate-400 border-slate-200'
                }`}>
                  <span className="leading-tight">1. Aguardando</span>
                  <span className="leading-tight">Atendimento</span>
                </div>

                <div className={`py-2 px-1 rounded-lg border flex flex-col items-center justify-center min-h-[46px] ${
                  pedidoRecente.status === 'a_caminho'
                    ? 'bg-blue-100 text-blue-950 border-blue-400 ring-2 ring-blue-300 font-black'
                    : 'bg-slate-50 text-slate-400 border-slate-200'
                }`}>
                  <span className="leading-tight">2. Aguardando</span>
                  <span className="leading-tight">Chegada</span>
                </div>

                <div className={`py-2 px-1 rounded-lg border flex flex-col items-center justify-center min-h-[46px] ${
                  isConcluido
                    ? 'bg-emerald-100 text-emerald-950 border-emerald-400 ring-2 ring-emerald-300 font-black'
                    : 'bg-slate-50 text-slate-400 border-slate-200'
                }`}>
                  <span className="leading-tight">3. Concluído</span>
                  <span className="leading-tight">{isConcluido ? '✓' : ''}</span>
                </div>
              </div>

              {/* Dados do Imóvel */}
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-xs space-y-1 text-slate-800">
                <div><strong>Morador:</strong> {pedidoRecente.morador_nome}</div>
                <div><strong>Logradouro:</strong> {pedidoRecente.rua} {pedidoRecente.numero && `nº ${pedidoRecente.numero}`}</div>
                <div className="text-[11px] text-slate-600">
                  <strong>Território:</strong> {pedidoRecente.quarteirao} • {pedidoRecente.microarea}
                </div>
              </div>

              {/* EXIBIÇÃO DO RESULTADO DA VISITA (SE CONCLUÍDO) */}
              {isConcluido && (
                <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-3 space-y-1">
                  <div className="text-[11px] font-bold text-emerald-900 uppercase tracking-wide flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                    <span>Resultado da Vistoria na Caixa d'Água</span>
                  </div>
                  <div className="text-xs font-extrabold text-emerald-950">
                    {pedidoRecente.resultado_visita || 'Vistoria Concluída com Sucesso'}
                  </div>
                  {pedidoRecente.observacao_desfecho && (
                    <div className="text-[11px] text-emerald-800 bg-white/70 p-2 rounded border border-emerald-200">
                      <strong>Obs:</strong> {pedidoRecente.observacao_desfecho}
                    </div>
                  )}
                </div>
              )}

              {/* Botões de Ação */}
              <div className="flex gap-2 pt-1">
                {isConcluido ? (
                  <button
                    type="button"
                    onClick={() => handleFecharChamado(pedidoRecente.id)}
                    className="w-full h-12 bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2"
                  >
                    <span>Iniciar Nova Solicitação</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleFecharChamado(pedidoRecente.id)}
                    className="w-full h-12 bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Concluir e Liberar Escada</span>
                  </button>
                )}
              </div>
            </div>
          ) : (
            /* CASO B: FORMULÁRIO OPERACIONAL ESTILO MOTOJA */
            <form onSubmit={handleSolicitar} className="space-y-3">
              {/* Cabeçalho do Card */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
                  <span className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                    Solicitar Apoio de Escada
                  </span>
                </div>
                <span className="text-[10px] text-slate-500 font-medium">
                  {localizacao.isExact ? 'Território Confirmado' : 'Carmo - RJ'}
                </span>
              </div>

              {/* Campo 1: Identificação do Agente (se ainda não salvo) */}
              {!nomeAgente && (
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Nome do Agente (ACE)
                  </label>
                  <input
                    type="text"
                    required
                    value={nomeAgente}
                    onChange={(e) => handleAgenteChange(e.target.value)}
                    placeholder="Seu nome completo"
                    className="w-full h-11 px-3 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-hidden focus:border-emerald-600"
                  />
                </div>
              )}

              {/* Campo 2: Nome do Morador (ÚNICO campo digitado pelo agente!) */}
              <div>
                <label className="block text-[11px] font-bold text-slate-800 mb-1">
                  Morador / Responsável <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={nomeMorador}
                    onChange={(e) => setNomeMorador(e.target.value)}
                    placeholder="Nome do morador ou do imóvel"
                    className="w-full h-12 pl-3 pr-9 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:outline-hidden focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 shadow-inner"
                  />
                  {nomeMorador && (
                    <button
                      type="button"
                      onClick={() => setNomeMorador('')}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Box de Endereço e Quarteirão Detectados 100% Automáticos */}
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-xs space-y-1">
                <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span className="truncate">{localizacao.rua} {localizacao.numero && `nº ${localizacao.numero}`}</span>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-slate-600 pt-0.5">
                  <span className="bg-white px-2 py-0.5 rounded border border-slate-200 font-bold text-emerald-800">
                    {localizacao.quarteirao}
                  </span>
                  <span className="bg-white px-2 py-0.5 rounded border border-slate-200 font-medium text-slate-700">
                    {localizacao.microarea}
                  </span>
                </div>
              </div>

              {/* Campo Opcional de Ponto de Referência */}
              {mostrandoRef ? (
                <div>
                  <label className="block text-[10px] font-semibold text-slate-600 mb-1">
                    Ponto de Referência (Opcional)
                  </label>
                  <input
                    type="text"
                    value={referencia}
                    onChange={(e) => setReferencia(e.target.value)}
                    placeholder="Ex: portão azul, fundos"
                    className="w-full h-10 px-3 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-800 focus:bg-white focus:outline-hidden"
                  />
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setMostrandoRef(true)}
                  className="text-[11px] text-emerald-700 hover:text-emerald-800 font-semibold"
                >
                  + Adicionar ponto de referência
                </button>
              )}

              {/* Botão de Ação Primária Touch (MOTOJA STYLE) */}
              <button
                type="submit"
                disabled={enviando || !nomeMorador.trim()}
                className="w-full h-12 bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 disabled:opacity-50 text-white font-black rounded-xl text-xs uppercase tracking-wider transition-all shadow-md flex items-center justify-center gap-2 border border-emerald-800 active:scale-[0.98]"
              >
                <Send className="w-4 h-4" />
                <span>{enviando ? 'Enviando Ordem...' : 'SOLICITAR ESCADA DE APOIO'}</span>
              </button>
            </form>
          )}

        </div>
      </div>
    </div>
  );
}
