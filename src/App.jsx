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

  const handleMudarStatus = async (id, status) => {
    const atualizado = await api.atualizarStatus(id, status);
    setPedidos(prev => prev.map(p => p.id === id ? { ...p, status } : p));
    return atualizado;
  };

  const countPendentes = pedidos.filter(p => p.status === 'solicitado').length;

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans">
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        countPendentes={countPendentes}
      />

      <main className="flex-1 p-3 sm:p-4 max-w-4xl w-full mx-auto">
        {activeTab === 'agente' ? (
          <SolicitarEscadaScreen
            pedidos={pedidos}
            onCriarPedido={handleCriarPedido}
            onConcluirPedido={(id) => handleMudarStatus(id, 'concluido')}
          />
        ) : (
          <PainelCentralScreen
            pedidos={pedidos}
            driverPos={driverPos}
            onMudarStatus={handleMudarStatus}
          />
        )}
      </main>

      <footer className="py-4 px-4 text-center text-xs text-slate-500 border-t border-slate-200 bg-white space-y-1">
        <p className="font-semibold text-slate-700">
          Programa Municipal de Combate às Endemias • Carmo - RJ
        </p>
        <p className="text-slate-500">
          Desenvolvido por <span className="font-bold text-amber-700">@AlmirLK</span>
        </p>
      </footer>
    </div>
  );
}
