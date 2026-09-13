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
      if (path === '/api/health' || path === '/health') {
        return json({ status: 'ok', app: 'Traz a Escada ACE Carmo', timestamp: new Date().toISOString() });
      }

      // Listar pedidos
      if (path === '/api/pedidos' && request.method === 'GET') {
        const query = `
          SELECT * FROM pedidos_escada 
          ORDER BY created_at DESC 
          LIMIT 50
        `;
        const { results } = await env.DB.prepare(query).all();
        return json(results || []);
      }

      // Criar pedido
      if (path === '/api/pedidos' && request.method === 'POST') {
        const body = await request.json();
        const id = body.id || `escada-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
        const now = new Date().toISOString();

        const insert = `
          INSERT INTO pedidos_escada (
            id, agente_nome, morador_nome, rua, numero, bairro, microarea, quarteirao, 
            latitude, longitude, precisao_gps, referencia, status, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        await env.DB.prepare(insert)
          .bind(
            id,
            body.agente_nome || 'Agente ACE',
            body.morador_nome || '',
            body.rua || '',
            body.numero || '',
            body.bairro || '',
            body.microarea || '',
            body.quarteirao || '',
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

      // Atualizar status e/ou coordenadas do motorista
      if (path.startsWith('/api/pedidos/') && request.method === 'PATCH') {
        const parts = path.split('/');
        const id = parts[3];
        const body = await request.json();
        const now = new Date().toISOString();

        let updateQuery = `
          UPDATE pedidos_escada 
          SET status = COALESCE(?, status), 
              updated_at = ?,
              resultado_visita = COALESCE(?, resultado_visita),
              observacao_desfecho = COALESCE(?, observacao_desfecho),
              finalizado_por = COALESCE(?, finalizado_por),
              motorista_lat = COALESCE(?, motorista_lat),
              motorista_lng = COALESCE(?, motorista_lng),
              motorista_nome = COALESCE(?, motorista_nome)
          WHERE id = ?
        `;
        let params = [
          body.status || null, 
          now, 
          body.resultado_visita || null, 
          body.observacao_desfecho || null, 
          body.finalizado_por || null, 
          body.motorista_lat !== undefined ? body.motorista_lat : null,
          body.motorista_lng !== undefined ? body.motorista_lng : null,
          body.motorista_nome || null,
          id
        ];

        if (body.status === 'entregue' || body.status === 'concluido') {
          updateQuery = `
            UPDATE pedidos_escada 
            SET status = COALESCE(?, status), 
                updated_at = ?, 
                entregue_at = COALESCE(entregue_at, ?),
                resultado_visita = COALESCE(?, resultado_visita),
                observacao_desfecho = COALESCE(?, observacao_desfecho),
                finalizado_por = COALESCE(?, finalizado_por),
                motorista_lat = COALESCE(?, motorista_lat),
                motorista_lng = COALESCE(?, motorista_lng),
                motorista_nome = COALESCE(?, motorista_nome)
            WHERE id = ?
          `;
          params = [
            body.status || null, 
            now, 
            now, 
            body.resultado_visita || null, 
            body.observacao_desfecho || null, 
            body.finalizado_por || null, 
            body.motorista_lat !== undefined ? body.motorista_lat : null,
            body.motorista_lng !== undefined ? body.motorista_lng : null,
            body.motorista_nome || null,
            id
          ];
        }

        await env.DB.prepare(updateQuery).bind(...params).run();
        return json({ 
          id, 
          status: body.status, 
          resultado_visita: body.resultado_visita, 
          observacao_desfecho: body.observacao_desfecho, 
          motorista_lat: body.motorista_lat,
          motorista_lng: body.motorista_lng,
          updated_at: now 
        });
      }

      return json({ error: 'Endpoint não encontrado' }, 404);
    } catch (err) {
      return json({ error: err.message || 'Erro interno do servidor' }, 500);
    }
  },
};
