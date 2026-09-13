import React, { useState, useEffect } from 'react';
import { MapPin, Navigation, Send, CheckCircle2, Clock, AlertTriangle, RefreshCw } from 'lucide-react';
import { detectTerritoryFromGps } from '../../lib/geoDetection';
import { BadgeStatus } from '../../components/BadgeStatus';
import { playSuccessSound } from '../../lib/soundAlert';

export function SolicitarEscadaScreen({ pedidos, onCriarPedido, onConcluirPedido }) {
  const [nome, setNome] = useState(() => localStorage.getItem('escada_agente_nome') || '');
  const [referencia, setReferencia] = useState('');
  const [loadingGps, setLoadingGps] = useState(true);
  const [gpsError, setGpsError] = useState(null);
  const [posicao, setPosicao] = useState(null);
  const [territorio, setTerritorio] = useState({ microarea: 'Localizando...', quarteirao: '--' });
  const [enviando, setEnviando] = useState(false);

  // Salva o nome do agente automaticamente
  const handleNomeChange = (val) => {
    setNome(val);
    localStorage.setItem('escada_agente_nome', val);
  };

  // Captura localização GPS
  const obterLocalizacao = () => {
    setLoadingGps(true);
    setGpsError(null);

    if (!navigator.geolocation) {
      setGpsError('GPS não suportado neste navegador.');
      setLoadingGps(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        setPosicao({ latitude, longitude, accuracy });
        const det = detectTerritoryFromGps(latitude, longitude);
        setTerritorio(det);
        setLoadingGps(false);
      },
      (err) => {
        console.warn('Erro GPS:', err);
        // Coordenadas centrais de Carmo como fallback de simulação
        const defaultLat = -21.9325;
        const defaultLng = -42.6075;
        setPosicao({ latitude: defaultLat, longitude: defaultLng, accuracy: 20 });
        const det = detectTerritoryFromGps(defaultLat, defaultLng);
        setTerritorio(det);
        setGpsError('Sinal GPS fraco ou não autorizado. Usando posição aproximada.');
        setLoadingGps(false);
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 5000 }
    );
  };

  useEffect(() => {
    obterLocalizacao();
  }, []);

  // Verifica se este agente tem algum pedido aberto
  const pedidoAtivo = (pedidos || []).find(
    (p) => p.agente_nome && nome && p.agente_nome.trim().toLowerCase() === nome.trim().toLowerCase() &&
           p.status !== 'concluido' && p.status !== 'cancelado'
  );

  const handleSolicitar = async () => {
    if (!nome.trim()) {
      alert('Por favor, informe seu nome de agente antes de solicitar.');
      return;
    }
    if (!posicao) {
      alert('Aguardando leitura do GPS...');
      return;
    }

    setEnviando(true);
    try {
      await onCriarPedido({
        agente_nome: nome.trim(),
        microarea: territorio.microarea,
        quarteirao: territorio.quarteirao,
        latitude: posicao.latitude,
        longitude: posicao.longitude,
        precisao_gps: Math.round(posicao.accuracy || 10),
        referencia: referencia.trim()
      });
      playSuccessSound();
      setReferencia('');
    } catch (e) {
      alert('Erro ao enviar pedido. Tente novamente.');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="max-w-md mx-auto space-y-4">
      {/* CARD DO AGENTE ATIVO SE JÁ TIVER PEDIDO EM ANDAMENTO */}
      {pedidoAtivo && (
        <div className="bg-white border-2 border-amber-500 rounded-2xl p-4 shadow-lg space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-amber-800 bg-amber-100 px-2 py-0.5 rounded">
              Pedido em Andamento
            </span>
            <BadgeStatus status={pedidoAtivo.status} />
          </div>

          <div className="border-t border-slate-100 pt-2 text-sm text-slate-800 space-y-1">
            <div className="font-bold text-base flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-rose-600" />
              {pedidoAtivo.microarea} • {pedidoAtivo.quarteirao}
            </div>
            {pedidoAtivo.referencia && (
              <p className="text-xs text-slate-600 italic">"{pedidoAtivo.referencia}"</p>
            )}
            <p className="text-[11px] text-slate-500 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Solicitado às {new Date(pedidoAtivo.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>

          {/* Etapas Visuais */}
          <div className="grid grid-cols-3 gap-1.5 pt-2 text-center text-xs font-bold">
            <div className={`p-2 rounded-lg border ${pedidoAtivo.status === 'solicitado' ? 'bg-amber-500 text-slate-950 border-amber-600 animate-pulse' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
              1. Solicitado
            </div>
            <div className={`p-2 rounded-lg border ${pedidoAtivo.status === 'a_caminho' ? 'bg-blue-600 text-white border-blue-700 animate-pulse' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
              2. A Caminho
            </div>
            <div className={`p-2 rounded-lg border ${pedidoAtivo.status === 'entregue' ? 'bg-emerald-600 text-white border-emerald-700' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
              3. Entregue
            </div>
          </div>

          <button
            type="button"
            onClick={() => onConcluirPedido(pedidoAtivo.id)}
            className="w-full mt-2 py-2.5 px-4 bg-slate-900 text-white rounded-xl text-xs font-black hover:bg-slate-800 flex items-center justify-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            Vistoria Concluída / Liberar Escada
          </button>
        </div>
      )}

      {/* FORMULÁRIO DE SOLICITAÇÃO RÁPIDA */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
        <div>
          <label className="block text-xs font-bold uppercase text-slate-600 tracking-wider mb-1.5">
            Seu Nome (Agente ACE)
          </label>
          <input
            type="text"
            value={nome}
            onChange={(e) => handleNomeChange(e.target.value)}
            placeholder="Ex: Almir, Carlos, João..."
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm"
          />
        </div>

        {/* CARTÃO DE LOCALIZAÇÃO E QUARTEIRÃO DETECTADO */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wide flex items-center gap-1">
              <Navigation className="w-3.5 h-3.5 text-amber-600" />
              Localização no Campo
            </span>
            <button
              type="button"
              onClick={obterLocalizacao}
              disabled={loadingGps}
              className="text-xs text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1"
            >
              <RefreshCw className={`w-3 h-3 ${loadingGps ? 'animate-spin' : ''}`} />
              Atualizar GPS
            </button>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-800 text-xl font-black shrink-0">
              📍
            </div>
            <div className="flex-1">
              <div className="text-base font-black text-slate-900 leading-tight">
                {territorio.microarea}
              </div>
              <div className="text-xs font-bold text-amber-800">
                Quarteirão: <span className="bg-amber-200 px-1.5 py-0.5 rounded text-amber-950 font-black">{territorio.quarteirao}</span>
              </div>
            </div>
          </div>

          {posicao && (
            <div className="text-[11px] text-slate-500 flex items-center justify-between border-t border-slate-200 pt-1.5">
              <span>Precisão GPS: ±{Math.round(posicao.accuracy || 10)}m</span>
              <span className="text-emerald-700 font-bold">● Sinal Ativo</span>
            </div>
          )}

          {gpsError && (
            <p className="text-xs text-amber-800 bg-amber-50 p-2 rounded border border-amber-200 flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              {gpsError}
            </p>
          )}
        </div>

        {/* PONTO DE REFERÊNCIA / OBSERVAÇÃO */}
        <div>
          <label className="block text-xs font-bold uppercase text-slate-600 tracking-wider mb-1.5">
            Ponto de Referência / Nº da Casa (Opcional)
          </label>
          <input
            type="text"
            value={referencia}
            onChange={(e) => setReferencia(e.target.value)}
            placeholder="Ex: Casa nº 140, fundos, caixa alta no telhado"
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>

        {/* BOTÃO PRINCIPAL DE SOLICITAÇÃO GIGANTE */}
        <button
          type="button"
          onClick={handleSolicitar}
          disabled={enviando || loadingGps}
          className="w-full py-4 px-6 rounded-2xl bg-amber-500 hover:bg-amber-400 active:scale-[0.99] text-slate-950 font-black text-base sm:text-lg shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-3 border-2 border-amber-600 disabled:opacity-50"
        >
          {enviando ? (
            <RefreshCw className="w-6 h-6 animate-spin" />
          ) : (
            <>
              <span className="text-2xl">🪜</span>
              <span>SOLICITAR ESCADA AGORA</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
