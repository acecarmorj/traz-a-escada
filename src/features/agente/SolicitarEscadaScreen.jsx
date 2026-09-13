import React, { useState, useEffect } from 'react';
import { 
  MapPin, Navigation, Send, CheckCircle2, Clock, 
  AlertTriangle, RefreshCw, User, Home, Search, Compass, Building2
} from 'lucide-react';
import { detectTerritoryFromGps } from '../../lib/geoDetection';
import { 
  BAIRROS_CARMO, getMicroareasList, getQuarteiroesByMicroarea, 
  buscarRuas, getSugestoesRua 
} from '../../lib/territoriosService';
import { BadgeStatus } from '../../components/BadgeStatus';
import { playSuccessSound } from '../../lib/soundAlert';

export function SolicitarEscadaScreen({ pedidos, onCriarPedido, onConcluirPedido }) {
  // Dados do Formulário
  const [nomeAgente, setNomeAgente] = useState(() => localStorage.getItem('escada_agente_nome') || '');
  const [nomeMorador, setNomeMorador] = useState('');
  const [rua, setRua] = useState('');
  const [numero, setNumero] = useState('');
  const [bairro, setBairro] = useState('Centro');
  const [microarea, setMicroarea] = useState('Centro');
  const [quarteirao, setQuarteirao] = useState('01');
  const [referencia, setReferencia] = useState('');

  // Sugestões da Rua selecionada (regra de múltiplas microáreas e quarteirões)
  const [sugestoesRua, setSugestoesRua] = useState({ microareas: [], quarteiroes: [] });
  const [ruasFiltradas, setRuasFiltradas] = useState([]);
  const [mostrarListaRuas, setMostrarListaRuas] = useState(false);

  // Estado do GPS
  const [loadingGps, setLoadingGps] = useState(true);
  const [gpsError, setGpsError] = useState(null);
  const [posicao, setPosicao] = useState(null);
  const [gpsDetectado, setGpsDetectado] = useState(null);
  const [enviando, setEnviando] = useState(false);

  // Lista de microáreas e quarteirões disponíveis
  const microareasDisponiveis = getMicroareasList();
  const quarteiroesDisponiveis = getQuarteiroesByMicroarea(microarea);

  // Salva o nome do agente automaticamente
  const handleAgenteChange = (val) => {
    setNomeAgente(val);
    localStorage.setItem('escada_agente_nome', val);
  };

  // Captura localização GPS
  const obterLocalizacao = () => {
    setLoadingGps(true);
    setGpsError(null);

    if (!navigator.geolocation) {
      setGpsError('GPS não suportado.');
      setLoadingGps(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        setPosicao({ latitude, longitude, accuracy });
        const det = detectTerritoryFromGps(latitude, longitude);
        setGpsDetectado(det);

        // Se o usuário ainda não alterou manualmente, pré-preenche
        if (det.microarea && det.microarea !== 'Carmo') {
          setMicroarea(det.microarea);
          if (BAIRROS_CARMO.includes(det.microarea)) {
            setBairro(det.microarea);
          }
        }
        if (det.quarteirao && det.quarteirao !== '--') {
          setQuarteirao(det.quarteirao.replace(/^Q\s*-\s*/i, ''));
        }
        setLoadingGps(false);
      },
      (err) => {
        console.warn('Erro GPS:', err);
        const defaultLat = -21.9325;
        const defaultLng = -42.6075;
        setPosicao({ latitude: defaultLat, longitude: defaultLng, accuracy: 20 });
        const det = detectTerritoryFromGps(defaultLat, defaultLng);
        setGpsDetectado(det);
        setGpsError('Sinal GPS fraco ou não autorizado. Usando posição aproximada.');
        setLoadingGps(false);
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 5000 }
    );
  };

  useEffect(() => {
    obterLocalizacao();
  }, []);

  // Quando o agente digita na rua, filtra opções
  const handleRuaInput = (texto) => {
    setRua(texto);
    if (texto.trim().length >= 2) {
      const encontradas = buscarRuas(texto);
      setRuasFiltradas(encontradas);
      setMostrarListaRuas(encontradas.length > 0);
    } else {
      setRuasFiltradas([]);
      setMostrarListaRuas(false);
    }
  };

  // Ao selecionar uma rua da lista oficial do Carmo
  const selecionarRua = (nomeLogradouro) => {
    setRua(nomeLogradouro);
    setMostrarListaRuas(false);

    // Obtém as microáreas e quarteirões sugeridos para essa rua
    const sug = getSugestoesRua(nomeLogradouro);
    setSugestoesRua(sug);

    // Se tiver microáreas sugeridas para essa rua, seleciona a primeira como padrão
    if (sug.microareas.length > 0) {
      setMicroarea(sug.microareas[0]);
      if (BAIRROS_CARMO.includes(sug.microareas[0])) {
        setBairro(sug.microareas[0]);
      }
    }
    // Se tiver quarteirão sugerido
    if (sug.quarteiroes.length > 0) {
      const match = sug.quarteiroes[0].match(/Q\s*(.+)$/i);
      if (match) {
        setQuarteirao(match[1].trim());
      }
    }
  };

  // Aplica sugestão rápida de microárea da rua
  const aplicarMicroareaRua = (m) => {
    setMicroarea(m);
    if (BAIRROS_CARMO.includes(m)) {
      setBairro(m);
    }
    // Procura se tem quarteirão dessa microárea na sugestão da rua
    const qMatch = sugestoesRua.quarteiroes.find(q => q.toLowerCase().includes(m.toLowerCase()));
    if (qMatch) {
      const match = qMatch.match(/Q\s*(.+)$/i);
      if (match) setQuarteirao(match[1].trim());
    }
  };

  // Aplica sugestão rápida de quarteirão da rua
  const aplicarQuarteiraoRua = (qText) => {
    const match = qText.match(/Q\s*(.+)$/i);
    if (match) {
      setQuarteirao(match[1].trim());
    }
  };

  // Verifica se este agente tem algum pedido aberto
  const pedidoAtivo = (pedidos || []).find(
    (p) => p.agente_nome && nomeAgente && p.agente_nome.trim().toLowerCase() === nomeAgente.trim().toLowerCase() &&
           p.status !== 'concluido' && p.status !== 'cancelado'
  );

  const handleSolicitar = async () => {
    if (!nomeAgente.trim()) {
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
        agente_nome: nomeAgente.trim(),
        morador_nome: nomeMorador.trim(),
        rua: rua.trim(),
        numero: numero.trim(),
        bairro: bairro,
        microarea: microarea,
        quarteirao: quarteirao.startsWith('Q') ? quarteirao : `Q-${quarteirao}`,
        latitude: posicao.latitude,
        longitude: posicao.longitude,
        precisao_gps: Math.round(posicao.accuracy || 10),
        referencia: referencia.trim()
      });
      playSuccessSound();
      setNomeMorador('');
      setReferencia('');
    } catch (e) {
      alert('Erro ao enviar pedido. Tente novamente.');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto space-y-4">
      {/* CARD DE PEDIDO EM ANDAMENTO */}
      {pedidoAtivo && (
        <div className="bg-white border-2 border-amber-500 rounded-2xl p-4 shadow-lg space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-amber-900 bg-amber-100 px-2.5 py-1 rounded-md">
              Pedido em Andamento
            </span>
            <BadgeStatus status={pedidoAtivo.status} />
          </div>

          <div className="border-t border-slate-100 pt-2 text-sm text-slate-900 space-y-1">
            <div className="font-black text-base flex items-center gap-1.5 text-slate-900">
              <span className="text-xl">🪜</span>
              <span>{pedidoAtivo.agente_nome}</span>
              {pedidoAtivo.morador_nome && (
                <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                  Morador: {pedidoAtivo.morador_nome}
                </span>
              )}
            </div>

            <div className="text-xs font-bold text-slate-700 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-rose-600 shrink-0" />
              <span>
                {pedidoAtivo.rua ? `${pedidoAtivo.rua}${pedidoAtivo.numero ? `, ${pedidoAtivo.numero}` : ''} - ` : ''}
                {pedidoAtivo.bairro}
              </span>
            </div>

            <div className="text-xs font-black text-amber-900 bg-amber-50 p-1.5 rounded-lg border border-amber-200">
              Território: {pedidoAtivo.microarea} • {pedidoAtivo.quarteirao}
            </div>

            {pedidoAtivo.referencia && (
              <p className="text-xs text-slate-600 italic">Ref: "{pedidoAtivo.referencia}"</p>
            )}

            <p className="text-[11px] text-slate-500 flex items-center gap-1 pt-1">
              <Clock className="w-3 h-3" />
              Solicitado às {new Date(pedidoAtivo.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>

          {/* Etapas Visuais */}
          <div className="grid grid-cols-3 gap-1.5 pt-1 text-center text-xs font-bold">
            <div className={`p-2 rounded-lg border ${pedidoAtivo.status === 'solicitado' ? 'bg-amber-500 text-slate-950 border-amber-600 animate-pulse' : 'bg-slate-100 text-slate-500'}`}>
              1. Solicitado
            </div>
            <div className={`p-2 rounded-lg border ${pedidoAtivo.status === 'a_caminho' ? 'bg-blue-600 text-white border-blue-700 animate-pulse' : 'bg-slate-100 text-slate-500'}`}>
              2. A Caminho
            </div>
            <div className={`p-2 rounded-lg border ${pedidoAtivo.status === 'entregue' ? 'bg-emerald-600 text-white border-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
              3. Entregue
            </div>
          </div>

          <button
            type="button"
            onClick={() => onConcluirPedido(pedidoAtivo.id)}
            className="w-full mt-2 py-3 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black flex items-center justify-center gap-2 shadow-xs"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            Vistoria Concluída / Liberar Escada
          </button>
        </div>
      )}

      {/* FORMULÁRIO COMPLETO COM TODAS AS REGRAS DO ACE-FINAL */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
        <div className="border-b border-slate-100 pb-2 flex items-center justify-between">
          <h2 className="text-sm font-black text-slate-900 uppercase tracking-wide flex items-center gap-1.5">
            <span className="text-xl">🪜</span> Solicitar Escada para Vistoria
          </h2>
          <button
            type="button"
            onClick={obterLocalizacao}
            disabled={loadingGps}
            className="text-[11px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 bg-blue-50 px-2 py-1 rounded-lg"
          >
            <RefreshCw className={`w-3 h-3 ${loadingGps ? 'animate-spin' : ''}`} />
            {loadingGps ? 'GPS...' : 'Recalibrar GPS'}
          </button>
        </div>

        {/* 1. AGENTE E MORADOR */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-black text-slate-700 uppercase tracking-tight mb-1 flex items-center gap-1">
              <User className="w-3.5 h-3.5 text-amber-600" />
              Nome do Agente (ACE)*
            </label>
            <input
              type="text"
              value={nomeAgente}
              onChange={(e) => handleAgenteChange(e.target.value)}
              placeholder="Ex: Almir, Carlos, João..."
              className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold text-slate-900 text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-black text-slate-700 uppercase tracking-tight mb-1 flex items-center gap-1">
              <Home className="w-3.5 h-3.5 text-slate-500" />
              Nome do Morador
            </label>
            <input
              type="text"
              value={nomeMorador}
              onChange={(e) => setNomeMorador(e.target.value)}
              placeholder="Ex: Dona Maria, Sr. Jorge"
              className="w-full px-3 py-2 rounded-xl border border-slate-300 font-medium text-slate-900 text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
            />
          </div>
        </div>

        {/* 2. RUA COM AUTOCOMPLETE E NÚMERO */}
        <div className="space-y-1 relative">
          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-2 relative">
              <label className="block text-xs font-black text-slate-700 uppercase tracking-tight mb-1">
                Rua / Logradouro
              </label>
              <input
                type="text"
                value={rua}
                onChange={(e) => handleRuaInput(e.target.value)}
                onFocus={() => rua.trim().length >= 2 && setMostrarListaRuas(true)}
                placeholder="Digite a rua (busca rápida)"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 font-medium text-slate-900 text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />

              {/* Lista de autocomplete flutuante */}
              {mostrarListaRuas && ruasFiltradas.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-300 rounded-xl shadow-xl max-h-48 overflow-y-auto z-40 divide-y divide-slate-100">
                  {ruasFiltradas.slice(0, 10).map((r, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => selecionarRua(r.logradouro)}
                      className="w-full text-left px-3 py-2 hover:bg-amber-50 text-xs font-semibold text-slate-800 flex items-center justify-between"
                    >
                      <span>{r.logradouro}</span>
                      {r.microareas_sugeridas && (
                        <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                          {r.microareas_sugeridas.split('|')[0]}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-black text-slate-700 uppercase tracking-tight mb-1">
                Número
              </label>
              <input
                type="text"
                value={numero}
                onChange={(e) => setNumero(e.target.value)}
                placeholder="Nº ou SN"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 font-medium text-slate-900 text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>
          </div>

          {/* SUGESTÕES DE MÚLTIPLAS MICROÁREAS E QUARTEIRÕES PARA A RUA SELECIONADA */}
          {sugestoesRua.microareas.length > 0 && (
            <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-2.5 mt-2 space-y-1.5 text-xs">
              <div className="font-bold text-amber-950 flex items-center gap-1">
                <Compass className="w-3.5 h-3.5 text-amber-700" />
                Esta rua passa por mais de uma microárea. Escolha a sua:
              </div>
              <div className="flex flex-wrap gap-1.5">
                {sugestoesRua.microareas.map((m, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => aplicarMicroareaRua(m)}
                    className={`px-2.5 py-1 rounded-lg font-black text-[11px] transition-all border ${
                      microarea === m
                        ? 'bg-amber-500 text-slate-950 border-amber-600 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-amber-100'
                    }`}
                  >
                    📍 {m}
                  </button>
                ))}
              </div>

              {sugestoesRua.quarteiroes.length > 0 && (
                <div className="pt-1 flex flex-wrap items-center gap-1 text-[11px]">
                  <span className="font-bold text-amber-900">Quarteirões da rua:</span>
                  {sugestoesRua.quarteiroes.map((q, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => aplicarQuarteiraoRua(q)}
                      className="bg-white hover:bg-amber-100 border border-amber-300 text-amber-950 px-2 py-0.5 rounded font-bold"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* 3. BAIRRO, MICROÁREA E QUARTEIRÃO (DROPDOWNS COMPLETOS) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
          <div>
            <label className="block text-[11px] font-black uppercase text-slate-600 tracking-tight mb-1">
              Bairro
            </label>
            <select
              value={bairro}
              onChange={(e) => setBairro(e.target.value)}
              className="w-full px-2.5 py-2 rounded-lg border border-slate-300 font-bold text-slate-900 text-xs bg-white focus:ring-2 focus:ring-amber-500"
            >
              {BAIRROS_CARMO.map((b, i) => (
                <option key={i} value={b}>{b}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-black uppercase text-slate-600 tracking-tight mb-1">
              Microárea*
            </label>
            <select
              value={microarea}
              onChange={(e) => {
                setMicroarea(e.target.value);
                const qs = getQuarteiroesByMicroarea(e.target.value);
                if (qs.length > 0) setQuarteirao(qs[0]);
              }}
              className="w-full px-2.5 py-2 rounded-lg border border-slate-300 font-bold text-slate-900 text-xs bg-white focus:ring-2 focus:ring-amber-500"
            >
              {microareasDisponiveis.map((m, i) => (
                <option key={i} value={m}>{m}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-black uppercase text-slate-600 tracking-tight mb-1">
              Quarteirão*
            </label>
            <select
              value={quarteirao}
              onChange={(e) => setQuarteirao(e.target.value)}
              className="w-full px-2.5 py-2 rounded-lg border border-slate-300 font-black text-amber-950 text-xs bg-white focus:ring-2 focus:ring-amber-500"
            >
              {quarteiroesDisponiveis.map((q, i) => (
                <option key={i} value={q}>Q - {q}</option>
              ))}
            </select>
          </div>
        </div>

        {/* INFORMAÇÃO DO GPS TRAVADO */}
        {posicao && (
          <div className="text-[11px] text-slate-500 flex items-center justify-between px-1">
            <span className="flex items-center gap-1 font-semibold text-emerald-700">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              GPS Detectado: {gpsDetectado?.microarea} • {gpsDetectado?.quarteirao} (±{Math.round(posicao.accuracy || 10)}m)
            </span>
          </div>
        )}

        {gpsError && (
          <p className="text-xs text-amber-800 bg-amber-50 p-2 rounded-lg border border-amber-200 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            {gpsError}
          </p>
        )}

        {/* 4. REFERÊNCIA / DETALHE DA ESCADA */}
        <div>
          <label className="block text-xs font-black text-slate-700 uppercase tracking-tight mb-1">
            Ponto de Referência / Obs da Escada (Opcional)
          </label>
          <input
            type="text"
            value={referencia}
            onChange={(e) => setReferencia(e.target.value)}
            placeholder="Ex: Casa verde, telhado nos fundos, precisa escada 6m"
            className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm text-slate-900 focus:ring-2 focus:ring-amber-500 focus:outline-none"
          />
        </div>

        {/* BOTÃO PRINCIPAL DE SOLICITAÇÃO GIGANTE */}
        <button
          type="button"
          onClick={handleSolicitar}
          disabled={enviando || loadingGps}
          className="w-full py-4 px-6 rounded-2xl bg-amber-500 hover:bg-amber-400 active:scale-[0.99] text-slate-950 font-black text-base sm:text-lg shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-3 border-2 border-amber-600 disabled:opacity-50 cursor-pointer"
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
