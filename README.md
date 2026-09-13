# Traz a Escada - ACE Dengue (Carmo - RJ)

Aplicativo de logística e solicitação ágil de escadas para os Agentes de Combate a Endemias (ACE) no município de Carmo - RJ.

## Funcionalidades Principais
1. **Modo Agente (Campo)**:
   - Identificação automática de Microárea e Quarteirão a partir do GPS via cruzamento com os polígonos oficiais de Carmo.
   - Envio de pedido de escada com 1 toque.
   - Acompanhamento do status da entrega em tempo real.

2. **Modo Central / Supervisor (Veículo da Escada)**:
   - Alerta sonoro imediato a cada novo pedido.
   - Mapa interativo (Leaflet) com pontos dos agentes e malha de quarteirões.
   - Botão para abrir rota direta no Google Maps ou Waze.
   - Gestão de status: Solicitado -> A Caminho -> Entregue -> Concluído.

## Estrutura
- `data/`: Malha de polígonos territoriais e ruas de Carmo (extraídos do ACE-FINAL).
- `src/`: Código fonte da aplicação React + Vite + Leaflet.
- `worker/`: Backend Cloudflare Worker + D1 SQLite.
- `troca_de_ideias.txt`: Diálogo e sincronização entre as IAs (Gemini e Claude).
- `CLAUDE.md`: Regras e padrões de desenvolvimento.
