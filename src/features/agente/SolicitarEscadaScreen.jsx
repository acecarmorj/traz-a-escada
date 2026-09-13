import React, { useState, useEffect } from 'react';
import { 
  MapPin, Send, CheckCircle2, Clock, 
  RefreshCw, User, Home, ChevronDown, ChevronUp,
  Shield, Check, Compass, Radio, X, AlertCircle
} from 'lucide-react';
import { resolveAddressFromGps } from '../../lib/geoDetection';
import { MapaGrandeAgente } from '../../maps/MapaGrandeAgente';
import { playSuccessSound } from '../../lib/soundAlert';

export function SolicitarEscadaScreen({ 
  pedidos, 
  onCriarPedido, 
  onConcluirPedido, 
  onCancelarPedido,
  driverPos 
}) {
  // 1. Identificação do Agente
  const [nomeAgente, setNomeAgente] = useState(() => localStorage.getItem('escada_agente_nome') || '');
  const [nomeMorador, setNomeMorador] = useState('');
  const [referencia, setReferencia] = useState('');
  const [mostrandoRef, setMostrandoRef] = useState(false);

  // Controle de pedido fechado/dispensado localmente para permitir novas solicitações
  const [pedidoDispensadoId, setPedidoDispensadoId] = useState(
    () => localStorage.getItem('escada_pedido_fechado_id') || ''
  );

  const dispensarPedido = (id) => {
    setPedidoDispensadoId(id);
    localStorage.setItem('escada_pedido_fechado_id', id);
  };

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

  // 1. Pedido Ativo em Andamento (solicitado ou a_caminho)
  const pedidoAtivo = (pedidos || []).find(
    (p) => p.agente_nome && nomeAgente && 
           p.agente_nome.trim().toLowerCase() === nomeAgente.trim().toLowerCase() &&
           (p.status === 'solicitado' || p.status === 'a_caminho') &&
           p.id !== pedidoDispensadoId
  );

  // 2. Pedido Concluído (aguardando visualização do resultado pelo agente)
  const pedidoConcluido = !pedidoAtivo ? (pedidos || []).find(
    (p) => p.agente_nome && nomeAgente && 
           p.agente_nome.trim().toLowerCase() === nomeAgente.trim().toLowerCase() &&
           (p.status === 'concluido' || p.status === 'entregue') &&
           p.id !== pedidoDispensadoId
  ) : null;

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
      const novo = await onCriarPedido({
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
      // Limpa qualquer dispensa anterior para focar no novo pedido
      setPedidoDispensadoId('');
      localStorage.removeItem('escada_pedido_fechado_id');
    } catch (err) {
      alert('Não foi possível registrar o pedido.');
    } finally {
      setEnviando(false);
    }
  };

  // Cancela ou fecha ordem de apoio ativa
  const handleCancelarAtivo = async (id) => {
    if (window.confirm('Deseja cancelar esta solicitação de escada?')) {
      if (onCancelarPedido) {
        await onCancelarPedido(id);
      } else {
        await onConcluirPedido(id);
      }
      dispensarPedido(id);
      playSuccessSound();
    }
  };

  // Fecha o card do chamado concluído para iniciar o próximo
  const handleFecharConcluido = (id) => {
    dispensarPedido(id);
    playSuccessSound();
  };

  return (
    <div className="relative w-full h-full flex flex-col overflow-hidden font-sans select-none">
      {/* 1. MAPA GRANDE EM TELA CHEIA NO FUNDO (ESTILO MOTOJAGEMINI) */}
      <div className="absolute inset-0 z-0">
        <MapaGrandeAgente
          userPos={localizacao}
          microarea={localizacao.microarea}
          quarteirao={localizacao.quarteirao}
          pedidoAtivo={pedidoAtivo}
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
          
          {/* CASO 1: PEDIDO ATIVO EM ANDAMENTO */}
          {pedidoAtivo ? (
            <div className="space-y-2.5">
              {/* Topo do Card com Botão Fechar / Cancelar */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse" />
                  <span className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                    Ordem de Apoio em Aberto
                  </span>
                </div>

                {/* BOTÃO FECHAR / CANCELAR */}
                <button
                  type="button"
                  onClick={() => handleCancelarAtivo(pedidoAtivo.id)}
                  className="flex items-center gap-1 text-[11px] font-bold text-slate-500 hover:text-rose-600 px-2 py-1 rounded-lg hover:bg-slate-100 transition-colors"
                  title="Fechar ou cancelar esta solicitação"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Fechar</span>
                </button>
              </div>

              {/* 3 ETAPAS DE STATUS CONFORME PEDIDO */}
              <div className="grid grid-cols-3 gap-1.5 text-center text-[10px] font-bold uppercase">
                <div className={`py-2 px-1 rounded-lg border flex flex-col items-center justify-center min-h-[46px] ${
                  pedidoAtivo.status === 'solicitado'
                    ? 'bg-amber-100 text-amber-950 border-amber-400 ring-2 ring-amber-300 font-black'
                    : 'bg-slate-50 text-slate-400 border-slate-200'
                }`}>
                  <span className="leading-tight">1. Aguardando</span>
                  <span className="leading-tight">Atendimento</span>
                </div>

                <div className={`py-2 px-1 rounded-lg border flex flex-col items-center justify-center min-h-[46px] ${
                  pedidoAtivo.status === 'a_caminho'
                    ? 'bg-blue-100 text-blue-950 border-blue-400 ring-2 ring-blue-300 font-black'
                    : 'bg-slate-50 text-slate-400 border-slate-200'
                }`}>
                  <span className="leading-tight">2. Aguardando</span>
                  <span className="leading-tight">Chegada</span>
                </div>

                <div className="py-2 px-1 rounded-lg border flex flex-col items-center justify-center min-h-[46px] bg-slate-50 text-slate-400 border-slate-200">
                  <span className="leading-tight">3. Concluído</span>
                </div>
              </div>

              {/* Dados do Imóvel */}
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-xs space-y-1 text-slate-800">
                <div><strong>Morador:</strong> {pedidoAtivo.morador_nome}</div>
                <div><strong>Logradouro:</strong> {pedidoAtivo.rua} {pedidoAtivo.numero && `nº ${pedidoAtivo.numero}`}</div>
                <div className="text-[11px] text-slate-600">
                  <strong>Território:</strong> {pedidoAtivo.quarteirao} • {pedidoAtivo.microarea}
                </div>
              </div>

              {/* Mensagem de status */}
              <div className={`text-xs p-2.5 rounded-xl font-bold text-center border ${
                pedidoAtivo.status === 'a_caminho'
                  ? 'bg-blue-50 text-blue-900 border-blue-200'
                  : 'bg-amber-50 text-amber-900 border-amber-200'
              }`}>
                {pedidoAtivo.status === 'a_caminho'
                  ? '🚚 Veículo de apoio da escada em trânsito até o seu imóvel.'
                  : '⏳ Pedido registrado. Aguardando atendimento pelo veículo da escada.'}
              </div>
            </div>
          ) : pedidoConcluido ? (
            /* CASO 2: CHAMADO CONCLUÍDO COM RESULTADO DA VISTORIA */
            <div className="space-y-2.5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs font-black text-slate-900 uppercase tracking-wide">
                    Vistoria Concluída
                  </span>
                </div>

                {/* BOTÃO FECHAR */}
                <button
                  type="button"
                  onClick={() => handleFecharConcluido(pedidoConcluido.id)}
                  className="flex items-center gap-1 text-[11px] font-bold text-slate-500 hover:text-slate-800 px-2 py-1 rounded-lg hover:bg-slate-100 transition-colors"
                  title="Fechar e iniciar nova solicitação"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Fechar</span>
                </button>
              </div>

              {/* 3 ETAPAS DE STATUS - COM A 3ª CONCLUÍDA */}
              <div className="grid grid-cols-3 gap-1.5 text-center text-[10px] font-bold uppercase">
                <div className="py-2 px-1 rounded-lg border flex flex-col items-center justify-center min-h-[46px] bg-slate-50 text-slate-400 border-slate-200">
                  <span className="leading-tight">1. Atendido</span>
                </div>
                <div className="py-2 px-1 rounded-lg border flex flex-col items-center justify-center min-h-[46px] bg-slate-50 text-slate-400 border-slate-200">
                  <span className="leading-tight">2. Entregue</span>
                </div>
                <div className="py-2 px-1 rounded-lg border flex flex-col items-center justify-center min-h-[46px] bg-emerald-100 text-emerald-950 border-emerald-400 ring-2 ring-emerald-300 font-black">
                  <span className="leading-tight">3. Concluído</span>
                  <span className="leading-tight">✓</span>
                </div>
              </div>

              {/* CARD OFICIAL COM O RESULTADO DA VISTORIA */}
              <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-3 space-y-1.5">
                <div className="text-[11px] font-bold text-emerald-900 uppercase tracking-wide">
                  Resultado Oficial da Vistoria na Caixa d'Água:
                </div>
                <div className="text-xs font-black text-emerald-950 bg-white p-2 rounded-lg border border-emerald-200">
                  {pedidoConcluido.resultado_visita || 'Vistoria Concluída sem Pendências'}
                </div>
                {pedidoConcluido.observacao_desfecho && (
                  <div className="text-[11px] text-emerald-900 bg-white/70 p-2 rounded-lg border border-emerald-200">
                    <strong>Obs:</strong> {pedidoConcluido.observacao_desfecho}
                  </div>
                )}
                <div className="text-[10px] text-emerald-700 pt-0.5">
                  Imóvel: {pedidoConcluido.morador_nome} • {pedidoConcluido.quarteirao}
                </div>
              </div>

              {/* BOTÃO PARA INICIAR NOVA VISTORIA */}
              <button
                type="button"
                onClick={() => handleFecharConcluido(pedidoConcluido.id)}
                className="w-full h-12 bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white font-black rounded-xl text-xs uppercase tracking-wider transition-all shadow-md flex items-center justify-center gap-2 border border-slate-800 active:scale-[0.98]"
              >
                <span>FECHAR E INICIAR NOVA SOLICITAÇÃO</span>
              </button>
            </div>
          ) : (
            /* CASO 3: FORMULÁRIO LIMPO PARA NOVA SOLICITAÇÃO */
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
