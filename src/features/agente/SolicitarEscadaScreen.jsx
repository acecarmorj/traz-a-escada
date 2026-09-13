import React, { useState, useEffect } from 'react';
import { 
  MapPin, Send, CheckCircle2, Clock, 
  AlertTriangle, RefreshCw, User, Home, ChevronDown, ChevronUp,
  Shield, Check, CheckCheck, Compass, Radio, X
} from 'lucide-react';
import { resolveAddressFromGps } from '../../lib/geoDetection';
import { MapaAgente } from '../../maps/MapaAgente';
import { playSuccessSound } from '../../lib/soundAlert';

export function SolicitarEscadaScreen({ pedidos, onCriarPedido, onConcluirPedido }) {
  // 1. Identificação
  const [nomeAgente, setNomeAgente] = useState(() => localStorage.getItem('escada_agente_nome') || '');
  const [nomeMorador, setNomeMorador] = useState('');
  const [referencia, setReferencia] = useState('');

  // 2. Endereço e Território 100% Automáticos por GPS
  const [localizacao, setLocalizacao] = useState({
    rua: 'Detectando logradouro...',
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
  const [mostrarEdicaoManual, setMostrarEdicaoManual] = useState(false);

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
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 6000 }
    );
  };

  useEffect(() => {
    capturarLocalizacao();
  }, []);

  // Verifica se o agente já possui solicitação aberta
  const pedidoAtivo = (pedidos || []).find(
    (p) => p.agente_nome && nomeAgente && 
           p.agente_nome.trim().toLowerCase() === nomeAgente.trim().toLowerCase() &&
           p.status !== 'concluido' && p.status !== 'cancelado'
  );

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
        precisao_gps: localizacao.accuracy || 10,
        referencia: referencia.trim()
      });

      playSuccessSound();
      setNomeMorador('');
      setReferencia('');
    } catch (err) {
      alert('Erro na comunicação do chamado. Tente novamente.');
    } finally {
      setEnviando(false);
    }
  };

  const handleFecharChamado = async (id) => {
    if (window.confirm('Deseja encerrar e fechar esta ordem de apoio?')) {
      await onConcluirPedido(id);
    }
  };

  return (
    <div className="max-w-md mx-auto space-y-3 pb-8 font-sans">
      {/* 1. ORDEM DE APOIO EM ABERTO (SE HOUVER) */}
      {pedidoAtivo && (
        <section className="bg-white border border-emerald-300 rounded-xl p-3.5 shadow-sm space-y-2.5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <div className="flex items-center gap-1.5">
              <Radio className="w-4 h-4 text-emerald-600 animate-pulse" />
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                Ordem de Apoio em Aberto
              </span>
            </div>
            {/* BOTÃO FECHAR CHAMADO */}
            <button
              type="button"
              onClick={() => handleFecharChamado(pedidoAtivo.id)}
              className="flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-rose-600 px-2 py-0.5 rounded hover:bg-slate-100"
              title="Fechar chamado"
            >
              <X className="w-3.5 h-3.5" />
              <span>Fechar</span>
            </button>
          </div>

          <div className="space-y-1 text-xs text-slate-700 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
            <div><strong>Morador:</strong> {pedidoAtivo.morador_nome}</div>
            <div><strong>Logradouro:</strong> {pedidoAtivo.rua} {pedidoAtivo.numero && `nº ${pedidoAtivo.numero}`}</div>
            <div className="text-[11px] text-slate-600">
              <strong>Território:</strong> {pedidoAtivo.quarteirao} • {pedidoAtivo.microarea}
            </div>
          </div>

          {/* Barra de Progresso Operacional */}
          <div className="grid grid-cols-3 gap-1.5 pt-1 text-center text-[10px] font-bold uppercase">
            <div className={`py-1.5 px-1 rounded-md border ${
              pedidoAtivo.status === 'solicitado' 
                ? 'bg-amber-100 text-amber-900 border-amber-300 ring-1 ring-amber-400 font-extrabold' 
                : 'bg-slate-50 text-slate-500 border-slate-200'
            }`}>
              1. Solicitado
            </div>
            <div className={`py-1.5 px-1 rounded-md border ${
              pedidoAtivo.status === 'a_caminho' 
                ? 'bg-blue-100 text-blue-900 border-blue-300 ring-1 ring-blue-400 font-extrabold' 
                : 'bg-slate-50 text-slate-500 border-slate-200'
            }`}>
              2. Em Trânsito
            </div>
            <div className={`py-1.5 px-1 rounded-md border ${
              pedidoAtivo.status === 'entregue' 
                ? 'bg-emerald-100 text-emerald-900 border-emerald-300 ring-1 ring-emerald-400 font-extrabold' 
                : 'bg-slate-50 text-slate-500 border-slate-200'
            }`}>
              3. Entregue
            </div>
          </div>

          {pedidoAtivo.status === 'a_caminho' && (
            <div className="bg-blue-50 text-blue-800 text-xs p-2 rounded-md font-medium text-center border border-blue-200">
              Veículo de apoio deslocando-se para o seu imóvel.
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={() => onConcluirPedido(pedidoAtivo.id)}
              className="flex-1 h-11 bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white rounded-lg text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Concluir e Liberar Escada</span>
            </button>
            <button
              type="button"
              onClick={() => handleFecharChamado(pedidoAtivo.id)}
              className="px-3 h-11 bg-slate-100 hover:bg-rose-50 hover:text-rose-700 text-slate-600 rounded-lg text-xs font-bold transition-all border border-slate-200 flex items-center justify-center gap-1"
              title="Fechar chamado atual"
            >
              <X className="w-4 h-4" />
              <span>Fechar</span>
            </button>
          </div>
        </section>
      )}

      {/* 2. FORMULÁRIO OPERACIONAL CORPORATIVO (OTIMIZADO PARA TOUCH MOBILE) */}
      <form onSubmit={handleSolicitar} className="bg-white rounded-xl shadow-xs border border-slate-200 p-3.5 space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-600" />
            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
              Solicitação Operacional de Escada
            </h2>
          </div>
          <button
            type="button"
            onClick={capturarLocalizacao}
            className="text-[11px] font-medium text-emerald-700 hover:text-emerald-800 flex items-center gap-1 p-1 rounded hover:bg-slate-50"
          >
            <RefreshCw className={`w-3 h-3 ${gpsStatus === 'buscando' ? 'animate-spin' : ''}`} />
            <span>Atualizar GPS</span>
          </button>
        </div>

        {/* Identificação do Agente */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-600 mb-1">
            Agente Responsável
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <User className="w-4 h-4 text-slate-500" />
            </div>
            <input
              type="text"
              required
              value={nomeAgente}
              onChange={(e) => handleAgenteChange(e.target.value)}
              placeholder="Nome do agente"
              className="w-full h-11 pl-9 pr-3 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 focus:bg-white focus:outline-hidden focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
            />
          </div>
        </div>

        {/* Identificação do Morador com Botão Limpar */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-800 mb-1">
            Morador / Responsável pelo Imóvel <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Home className="w-4 h-4 text-slate-500" />
            </div>
            <input
              type="text"
              required
              autoFocus
              value={nomeMorador}
              onChange={(e) => setNomeMorador(e.target.value)}
              placeholder="Nome do morador ou estabelecimento"
              className="w-full h-12 pl-9 pr-9 bg-white border-2 border-slate-300 rounded-lg text-sm font-bold text-slate-900 placeholder:text-slate-400 placeholder:font-normal focus:outline-hidden focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 shadow-2xs"
            />
            {nomeMorador && (
              <button
                type="button"
                onClick={() => setNomeMorador('')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                title="Limpar campo"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* MAPINHA INCORPORADO PARA O AGENTE VISUALIZAR OS QUARTEIRÕES E MICROÁREAS */}
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-700">
            <span className="flex items-center gap-1">
              <Compass className="w-3.5 h-3.5 text-emerald-700" />
              <span>Mapa Territorial Local (Quarteirões e Microáreas)</span>
            </span>
            <span className="text-[10px] text-slate-500 font-normal">
              {localizacao.accuracy ? `Precisão: ±${localizacao.accuracy}m` : 'Buscando sinal...'}
            </span>
          </div>

          <MapaAgente
            userPos={{ latitude: localizacao.latitude, longitude: localizacao.longitude }}
            microarea={localizacao.microarea}
            quarteirao={localizacao.quarteirao}
          />
        </div>

        {/* LOCALIZAÇÃO DETECTADA AUTOMATICAMENTE */}
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-1.5">
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-bold text-slate-800 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-emerald-700" />
              Endereço Registrado pelo GPS
            </span>
            {gpsStatus === 'buscando' ? (
              <span className="text-amber-700 font-medium animate-pulse">Sincronizando...</span>
            ) : (
              <span className="text-emerald-700 font-semibold flex items-center gap-0.5">
                <Check className="w-3 h-3 text-emerald-600" /> Confirmado
              </span>
            )}
          </div>

          <div className="text-xs font-bold text-slate-900">
            {localizacao.rua} {localizacao.numero && `nº ${localizacao.numero}`}
          </div>

          <div className="flex items-center gap-1.5 flex-wrap text-[11px] text-slate-600">
            <span className="bg-white px-2 py-0.5 rounded border border-slate-200 font-medium">
              Quarteirão: <strong>{localizacao.quarteirao}</strong>
            </span>
            <span className="bg-white px-2 py-0.5 rounded border border-slate-200 font-medium">
              Microárea: <strong>{localizacao.microarea}</strong>
            </span>
          </div>

          <div className="pt-1 text-right">
            <button
              type="button"
              onClick={() => setMostrarEdicaoManual(!mostrarEdicaoManual)}
              className="text-[10px] text-emerald-700 hover:text-emerald-800 font-semibold inline-flex items-center gap-0.5"
            >
              {mostrarEdicaoManual ? 'Ocultar ajuste manual' : 'Ajustar logradouro ou número'}
              {mostrarEdicaoManual ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          </div>

          {/* PAINEL DE EDIÇÃO MANUAL COM BOTÃO FECHAR */}
          {mostrarEdicaoManual && (
            <div className="pt-2 border-t border-slate-200 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-700 text-[11px]">Ajuste Manual de Logradouro</span>
                <button
                  type="button"
                  onClick={() => setMostrarEdicaoManual(false)}
                  className="text-[10px] text-slate-500 hover:text-slate-800 flex items-center gap-0.5"
                >
                  <X className="w-3 h-3" />
                  <span>Fechar</span>
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="col-span-2">
                  <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">Logradouro</label>
                  <input
                    type="text"
                    value={localizacao.rua}
                    onChange={(e) => setLocalizacao({ ...localizacao, rua: e.target.value })}
                    className="w-full h-9 px-2 bg-white border border-slate-300 rounded text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">Número</label>
                  <input
                    type="text"
                    value={localizacao.numero}
                    onChange={(e) => setLocalizacao({ ...localizacao, numero: e.target.value })}
                    placeholder="Ex: 140 ou S/N"
                    className="w-full h-9 px-2 bg-white border border-slate-300 rounded text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">Quarteirão</label>
                  <input
                    type="text"
                    value={localizacao.quarteirao}
                    onChange={(e) => setLocalizacao({ ...localizacao, quarteirao: e.target.value })}
                    className="w-full h-9 px-2 bg-white border border-slate-300 rounded text-xs"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Referência Opcional */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-600 mb-1">
            Ponto de Referência <span className="text-slate-400 font-normal">(Opcional)</span>
          </label>
          <input
            type="text"
            value={referencia}
            onChange={(e) => setReferencia(e.target.value)}
            placeholder="Ex: fundos, sobrado, portão de grade"
            className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:bg-white focus:outline-hidden focus:border-emerald-600"
          />
        </div>

        {/* BOTÃO PRINCIPAL CORPORATIVO COM ALTURA ERGONÔMICA PARA TOUCH */}
        <button
          type="submit"
          disabled={enviando}
          className="w-full h-12 bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 text-white font-bold text-xs uppercase tracking-wider rounded-lg shadow-sm transition-all flex items-center justify-center gap-2 border border-emerald-800"
        >
          <Send className="w-4 h-4 text-emerald-200" />
          <span>{enviando ? 'Enviando Solicitação...' : 'Solicitar Apoio de Escada'}</span>
        </button>
      </form>

      {/* HISTÓRICO RECENTE */}
      {pedidos && pedidos.length > 0 && (
        <section className="space-y-1.5 pt-1">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider px-1">
            Ordens Recentes
          </div>
          {pedidos.slice(0, 3).map((p) => (
            <div key={p.id} className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs flex items-center justify-between text-xs">
              <div>
                <div className="font-semibold text-slate-900">{p.morador_nome || 'Morador'}</div>
                <div className="text-[11px] text-slate-500">{p.rua} • {p.quarteirao}</div>
              </div>
              <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                p.status === 'solicitado' ? 'bg-amber-100 text-amber-800' :
                p.status === 'a_caminho' ? 'bg-blue-100 text-blue-800' :
                p.status === 'entregue' ? 'bg-emerald-100 text-emerald-800' :
                'bg-slate-100 text-slate-600'
              }`}>
                {p.status.replace('_', ' ')}
              </span>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
