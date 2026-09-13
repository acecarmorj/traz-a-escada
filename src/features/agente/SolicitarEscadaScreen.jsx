import React, { useState, useEffect } from 'react';
import { 
  MapPin, Send, CheckCircle2, Clock, 
  AlertTriangle, RefreshCw, User, Home, ChevronDown, ChevronUp,
  Check, CheckCheck, Sparkles, Navigation
} from 'lucide-react';
import { resolveAddressFromGps } from '../../lib/geoDetection';
import { playSuccessSound } from '../../lib/soundAlert';

export function SolicitarEscadaScreen({ pedidos, onCriarPedido, onConcluirPedido }) {
  // 1. Dados que o Agente preenche (apenas o essencial)
  const [nomeAgente, setNomeAgente] = useState(() => localStorage.getItem('escada_agente_nome') || '');
  const [nomeMorador, setNomeMorador] = useState('');
  const [referencia, setReferencia] = useState('');

  // 2. Endereço e Território 100% Automáticos via GPS
  const [localizacao, setLocalizacao] = useState({
    rua: 'Detectando rua...',
    bairro: 'Carmo',
    microarea: 'Centro',
    quarteirao: 'Q-01',
    numero: '',
    latitude: -21.9325,
    longitude: -42.6075,
    accuracy: null,
    isExact: false
  });

  const [gpsStatus, setGpsStatus] = useState('buscando'); // 'buscando' | 'pronto' | 'erro'
  const [enviando, setEnviando] = useState(false);
  const [mostrarEdicao, setMostrarEdicao] = useState(false);

  // Salva o nome do agente no aparelho
  const handleAgenteChange = (val) => {
    setNomeAgente(val);
    localStorage.setItem('escada_agente_nome', val);
  };

  // Captura e detecção contínua do GPS (estilo ACE e Ovitrampas)
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
            rua: det.rua || 'Rua Central',
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
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 8000 }
    );
  };

  useEffect(() => {
    capturarLocalizacao();
  }, []);

  // Verifica se há pedido ativo deste agente
  const pedidoAtivo = (pedidos || []).find(
    (p) => p.agente_nome && nomeAgente && 
           p.agente_nome.trim().toLowerCase() === nomeAgente.trim().toLowerCase() &&
           p.status !== 'concluido' && p.status !== 'cancelado'
  );

  // Envio da solicitação
  const handleSolicitar = async (e) => {
    e.preventDefault();
    if (!nomeAgente.trim()) {
      alert('Por favor, digite seu nome de agente.');
      return;
    }
    if (!nomeMorador.trim()) {
      alert('Por favor, informe o nome do morador.');
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
        precisao_gps: localizacao.accuracy || 10,
        referencia: referencia.trim()
      });

      playSuccessSound();
      setNomeMorador('');
      setReferencia('');
    } catch (err) {
      alert('Erro ao enviar pedido. Tente novamente.');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="max-w-md mx-auto space-y-3 pb-8">
      {/* 1. SE TIVER UM PEDIDO ATIVO: BALÃO ESTILO WHATSAPP DE ACOMPANHAMENTO */}
      {pedidoAtivo && (
        <div className="bg-[#DCF8C6] border border-[#B2E496] p-4 rounded-2xl shadow-sm space-y-3">
          <div className="flex items-center justify-between text-xs text-[#075E54] font-bold">
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-emerald-600 animate-spin" />
              PEDIDO EM ANDAMENTO
            </span>
            <span className="flex items-center gap-0.5 text-[#53bdeb]">
              <CheckCheck className="w-4 h-4" />
              Enviado
            </span>
          </div>

          <div className="bg-white/80 p-3 rounded-xl space-y-1.5 text-xs text-slate-800">
            <div className="font-bold text-sm text-slate-900">
              🏠 Morador: {pedidoAtivo.morador_nome || 'Não informado'}
            </div>
            <div className="text-slate-700">
              📍 {pedidoAtivo.rua} {pedidoAtivo.numero && `nº ${pedidoAtivo.numero}`}
            </div>
            <div className="text-slate-500 font-medium">
              Quarteirão: <strong>{pedidoAtivo.quarteirao}</strong> • Microárea: <strong>{pedidoAtivo.microarea}</strong>
            </div>
          </div>

          {/* Etapas Visuais */}
          <div className="flex items-center justify-between gap-1 pt-1">
            <div className={`flex-1 py-1.5 px-2 rounded-lg text-center text-[10px] font-black uppercase ${
              pedidoAtivo.status === 'solicitado' ? 'bg-amber-500 text-white shadow-xs animate-pulse' : 'bg-white/60 text-slate-600'
            }`}>
              1. Solicitado
            </div>
            <div className={`flex-1 py-1.5 px-2 rounded-lg text-center text-[10px] font-black uppercase ${
              pedidoAtivo.status === 'a_caminho' ? 'bg-[#25D366] text-white shadow-xs animate-bounce' : 'bg-white/60 text-slate-600'
            }`}>
              2. A Caminho 🚚
            </div>
            <div className={`flex-1 py-1.5 px-2 rounded-lg text-center text-[10px] font-black uppercase ${
              pedidoAtivo.status === 'entregue' ? 'bg-blue-600 text-white shadow-xs' : 'bg-white/60 text-slate-600'
            }`}>
              3. Entregue 🪜
            </div>
          </div>

          {pedidoAtivo.status === 'a_caminho' && (
            <div className="bg-emerald-700 text-white text-xs font-bold p-2.5 rounded-xl text-center shadow-xs">
              🚚 O carro da escada já está a caminho do seu local!
            </div>
          )}

          <button
            type="button"
            onClick={() => onConcluirPedido(pedidoAtivo.id)}
            className="w-full py-2.5 bg-[#075E54] hover:bg-[#064e46] text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5"
          >
            <CheckCircle2 className="w-4 h-4 text-[#25D366]" />
            Vistoria Concluída / Liberar Escada
          </button>
        </div>
      )}

      {/* 2. FORMULÁRIO PRINCIPAL MINIMALISTA (ESTILO WHATSAPP) */}
      <form onSubmit={handleSolicitar} className="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden">
        {/* Cabeçalho do Card */}
        <div className="bg-[#128C7E] px-4 py-3 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">🪜</span>
            <div>
              <h2 className="text-sm font-bold leading-tight">Solicitar Apoio de Escada</h2>
              <p className="text-[11px] text-emerald-100">O GPS preenche tudo automaticamente</p>
            </div>
          </div>
          <button
            type="button"
            onClick={capturarLocalizacao}
            className="p-1.5 bg-white/10 hover:bg-white/20 rounded-full text-white transition-all text-xs flex items-center gap-1"
            title="Atualizar GPS"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${gpsStatus === 'buscando' ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <div className="p-4 space-y-3.5">
          {/* Campo: Nome do Agente (Salvo automaticamente) */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Agente ACE
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <User className="w-4 h-4 text-[#128C7E]" />
              </div>
              <input
                type="text"
                required
                value={nomeAgente}
                onChange={(e) => handleAgenteChange(e.target.value)}
                placeholder="Seu nome"
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#25D366]"
              />
            </div>
          </div>

          {/* Campo Principal: Nome do Morador */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
              Nome do Morador / Responsável <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Home className="w-4 h-4 text-[#128C7E]" />
              </div>
              <input
                type="text"
                required
                autoFocus
                value={nomeMorador}
                onChange={(e) => setNomeMorador(e.target.value)}
                placeholder="Ex: Dona Maria, Sr. João"
                className="w-full pl-9 pr-3 py-2.5 bg-white border-2 border-slate-300 rounded-xl text-sm font-bold text-slate-900 placeholder:text-slate-400 placeholder:font-normal focus:border-[#25D366] focus:outline-hidden focus:ring-2 focus:ring-[#25D366]/20 shadow-xs"
              />
            </div>
          </div>

          {/* CARD DE LOCALIZAÇÃO 100% AUTOMÁTICA (BALÃO VERDE WHATSAPP) */}
          <div className="bg-[#E7F8E8] border border-[#C6EDC8] rounded-xl p-3 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black text-[#075E54] flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-[#25D366] shrink-0" />
                ENDEREÇO OBTIDO PELO GPS
              </span>
              {gpsStatus === 'buscando' ? (
                <span className="text-[10px] text-amber-700 font-bold animate-pulse flex items-center gap-1">
                  <RefreshCw className="w-3 h-3 animate-spin" /> Localizando...
                </span>
              ) : (
                <span className="text-[10px] text-emerald-800 font-bold flex items-center gap-0.5">
                  <Check className="w-3 h-3 text-[#25D366]" /> Pronto
                </span>
              )}
            </div>

            <div className="text-sm font-black text-slate-900">
              {localizacao.rua} {localizacao.numero && `nº ${localizacao.numero}`}
            </div>

            <div className="text-xs text-slate-700 flex items-center gap-2 flex-wrap font-semibold">
              <span className="bg-white/80 px-2 py-0.5 rounded-md border border-emerald-300/50">
                Quarteirão: <strong>{localizacao.quarteirao}</strong>
              </span>
              <span className="bg-white/80 px-2 py-0.5 rounded-md border border-emerald-300/50">
                Microárea: <strong>{localizacao.microarea}</strong>
              </span>
              {localizacao.accuracy && (
                <span className="text-[10px] text-slate-500">
                  (Precisão ~{localizacao.accuracy}m)
                </span>
              )}
            </div>

            {/* Opção discreta de ajuste */}
            <div className="pt-1 text-right">
              <button
                type="button"
                onClick={() => setMostrarEdicao(!mostrarEdicao)}
                className="text-[10px] text-[#075E54] hover:underline font-bold inline-flex items-center gap-0.5"
              >
                {mostrarEdicao ? 'Ocultar detalhes' : 'Ajustar número ou rua manualmente'}
                {mostrarEdicao ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
            </div>

            {/* Campos manuais opcionais expansíveis */}
            {mostrarEdicao && (
              <div className="pt-2 border-t border-emerald-200/60 grid grid-cols-2 gap-2 text-xs">
                <div className="col-span-2">
                  <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Rua</label>
                  <input
                    type="text"
                    value={localizacao.rua}
                    onChange={(e) => setLocalizacao({ ...localizacao, rua: e.target.value })}
                    className="w-full px-2 py-1 bg-white border border-slate-300 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Número</label>
                  <input
                    type="text"
                    value={localizacao.numero}
                    onChange={(e) => setLocalizacao({ ...localizacao, numero: e.target.value })}
                    placeholder="Ex: 120 ou S/N"
                    className="w-full px-2 py-1 bg-white border border-slate-300 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Quarteirão</label>
                  <input
                    type="text"
                    value={localizacao.quarteirao}
                    onChange={(e) => setLocalizacao({ ...localizacao, quarteirao: e.target.value })}
                    className="w-full px-2 py-1 bg-white border border-slate-300 rounded-lg text-xs"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Campo Opcional: Referência */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Ponto de Referência <span className="text-slate-400 font-normal">(Opcional)</span>
            </label>
            <input
              type="text"
              value={referencia}
              onChange={(e) => setReferencia(e.target.value)}
              placeholder="Ex: portão azul, casa de fundos, sobrado"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#25D366]"
            />
          </div>

          {/* BOTÃO PRINCIPAL VERDE ESTILO WHATSAPP */}
          <button
            type="submit"
            disabled={enviando}
            className="w-full py-3.5 bg-[#25D366] hover:bg-[#1EBE5D] active:scale-[0.99] text-slate-950 font-black text-base rounded-2xl shadow-md transition-all flex items-center justify-center gap-2"
          >
            <span className="text-xl">🪜</span>
            <span>{enviando ? 'SOLICITANDO...' : 'SOLICITAR ESCADA AGORA'}</span>
            <Send className="w-4 h-4 text-slate-950 ml-1" />
          </button>
        </div>
      </form>

      {/* 3. HISTÓRICO RÁPIDO DO AGENTE */}
      {pedidos && pedidos.length > 0 && (
        <div className="space-y-2 pt-2">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider px-1">
            Pedidos Recentes
          </div>
          {pedidos.slice(0, 3).map((p) => (
            <div key={p.id} className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between text-xs">
              <div>
                <div className="font-bold text-slate-900">{p.morador_nome || 'Morador'}</div>
                <div className="text-slate-500 text-[11px]">{p.rua} • {p.quarteirao}</div>
              </div>
              <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase ${
                p.status === 'solicitado' ? 'bg-amber-100 text-amber-800' :
                p.status === 'a_caminho' ? 'bg-emerald-100 text-emerald-800' :
                p.status === 'entregue' ? 'bg-blue-100 text-blue-800' :
                'bg-slate-100 text-slate-600'
              }`}>
                {p.status.replace('_', ' ')}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
