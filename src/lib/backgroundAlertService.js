/**
 * Serviço de Monitoramento e Alertas em Segundo Plano
 * para o Agente de Despacho (Motorista / Carro da Escada).
 * 
 * Recursos:
 * 1. Notificações do Sistema (mesmo com tela apagada / navegador minimizado).
 * 2. Alerta imediato a cada novo pedido.
 * 3. Repetição sonora a cada 1 minuto (60s) enquanto houver chamados pendentes
 *    até serem atendidos (a caminho) ou cancelados.
 * 4. Screen Wake Lock (mantém a tela ativa durante o plantão).
 * 5. Polling contínuo em nuvem para sincronizar com o 4G dos agentes.
 */

import { playNewRequestSound, stopAlarmLoop } from './soundAlert';
import { api } from './api';

let reminderInterval = null;
let pollingInterval = null;
let wakeLock = null;
let lastKnownPendingIds = new Set();

/**
 * Solicita permissão de notificações do sistema
 */
export async function requestNotificationPermission() {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }
  if (Notification.permission === 'granted') {
    return true;
  }
  try {
    const perm = await Notification.requestPermission();
    return perm === 'granted';
  } catch (e) {
    return false;
  }
}

/**
 * Registra o Service Worker
 */
export async function registerServiceWorker() {
  if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
    try {
      const reg = await navigator.serviceWorker.register('/sw.js');
      return reg;
    } catch (err) {
      console.warn('Falha ao registrar SW:', err);
    }
  }
  return null;
}

/**
 * Emite uma notificação do sistema (no Android / iOS) com som e vibração
 */
export async function showSystemNotification(titulo, corpo, tag = 'escada-alerta') {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;

  const options = {
    body: corpo,
    icon: '/data/ace-field-icon-192.png',
    badge: '/data/ace-field-icon-192.png',
    tag: tag,
    renotify: true,
    requireInteraction: true,
    vibrate: [500, 250, 500, 250, 1000]
  };

  try {
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.ready;
      if (reg && reg.showNotification) {
        await reg.showNotification(titulo, options);
        return;
      }
    }
    new Notification(titulo, options);
  } catch (e) {
    console.warn('Erro ao disparar notificação:', e);
  }
}

/**
 * Mantém a tela do celular ligada durante o trabalho
 */
export async function requestScreenWakeLock() {
  if ('wakeLock' in navigator) {
    try {
      wakeLock = await navigator.wakeLock.request('screen');
      wakeLock.addEventListener('release', () => {
        wakeLock = null;
      });
      return true;
    } catch (err) {
      return false;
    }
  }
  return false;
}

export function releaseScreenWakeLock() {
  if (wakeLock) {
    wakeLock.release().catch(() => {});
    wakeLock = null;
  }
}

/**
 * Inicia o supervisor de despacho com alertas a cada pedido e a cada 1 minuto
 */
export function startBackgroundSupervisor({ onPedidosAtualizados, getPedidosAtuais }) {
  stopBackgroundSupervisor();

  // 1. Polling a cada 10 segundos para buscar novos chamados no Cloudflare D1
  pollingInterval = setInterval(async () => {
    try {
      const remotos = await api.listarPedidos();
      if (Array.isArray(remotos)) {
        if (onPedidosAtualizados) onPedidosAtualizados(remotos);

        const pendentes = remotos.filter(p => p.status === 'solicitado');
        const novosIds = pendentes.map(p => p.id);

        // Se entrou um chamado novo que não estava registrado
        const temNovo = novosIds.some(id => !lastKnownPendingIds.has(id));
        if (temNovo && pendentes.length > 0) {
          const ultimo = pendentes[0];
          playNewRequestSound();
          showSystemNotification(
            'NOVO PEDIDO DE ESCADA!',
            `Agente ${ultimo.agente_nome} aguarda no ${ultimo.quarteirao} - ${ultimo.rua}.`,
            'novo-pedido'
          );
        }

        lastKnownPendingIds = new Set(novosIds);
      }
    } catch (e) {
      // offline fallback
    }
  }, 10000);

  // 2. Loop de Lembrete: A CADA 1 MINUTO (60 segundos) enquanto houver chamado pendente
  reminderInterval = setInterval(() => {
    const lista = getPedidosAtuais ? getPedidosAtuais() : [];
    const pendentes = lista.filter(p => p.status === 'solicitado');

    if (pendentes.length > 0) {
      // Alerta sonoro e vibração
      playNewRequestSound();

      // Notificação do sistema
      const qtd = pendentes.length;
      const primeiro = pendentes[0];
      showSystemNotification(
        `CHAMADO PENDENTE (${qtd})`,
        `${primeiro.agente_nome}: ${primeiro.rua} (${primeiro.quarteirao}). Toque para atender.`,
        'lembrete-minuto'
      );
    }
  }, 60000); // 60 segundos (1 minuto)
}

/**
 * Para todos os alertas de segundo plano
 */
export function stopBackgroundSupervisor() {
  if (reminderInterval) {
    clearInterval(reminderInterval);
    reminderInterval = null;
  }
  if (pollingInterval) {
    clearInterval(pollingInterval);
    pollingInterval = null;
  }
  stopAlarmLoop();
  releaseScreenWakeLock();
}
