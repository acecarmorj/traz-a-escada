const fs = require('fs');
const path = require('path');

const kmlPath = path.join(__dirname, '../data/carmo_kml_extracted/doc.kml');
const kmlContent = fs.readFileSync(kmlPath, 'utf8');

// Parser simples e robusto para KML
function parseKml(kml) {
  const polygons = [];
  const catalog = {
    territories: [],
    byTerritory: {}
  };

  // Divide em Folders e Placemarks fora de Folders
  // Procuramos blocos <Folder> e <Placemark>
  const folderRegex = /<Folder[\s\S]*?<\/Folder>/g;
  let folderMatch;

  let polyIndex = 1;

  // Processa folders
  const processedPlacemarkStarts = new Set();

  while ((folderMatch = folderRegex.exec(kml)) !== null) {
    const folderBlock = folderMatch[0];
    const folderNameMatch = folderBlock.match(/<Folder[^>]*>[\s\S]*?<name>(.*?)<\/name>/);
    let folderName = folderNameMatch ? folderNameMatch[1].replace(/&apos;/g, "'").trim() : 'Geral';
    
    // Normaliza nome do folder
    if (folderName === "CAIXA D'AGUA") folderName = "Caixa d'Água";
    if (folderName === "VAL PARAÍSO") folderName = "Val Paraíso";
    if (folderName === "MORRO DO ESTADO") folderName = "Morro do Estado";
    if (folderName === "JARDIM CENTENÁRIO") folderName = "Jardim Centenário";
    if (folderName === "PROGRESSO") folderName = "Progresso";
    if (folderName === "CENTRO") folderName = "Centro";
    if (folderName === "BOA IDEIA") folderName = "Boa Ideia";
    if (folderName === "BOTAFOGO") folderName = "Botafogo";

    if (!catalog.byTerritory[folderName]) {
      catalog.byTerritory[folderName] = [];
      if (!catalog.territories.includes(folderName)) {
        catalog.territories.push(folderName);
      }
    }

    const placemarkRegex = /<Placemark[\s\S]*?<\/Placemark>/g;
    let pmMatch;
    while ((pmMatch = placemarkRegex.exec(folderBlock)) !== null) {
      const pmBlock = pmMatch[0];
      const nameMatch = pmBlock.match(/<name>(.*?)<\/name>/);
      const coordMatch = pmBlock.match(/<coordinates>([\s\S]*?)<\/coordinates>/);
      
      if (nameMatch && coordMatch) {
        const rawName = nameMatch[1].replace(/&apos;/g, "'").trim();
        let cleanName = rawName.replace(/^Q\s*-\s*/i, '').trim();
        const rawCoords = coordMatch[1].trim().split(/\s+/);
        
        const coords = [];
        for (const c of rawCoords) {
          const parts = c.split(',');
          if (parts.length >= 2) {
            const lng = parseFloat(parts[0]);
            const lat = parseFloat(parts[1]);
            if (!isNaN(lat) && !isNaN(lng)) {
              coords.push([lat, lng]);
            }
          }
        }

        if (coords.length >= 3) {
          polygons.push({
            id: `poly-${polyIndex++}`,
            folder: folderName,
            originalFolder: folderNameMatch ? folderNameMatch[1] : folderName,
            path: [folderName],
            name: cleanName,
            originalName: rawName,
            description: "",
            territoryType: folderName === "DISTRITOS" ? "distrito" : "area",
            coordinates: coords
          });

          if (!catalog.byTerritory[folderName].includes(cleanName)) {
            catalog.byTerritory[folderName].push(cleanName);
          }
        }
      }
    }
  }

  // Processa Placemarks soltos (ex: Praças do Centro)
  // Remove folders para achar o que sobrou
  const kmlWithoutFolders = kml.replace(/<Folder[\s\S]*?<\/Folder>/g, '');
  const loosePmRegex = /<Placemark[\s\S]*?<\/Placemark>/g;
  let looseMatch;

  if (!catalog.byTerritory["Centro"]) {
    catalog.byTerritory["Centro"] = [];
    catalog.territories.push("Centro");
  }

  while ((looseMatch = loosePmRegex.exec(kmlWithoutFolders)) !== null) {
    const pmBlock = looseMatch[0];
    const nameMatch = pmBlock.match(/<name>(.*?)<\/name>/);
    const coordMatch = pmBlock.match(/<coordinates>([\s\S]*?)<\/coordinates>/);

    if (nameMatch && coordMatch) {
      const rawName = nameMatch[1].replace(/&apos;/g, "'").trim();
      const rawCoords = coordMatch[1].trim().split(/\s+/);
      const coords = [];
      for (const c of rawCoords) {
        const parts = c.split(',');
        if (parts.length >= 2) {
          const lng = parseFloat(parts[0]);
          const lat = parseFloat(parts[1]);
          if (!isNaN(lat) && !isNaN(lng)) {
            coords.push([lat, lng]);
          }
        }
      }

      if (coords.length >= 3) {
        polygons.push({
          id: `poly-${polyIndex++}`,
          folder: "Centro",
          originalFolder: "Praças",
          path: ["Centro", "Praças"],
          name: rawName,
          originalName: rawName,
          description: "Praça / Ponto de Referência",
          territoryType: "praca",
          coordinates: coords
        });

        if (!catalog.byTerritory["Centro"].includes(rawName)) {
          catalog.byTerritory["Centro"].push(rawName);
        }
      }
    }
  }

  return {
    generatedAt: new Date().toISOString(),
    source: "CARMO.kmz",
    meta: {
      note: "Base territorial oficial atualizada via CARMO.kmz enviado pelo usuário.",
      catalog
    },
    polygons,
    points: []
  };
}

const parsed = parseKml(kmlContent);
console.log(`Sucesso! ${parsed.polygons.length} polígonos processados.`);
console.log('Territórios encontrados:', Object.keys(parsed.meta.catalog.byTerritory));

const jsContent = `window.ACE_TERRITORY_SOURCE = ${JSON.stringify(parsed)};\n`;

fs.writeFileSync(path.join(__dirname, '../data/carmo-territorios-data.js'), jsContent, 'utf8');
fs.writeFileSync(path.join(__dirname, '../public/data/carmo-territorios-data.js'), jsContent, 'utf8');
console.log('Arquivos carmo-territorios-data.js atualizados em data/ e public/data/!');
