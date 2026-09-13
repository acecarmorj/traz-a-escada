/**
 * Camada de comunicação de dados com suporte híbrido:
 * 1. API Cloudflare Worker (D1 SQLite).
 * 2. Fallback de sincronização instantânea em tempo real via BroadcastChannel + LocalStorage
 *    (permite testar localmente em duas abas ou na rede sem precisar do deploy imediato).
 */

const LOCAL_STORAGE_KEY = 'traz_a_escada_pedidos_v1';
const broadcast = typeof window !== 'undefined' && window.BroadcastChannel 
  ? new BroadcastChannel('traz_a_escada_sync') 
  : null;

// Configuração de API (relativa se mesmo domínio ou URL configurada)
const API_BASE = '/api';

function getLocalPedidos() {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function setLocalPedidos(pedidos) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(pedidos));
    if (broadcast) {
      broadcast.postMessage({ type: 'UPDATE', pedidos });
    }
  } catch (e) {
    console.warn("Falha ao salvar no storage local:", e);
  }
}

export const api = {
  /**
   * Cria um novo pedido de escada
   */
  async criarPedido(dados) {
    const novoPedido = {
      id: "escada-" + Date.now() + "-" + Math.random().toString(36).substring(2, 7),
      agente_nome: dados.agente_nome,
      microarea: dados.microarea,
      quarteirao: dados.quarteirao,
      latitude: dados.latitude,
      longitude: dados.longitude,
      precisao_gps: dados.precisao_gps || 10,
      referencia: dados.referencia || '',
      status: 'solicitado', // solicitado | a_caminho | entregue | concluido | cancelado
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Salva local e propaga broadcast
    const lista = getLocalPedidos();
    lista.unshift(novoPedido);
    setLocalPedidos(lista);

    // Tenta sincronizar com Cloudflare se a rota existir
    try {
      await fetch(`${API_BASE}/pedidos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(novoPedido)
      });
    } catch (err) {
      // Offline ou ambiente local puro: fallback silencioso
    }

    return novoPedido;
  },

  /**
   * Lista todos os pedidos
   */
  async listarPedidos() {
    let remotos = null;
    try {
      const res = await fetch(`${API_BASE}/pedidos`);
      if (res.ok) {
        remotos = await res.json();
      }
    } catch (err) {
      // Falha de rede: usa cache local
    }

    if (Array.isArray(remotos) && remotos.length > 0) {
      setLocalPedidos(remotos);
      return remotos;
    }

    return getLocalPedidos();
  },

  /**
   * Atualiza o status de um pedido
   * status: 'solicitado' | 'a_caminho' | 'entregue' | 'concluido' | 'cancelado'
   */
  async atualizarStatus(id, novoStatus) {
    const lista = getLocalPedidos();
    const idx = lista.findIndex(p => p.id === id);
    if (idx !== -1) {
      lista[idx].status = novoStatus;
      lista[idx].updated_at = new Date().toISOString();
      if (novoStatus === 'entregue') {
        lista[idx].entregue_at = new Date().toISOString();
      }
      setLocalPedidos(lista);
    }

    try {
      await fetch(`${API_BASE}/pedidos/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: novoStatus })
      });
    } catch (err) {
      // offline fallback
    }

    return lista[idx] || null;
  },

  /**
   * Inscreve um ouvinte para atualizações em tempo real (mudanças locais ou recebidas)
   */
  onUpdate(callback) {
    if (!broadcast) return () => {};

    const handler = (event) => {
      if (event.data && event.data.type === 'UPDATE') {
        callback(event.data.pedidos);
      }
    };

    broadcast.addEventListener('message', handler);

    // Também escuta eventos de storage entre janelas diferentes
    const storageHandler = (e) => {
      if (e.key === LOCAL_STORAGE_KEY) {
        callback(getLocalPedidos());
      }
    };
    window.addEventListener('storage', storageHandler);

    return () => {
      broadcast.removeEventListener('message', handler);
      window.removeEventListener('storage', storageHandler);
    };
  }
};
