import axios from 'axios';
import { DOMParser } from '@xmldom/xmldom';

const DEFAULT_SOURCE = 'xml_feed';
const MAX_XML_BYTES = 15 * 1024 * 1024;

const LISTING_TAGS = ['Listing', 'listing', 'Imovel', 'imovel', 'Property', 'property'];

const TEXT_PATHS = {
  externalId: ['ListingID', 'id_imovel', 'Codigo', 'CodigoImovel', 'Code', 'ID', 'Id'],
  title: ['Title', 'titulo', 'Titulo', 'Headline', 'Name'],
  description: ['Details.Description', 'Description', 'descricao', 'Descricao', 'Observacao'],
  detailUrl: ['DetailViewUrl', 'url_detalhes', 'URL', 'Url', 'Link'],
  transaction: ['TransactionType', 'tipo_transacao', 'Finalidade', 'Purpose', 'BusinessType'],
  publication: ['PublicationType', 'tipo_publicacao'],
  propertyType: ['Details.PropertyType', 'PropertyType', 'tipo_imovel', 'TipoImovel', 'Tipo'],
  priceSale: ['Details.ListPrice._', 'Details.ListPrice', 'ListPrice', 'preco', 'PrecoVenda', 'ValorVenda', 'SalePrice'],
  priceRent: ['Details.RentalPrice._', 'Details.RentalPrice', 'RentalPrice', 'preco_aluguel', 'PrecoAluguel', 'ValorLocacao', 'RentPrice'],
  bedrooms: ['Details.Bedrooms', 'Bedrooms', 'quartos', 'Dormitorios'],
  bathrooms: ['Details.Bathrooms', 'Bathrooms', 'banheiros', 'Banheiros'],
  suites: ['Details.Suites', 'Suites', 'suites'],
  garage: ['Details.Garage', 'Details.ParkingSpaces', 'Garage', 'ParkingSpaces', 'garagem', 'Vagas'],
  totalArea: ['Details.LotArea._', 'Details.LotArea', 'LotArea', 'area_total', 'AreaTotal'],
  usefulArea: ['Details.LivingArea._', 'Details.LivingArea', 'LivingArea', 'area_util', 'AreaUtil', 'AreaPrivativa'],
  country: ['Location.Country', 'Country', 'pais'],
  state: ['Location.State', 'State', 'estado', 'UF'],
  city: ['Location.City', 'City', 'cidade', 'Cidade'],
  neighborhood: ['Location.Neighborhood', 'Neighborhood', 'bairro', 'Bairro'],
  address: ['Location.Address', 'Address', 'endereco', 'Endereco', 'Logradouro'],
  latitude: ['Location.Latitude', 'Latitude', 'latitude'],
  longitude: ['Location.Longitude', 'Longitude', 'longitude'],
  updatedAt: ['UpdatedAt', 'LastUpdate', 'DataAtualizacao', 'Updated'],
  listingStatus: ['Status', 'ListingStatus', 'external_listing_status'],
};

export async function fetchXmlFromUrl(url) {
  const parsed = new URL(url);
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error('URL do XML deve usar http ou https.');
  }

  const response = await axios.get(url, {
    responseType: 'text',
    timeout: 30000,
    maxContentLength: MAX_XML_BYTES,
    headers: {
      Accept: 'application/xml,text/xml,*/*',
      'User-Agent': 'IMOBZY XML Importer/1.0',
    },
  });

  return String(response.data || '');
}

export function parseXmlProperties(xml, options = {}) {
  if (!xml || typeof xml !== 'string') {
    throw new Error('XML vazio ou invalido.');
  }
  if (Buffer.byteLength(xml, 'utf8') > MAX_XML_BYTES) {
    throw new Error('XML excede o limite de 15MB.');
  }

  const doc = new DOMParser({
    errorHandler: {
      warning: () => {},
      error: () => {},
      fatalError: (message) => {
        throw new Error(`XML invalido: ${message}`);
      },
    },
  }).parseFromString(xml, 'text/xml');

  const listings = findListingNodes(doc);
  const sourceName = sanitizeSource(options.sourceName || DEFAULT_SOURCE);
  const importedAt = new Date().toISOString();

  const properties = listings
    .map((node, index) => mapListingNode(node, { sourceName, importedAt, index }))
    .filter(Boolean);

  return {
    source: sourceName,
    totalFound: listings.length,
    properties,
    warnings: buildWarnings(listings.length, properties),
  };
}

