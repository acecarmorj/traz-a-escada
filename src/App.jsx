import React, { useState, useEffect, useRef } from 'react';
import { Header } from './components/Header';
import { SolicitarEscadaScreen } from './features/agente/SolicitarEscadaScreen';
import { PainelCentralScreen } from './features/central/PainelCentralScreen';
import { api } from './lib/api';
import { playNewRequestSound } from './lib/soundAlert';

export function App() {
  const [activeTab, setActiveTab] = useState('agente'); // 'agente' | 'central'
  const [pedidos, setPedidos] = useState([]);
  const [driverPos, setDriverPos] = useState(null);
  const prevCountRef = useRef(0);

  // Carrega pedidos e assina atualizações em tempo real
  useEffect(() => {
    async function carregar() {
      const lista = await api.listarPedidos();
      setPedidos(lista);
      prevCountRef.current = lista.filter(p => p.status === 'solicitado').length;
    }
    carregar();

    const unsubscribe = api.onUpdate((novosPedidos) => {
      setPedidos(novosPedidos);

      // Se entrou novo pedido solicitado, dispara o bipe sonoro de alerta
      const pendentesNovos = novosPedidos.filter(p => p.status === 'solicitado').length;
      if (pendentesNovos > prevCountRef.current) {
        playNewRequestSound();
      }
      prevCountRef.current = pendentesNovos;
    });

    // Tenta obter GPS contínuo para o motorista/veículo se estiver na aba central
    let watchId = null;
    if (navigator.geolocation) {
      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          setDriverPos({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude
          });
        },
        null,
        { enableHighAccuracy: true, maximumAge: 10000 }
      );
    }

    return () => {
      unsubscribe();
      if (watchId !== null) navigator.geolocation.clearWatch(watchId);
    };
  }, []);

  const handleCriarPedido = async (dados) => {
    const novo = await api.criarPedido(dados);
    setPedidos(prev => [novo, ...prev]);
    return novo;
  };

  const handleMudarStatus = async (id, status, detalhes = {}) => {
    const atualizado = await api.atualizarStatus(id, status, detalhes);
    setPedidos(prev => prev.map(p => p.id === id ? { ...p, status, ...detalhes } : p));
    return atualizado;
  };

  const countPendentes = pedidos.filter(p => p.status === 'solicitado').length;

  return (
    <div className="h-[100dvh] max-h-[100dvh] w-full flex flex-col overflow-hidden bg-slate-950 font-sans">
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        countPendentes={countPendentes}
      />

      <main className="flex-1 relative w-full h-full overflow-hidden">
        {activeTab === 'agente' ? (
          <SolicitarEscadaScreen
            pedidos={pedidos}
            driverPos={driverPos}
            onCriarPedido={handleCriarPedido}
            onConcluirPedido={(id) => handleMudarStatus(id, 'concluido')}
            onCancelarPedido={(id) => handleMudarStatus(id, 'cancelado')}
          />
        ) : (
          <PainelCentralScreen
            pedidos={pedidos}
            driverPos={driverPos}
            onMudarStatus={handleMudarStatus}
          />
        )}
      </main>
    </div>
  );
}
