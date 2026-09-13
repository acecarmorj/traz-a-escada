-- Criação da tabela de pedidos de escada para o combate à Dengue com suporte a endereço e morador
CREATE TABLE IF NOT EXISTS pedidos_escada (
  id TEXT PRIMARY KEY,
  agente_nome TEXT NOT NULL,
  morador_nome TEXT,
  rua TEXT,
  numero TEXT,
  bairro TEXT,
  microarea TEXT NOT NULL,
  quarteirao TEXT NOT NULL,
  latitude REAL NOT NULL,
  longitude REAL NOT NULL,
  precisao_gps REAL,
  referencia TEXT,
  status TEXT NOT NULL DEFAULT 'solicitado', -- solicitado, a_caminho, entregue, concluido, cancelado
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  entregue_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_pedidos_status ON pedidos_escada(status);
CREATE INDEX IF NOT EXISTS idx_pedidos_created ON pedidos_escada(created_at DESC);
