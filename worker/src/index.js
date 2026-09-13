/**
 * Cloudflare Worker API para o sistema Traz a Escada (ACE Dengue Carmo).
 * Persistência ultrarrápida com Cloudflare D1 (SQLite).
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders,
    },
  });
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);
    const path = url.pathname;

    try {
      // 1. Health check
      if (path === '/api/health' || path === '/health') {
        return json({ status: 'ok', app: 'Traz a Escada ACE Carmo', timestamp: new Date().toISOString() });
      }

      // 2. Listar pedidos
      if (path === '/api/pedidos' && request.method === 'GET') {
        const query = `
          SELECT * FROM pedidos_escada 
          ORDER BY created_at DESC 
          LIMIT 50
        `;
        const { results } = await env.DB.prepare(query).all();
        return json(results || []);
      }

      // 3. Criar pedido
      if (path === '/api/pedidos' && request.method === 'POST') {
        const body = await request.json();
        const id = body.id || `escada-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
        const now = new Date().toISOString();

        const insert = `
          INSERT INTO pedidos_escada (
            id, agente_nome, microarea, quarteirao, latitude, longitude, precisao_gps, referencia, status, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        await env.DB.prepare(insert)
          .bind(
            id,
            body.agente_nome,
            body.microarea,
            body.quarteirao,
            body.latitude,
            body.longitude,
            body.precisao_gps || 10,
            body.referencia || '',
            'solicitado',
            now,
            now
          )
          .run();

        return json({ id, status: 'solicitado', message: 'Pedido criado com sucesso' }, 201);
      }

      // 4. Atualizar status do pedido: /api/pedidos/:id/status
      if (path.startsWith('/api/pedidos/') && request.method === 'PATCH') {
        const parts = path.split('/');
        const id = parts[3];
        const body = await request.json();
        const novoStatus = body.status;
        const now = new Date().toISOString();

        let updateQuery = `UPDATE pedidos_escada SET status = ?, updated_at = ? WHERE id = ?`;
        let params = [novoStatus, now, id];

        if (novoStatus === 'entregue') {
          updateQuery = `UPDATE pedidos_escada SET status = ?, updated_at = ?, entregue_at = ? WHERE id = ?`;
          params = [novoStatus, now, now, id];
        }

        await env.DB.prepare(updateQuery).bind(...params).run();
        return json({ id, status: novoStatus, updated_at: now });
      }

      return json({ error: 'Endpoint não encontrado' }, 404);
    } catch (err) {
      return json({ error: err.message || 'Erro interno do servidor' }, 500);
    }
  },
};