export async function importXmlProperties({ supabase, organizationId, xml, url, sourceName, dryRun = false }) {
  const xmlContent = xml || await fetchXmlFromUrl(url);
  const parsed = parseXmlProperties(xmlContent, { sourceName });
  const rows = parsed.properties.map((property) => ({
    ...property,
    organization_id: organizationId,
  }));

  if (dryRun) {
    return {
      ...parsed,
      imported: 0,
      skipped: parsed.totalFound - parsed.properties.length,
      preview: rows.slice(0, 10),
    };
  }

  if (rows.length === 0) {
    return {
      ...parsed,
      imported: 0,
      skipped: parsed.totalFound,
      preview: [],
    };
  }

  let imported = 0;
  const errors = [];

  for (const row of rows) {
    try {
      await savePropertyRow(supabase, row);
      imported += 1;
    } catch (error) {
      errors.push(`${row.external_id || row.title}: ${error.message}`);
    }
  }

  return {
    ...parsed,
    imported,
    skipped: parsed.totalFound - parsed.properties.length,
    errors,
    preview: rows.slice(0, 10),
  };
}

async function savePropertyRow(supabase, row) {
  const { data: existing, error: existingError } = await supabase
    .from('properties')
    .select('id')
    .eq('organization_id', row.organization_id)
    .eq('source', row.source)
    .eq('external_id', row.external_id)
    .limit(1)
    .maybeSingle();

  if (existingError) throw existingError;

  if (existing?.id) {
    const updatePayload = { ...row };
    delete updatePayload.organization_id;
    delete updatePayload.source;
    delete updatePayload.external_id;

    const { error } = await supabase
      .from('properties')
      .update(updatePayload)
      .eq('id', existing.id)
      .eq('organization_id', row.organization_id);

    if (error) throw error;
    return;
  }

  const { error } = await supabase.from('properties').insert(row);
  if (error) throw error;
}

function findListingNodes(doc) {
  for (const tag of LISTING_TAGS) {
    const nodes = Array.from(doc.getElementsByTagName(tag));
    if (nodes.length) return nodes;
  }
  return [];
}

function mapListingNode(node, { sourceName, importedAt, index }) {
  const externalId = firstText(node, TEXT_PATHS.externalId) || `xml-${index + 1}`;
  const title = firstText(node, TEXT_PATHS.title) || `Imovel ${externalId}`;
  const transaction = firstText(node, TEXT_PATHS.transaction);
  const purpose = normalizePurpose(transaction);
  const price = purpose === 'Aluguel'
    ? parseNumber(firstText(node, TEXT_PATHS.priceRent)) || parseNumber(firstText(node, TEXT_PATHS.priceSale))
    : parseNumber(firstText(node, TEXT_PATHS.priceSale)) || parseNumber(firstText(node, TEXT_PATHS.priceRent));
  const images = extractImages(node);
  const totalArea = parseNumber(firstText(node, TEXT_PATHS.totalArea));
  const usefulArea = parseNumber(firstText(node, TEXT_PATHS.usefulArea));
  const propertyType = normalizePropertyType(firstText(node, TEXT_PATHS.propertyType));
  const latitude = parseNumber(firstText(node, TEXT_PATHS.latitude));
  const longitude = parseNumber(firstText(node, TEXT_PATHS.longitude));

  return {
    source: sourceName,
    external_id: String(externalId).trim(),
    external_updated_at: firstText(node, TEXT_PATHS.updatedAt) || null,
    external_listing_status: firstText(node, TEXT_PATHS.listingStatus) || null,
    imported_at: importedAt,
    title: title.trim(),
    description: firstText(node, TEXT_PATHS.description) || '',
    price: price || 0,
    status: 'Disponível',
    property_type: propertyType,
    purpose,
    city: firstText(node, TEXT_PATHS.city) || '',
    state: firstText(node, TEXT_PATHS.state) || '',
    neighborhood: firstText(node, TEXT_PATHS.neighborhood) || '',
    address: firstText(node, TEXT_PATHS.address) || '',
    total_area_ha: isLikelyRural(propertyType, totalArea) ? totalArea : null,
    useful_area_ha: null,
    images,
    niche: isLikelyRural(propertyType, totalArea) ? 'rural' : 'urbano',
    features: {
      areaM2: isLikelyRural(propertyType, totalArea) ? null : totalArea,
      usefulAreaM2: usefulArea,
      dormitorios: parseInteger(firstText(node, TEXT_PATHS.bedrooms)),
      banheiros: parseInteger(firstText(node, TEXT_PATHS.bathrooms)),
      suites: parseInteger(firstText(node, TEXT_PATHS.suites)),
      vagas: parseInteger(firstText(node, TEXT_PATHS.garage)),
      latitude,
      longitude,
      sourceUrl: firstText(node, TEXT_PATHS.detailUrl) || '',
      import: {
        source: sourceName,
        externalId: String(externalId).trim(),
        country: firstText(node, TEXT_PATHS.country) || '',
        publicationType: firstText(node, TEXT_PATHS.publication) || '',
        transactionType: transaction || '',
      },
    },
  };
}

