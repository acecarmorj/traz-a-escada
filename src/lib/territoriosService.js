/**
 * Serviço de dados territoriais, ruas e correlação de Carmo - RJ.
 * Implementa as regras oficiais do ACE-FINAL:
 * - Uma rua pode pertencer a mais de uma microárea e mais de um quarteirão.
 * - Um mesmo número de quarteirão pode existir em diferentes microáreas.
 * - Relaciona Bairro, Rua, Número, Microárea e Quarteirão.
 */

export const BAIRROS_CARMO = [
  'Centro',
  'Jardim Centenário',
  'Progresso',
  'Botafogo',
  'Boa Ideia',
  "Caixa d'Água",
  'Morro do Estado',
  'Val Paraíso',
  'Todos os Santos',
  'Paraisópolis',
  'Santo Antônio',
  'Amizade',
  'Ave Maria',
  'Barra de São Francisco',
  'Córrego da Prata',
  'Ilha dos Pombos',
  'Influência',
  'Porto Velho do Cunha'
];

export function getRuasData() {
  const source = window.ACE_RUAS_CARMO;
  if (!source || !Array.isArray(source.rows)) return [];
  return source.rows;
}

export function buscarRuas(termo) {
  const rows = getRuasData();
  if (!termo || termo.trim().length < 2) return [];
  const limpo = termo.trim().toLowerCase();
  return rows.filter(r => r.logradouro && r.logradouro.toLowerCase().includes(limpo));
}

export function getSugestoesRua(nomeRua) {
  const rows = getRuasData();
  const row = rows.find(r => r.logradouro && r.logradouro.toLowerCase() === nomeRua.trim().toLowerCase());
  if (!row) {
    return {
      microareas: [],
      quarteiroes: []
    };
  }

  const microareas = String(row.microareas_sugeridas || '')
    .split('|')
    .map(s => s.trim())
    .filter(Boolean);

  const quarteiroes = String(row.quarteiroes_sugeridos || '')
    .split('|')
    .map(s => s.trim())
    .filter(Boolean);

  return {
    microareas,
    quarteiroes,
    latRef: row.latitude_ref ? parseFloat(row.latitude_ref.replace(',', '.')) : null,
    lngRef: row.longitude_ref ? parseFloat(row.longitude_ref.replace(',', '.')) : null
  };
}

export function getMicroareasList() {
  const source = window.ACE_TERRITORY_SOURCE;
  if (source && source.meta && source.meta.catalog && Array.isArray(source.meta.catalog.territories)) {
    return source.meta.catalog.territories;
  }
  return [
    'Centro',
    'Jardim Centenário',
    'Progresso',
    'Botafogo',
    'Boa Ideia',
    "Caixa d'Água",
    'Morro do Estado',
    'Val Paraíso',
    'Barra de São Francisco',
    'Córrego da Prata',
    'Ilha dos Pombos',
    'Influência',
    'Porto Velho do Cunha'
  ];
}

export function getQuarteiroesByMicroarea(microarea) {
  const source = window.ACE_TERRITORY_SOURCE;
  if (!source) return [];

  // 1. Tenta catálogo estruturado
  if (source.meta && source.meta.catalog && source.meta.catalog.byTerritory && source.meta.catalog.byTerritory[microarea]) {
    const list = source.meta.catalog.byTerritory[microarea];
    if (list && list.length > 0) return list;
  }

  // 2. Tenta extrair diretamente dos polígonos
  if (Array.isArray(source.polygons)) {
    const set = new Set();
    source.polygons.forEach(p => {
      if (p.folder && p.folder.toLowerCase() === (microarea || '').toLowerCase()) {
        if (p.name) set.add(p.name);
      }
    });
    if (set.size > 0) return Array.from(set).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }

  // Padrão genérico de 1 a 20 se não mapeado
  return Array.from({ length: 20 }, (_, i) => String(i + 1));
}
