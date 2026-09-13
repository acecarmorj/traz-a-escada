/**
 * Camada de comunicação de dados com suporte híbrido:
 * 1. API Cloudflare Worker (D1 SQLite).
 * 2. Fallback de sincronização instantânea em tempo real via BroadcastChannel + LocalStorage.
 */

const LOCAL_STORAGE_KEY = 'traz_a_escada_pedidos_v2';
const broadcast = typeof window !== 'undefined' && window.BroadcastChannel 
  ? new BroadcastChannel('traz_a_escada_sync') 
  : null;

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
   * Cria um novo pedido completo de escada
   */
  async criarPedido(dados) {
    const novoPedido = {
      id: "escada-" + Date.now() + "-" + Math.random().toString(36).substring(2, 7),
      agente_nome: dados.agente_nome || 'Agente ACE',
      morador_nome: dados.morador_nome || '',
      rua: dados.rua || '',
      numero: dados.numero || '',
      bairro: dados.bairro || '',
      microarea: dados.microarea || '',
      quarteirao: dados.quarteirao || '',
      latitude: dados.latitude,
      longitude: dados.longitude,
      precisao_gps: dados.precisao_gps || 10,
      referencia: dados.referencia || '',
      status: 'solicitado', // solicitado | a_caminho | entregue | concluido | cancelado
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const lista = getLocalPedidos();
    lista.unshift(novoPedido);
    setLocalPedidos(lista);

    try {
      await fetch(`${API_BASE}/pedidos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(novoPedido)
      });
    } catch (err) {
      // offline fallback
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
      // offline
    }

    if (Array.isArray(remotos) && remotos.length > 0) {
      setLocalPedidos(remotos);
      return remotos;
    }

    return getLocalPedidos();
  },

  /**
   * Atualiza o status de um pedido
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
      // offline
    }

    return lista[idx] || null;
  },

  onUpdate(callback) {
    if (!broadcast) return () => {};

    const handler = (event) => {
      if (event.data && event.data.type === 'UPDATE') {
        callback(event.data.pedidos);
      }
    };

    broadcast.addEventListener('message', handler);

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