function firstText(node, paths) {
  for (const path of paths) {
    const value = textAtPath(node, path);
    if (value) return value;
  }
  return '';
}

function textAtPath(node, path) {
  const parts = String(path).split('.');
  let current = node;
  for (const part of parts) {
    if (part === '_') continue;
    const next = directChildrenByTag(current, part)[0];
    if (!next) return '';
    current = next;
  }
  return getNodeText(current);
}

function directChildrenByTag(node, tag) {
  return Array.from(node.childNodes || []).filter((child) => child.nodeType === 1 && localName(child) === tag);
}

function localName(node) {
  return node.localName || String(node.nodeName || '').split(':').pop();
}

function getNodeText(node) {
  if (!node) return '';
  const attrValue = ['value', 'Value', 'url', 'href'].map((attr) => node.getAttribute?.(attr)).find(Boolean);
  const text = attrValue || node.textContent || '';
  return String(text).replace(/\s+/g, ' ').trim();
}

function extractImages(node) {
  const images = new Set();
  const mediaNodes = [
    ...Array.from(node.getElementsByTagName('Item')),
    ...Array.from(node.getElementsByTagName('Image')),
    ...Array.from(node.getElementsByTagName('Foto')),
    ...Array.from(node.getElementsByTagName('Photo')),
    ...Array.from(node.getElementsByTagName('imagem_url')),
  ];

  for (const media of mediaNodes) {
    const value = getNodeText(media);
    if (/^https?:\/\//i.test(value)) images.add(value);
  }

  return Array.from(images).slice(0, 30);
}

function normalizePurpose(value = '') {
  const text = normalize(value);
  if (/(rent|aluguel|locacao)/i.test(text)) return 'Aluguel';
  if (/(both|venda e aluguel)/i.test(text)) return 'Venda e Aluguel';
  return 'Venda';
}

function normalizePropertyType(value = '') {
  const text = normalize(value);
  if (/apartment|apartamento|flat/.test(text)) return 'Apartamento';
  if (/house|home|casa|sobrado/.test(text)) return text.includes('sobrado') ? 'Sobrado' : 'Casa';
  if (/land|terreno|lote/.test(text)) return 'Terreno Urbano';
  if (/farm|fazenda|rural/.test(text)) return 'Fazenda';
  if (/sitio/.test(text)) return 'Sítio';
  if (/chacara/.test(text)) return 'Chácara';
  if (/commercial|comercial|sala/.test(text)) return 'Sala Comercial';
  if (/warehouse|galpao/.test(text)) return 'Galpão Industrial';
  return value || 'Casa';
}

function isLikelyRural(propertyType, area) {
  const text = normalize(propertyType);
  return /fazenda|sitio|chacara|rural|haras|gleba/.test(text) || Number(area || 0) > 10000;
}

function parseNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  const cleaned = String(value)
    .replace(/[^\d,.-]/g, '')
    .replace(/\.(?=\d{3}(?:\D|$))/g, '')
    .replace(',', '.');
  const number = Number(cleaned);
  return Number.isFinite(number) ? number : null;
}

function parseInteger(value) {
  const number = parseNumber(value);
  return number === null ? null : Math.round(number);
}

function normalize(value = '') {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function sanitizeSource(value) {
  return String(value || DEFAULT_SOURCE)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 60) || DEFAULT_SOURCE;
}

function buildWarnings(totalFound, properties) {
  const warnings = [];
  if (!totalFound) warnings.push('Nenhum imóvel encontrado no XML.');
  const withoutExternalId = properties.filter((property) => !property.external_id).length;
  const withoutPrice = properties.filter((property) => !property.price).length;
  const withoutImage = properties.filter((property) => !property.images?.length).length;
  if (withoutExternalId) warnings.push(`${withoutExternalId} imóvel(is) sem ID externo.`);
  if (withoutPrice) warnings.push(`${withoutPrice} imóvel(is) sem preço.`);
  if (withoutImage) warnings.push(`${withoutImage} imóvel(is) sem imagem.`);
  return warnings;
}
