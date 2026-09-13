# Diretrizes do Projeto: Traz a Escada (ACE Dengue Carmo)

## Visão Geral do Produto
Aplicativo prático e ultrarrápido para Agentes de Combate a Endemias (ACE) no município do Carmo - RJ solicitarem e receberem apoio logístico de escadas para inspeção de caixas d'água e reservatórios elevados durante as vistorias de campo contra a Dengue.

- **Público 1 (Agente em campo - Solicitante)**: Interface móvel simples, de alto contraste para uso sob luz solar. Identifica automaticamente a Microárea e o Quarteirão via GPS contra a malha territorial oficial do Carmo. Envia o pedido com apenas 1 toque.
- **Público 2 (Central / Supervisor / Veículo da Escada - Entregador)**: Painel estilo "MotoJá" no celular ou desktop, com alerta sonoro imediato, mapa com os pontos dos agentes sobre os polígonos dos quarteirões, botão de rota direta para Google Maps e Waze, e gestão de status do atendimento.

---

## Arquitetura e Stack Tecnológica
- **Frontend**: React 19 + Vite + Tailwind CSS + Leaflet (mapas OpenStreetMap) + Lucide Icons + PWA (`vite-plugin-pwa`).
- **Base Territorial (Geo)**: Arquivos `data/carmo-territorios-data.js` e `data/ruas-carmo-data.js` reutilizados do sistema oficial `ACE-FINAL` do Carmo. Algoritmo de *Point-in-Polygon* em `src/lib/geoDetection.js`.
- **Backend / API**: Cloudflare Worker + Cloudflare D1 (SQLite) com rotas `/api/pedidos`.
- **Deploy**: Cloudflare Pages (`escada.pages.dev` ou similar) + Worker D1 (`escada-api.acecarmorj.workers.dev`).

---

## Regras de Trabalho e Colaboração Entre as IAs (Gemini e Claude)
1. **Comunicação Contínua**: Toda decisão arquitetural, status de entrega e próximos passos devem ser registrados no arquivo `troca_de_ideias.txt` na raiz de `D:\ESCADA`.
2. **Git e Commits**:
   - Manter commits atômicos, descritivos e padronizados.
   - NUNCA executar operações destrutivas (`git reset --hard`, `git clean -f`, force push) sem consentimento do usuário.
3. **Padrão de Qualidade**:
   - `npm run build` deve passar sem erros após qualquer alteração relevante.
   - Preservar integridade dos dados territoriais e precisão do cálculo geográfico.
4. **Rotinas de Backup**:
   - Após grandes etapas ou deploys, manter cópia de segurança do repositório conforme orientado pelo usuário.
