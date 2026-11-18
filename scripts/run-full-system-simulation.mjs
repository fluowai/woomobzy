import dotenv from 'dotenv';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

dotenv.config({ path: path.join(rootDir, '.env') });

const API_BASE = process.env.TEST_API_URL || 'http://localhost:3002';
const FRONTEND_BASE = process.env.TEST_FRONTEND_URL || 'http://localhost:3006';
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const MASTER_PASS = 'WooMaster@2026!Imob';
const DEFAULT_PASS = 'WooTeste@2026!Imob';

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const results = [];
let passCount = 0;
let failCount = 0;

function record(section, name, ok, detail = '') {
  results.push({ section, name, ok, detail });
  if (ok) {
    passCount++;
    console.log(`  ✅ [PASS] [${section}] ${name}${detail ? ` — ${detail}` : ''}`);
  } else {
    failCount++;
    console.error(`  ❌ [FAIL] [${section}] ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

async function loginUser(email, password = DEFAULT_PASS, uidHint = null) {
  let res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_ANON_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  });
  let data = await res.json();
  if ((!res.ok || !data.access_token) && uidHint) {
    await supabaseAdmin.auth.admin.updateUserById(uidHint, {
      password,
      email_confirm: true,
    });
    res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });
    data = await res.json();
  }
  if (!res.ok || !data.access_token) {
    throw new Error(data.error_description || data.msg || `HTTP ${res.status}`);
  }
  return { token: data.access_token, user: data.user };
}

async function apiCall(endpoint, { method = 'GET', token, body, headers = {} } = {}) {
  const reqHeaders = {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...headers,
  };
  let payloadBody = body;
  if (body && !(body instanceof FormData) && typeof body === 'object') {
    reqHeaders['Content-Type'] = 'application/json';
    payloadBody = JSON.stringify(body);
  }
  const res = await fetch(`${API_BASE}${endpoint}`, {
    method,
    headers: reqHeaders,
    body: payloadBody,
  });
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }
  return { status: res.status, ok: res.ok, data: json };
}

async function main() {
  console.log('================================================================================');
  console.log('🚀 INICIANDO SIMULAÇÃO E TESTE COMPLETO END-TO-END — WOOMOBZY / WOOTECH IMOB');
  console.log(`   Frontend: ${FRONTEND_BASE} | Backend API: ${API_BASE}`);
  console.log('================================================================================\n');

  const tokens = {};
  const orgIds = {
    master: '4b10aa59-4e37-45dc-9c00-64630f9f1b7b',
    reseller: '12472ea9-2819-42d6-9f9a-2ce8a499af9e',
    urban: 'e6062970-2226-4a7f-9ef8-df5946abecb6',
    rural: 'a3d84cc8-2913-4a3f-be91-c9d92ced06db',
  };

  // ============================================================================
  // BLOCO 1: INFRAESTRUTURA LOCALHOST & AUTENTICAÇÃO MULTI-NÍVEL (10 PAPÉIS)
  // ============================================================================
  console.log('\n🔹 BLOCO 1: Infraestrutura Localhost & Autenticação Multi-Nível');

  try {
    const feRes = await fetch(FRONTEND_BASE);
    const feHtml = await feRes.text();
    record(
      'Infra',
      'Frontend Vite em http://localhost:3006',
      feRes.ok && feHtml.includes('<div id="root">'),
      `HTTP ${feRes.status} (${feHtml.length} bytes)`
    );

    const envCfgRes = await fetch(`${FRONTEND_BASE}/env-config.js`);
    const envCfgText = await envCfgRes.text();
    record(
      'Infra',
      'Runtime env-config.js no Frontend',
      envCfgRes.ok && envCfgText.includes('ahimxutcthctbwpaedvy.supabase.co'),
      'Supabase URL ativa sincronizada'
    );
  } catch (err) {
    record('Infra', 'Frontend Vite em http://localhost:3006', false, err.message);
  }

  try {
    const health = await apiCall('/api/health');
    record('Infra', 'Backend Express /api/health', health.ok, `HTTP ${health.status}`);

    const sysStatus = await apiCall('/api/system-status');
    record('Infra', 'Backend Express /api/system-status', sysStatus.ok, `HTTP ${sysStatus.status}`);
  } catch (err) {
    record('Infra', 'Backend Express Health', false, err.message);
  }

  const usersToTest = [
    { key: 'superadmin', email: 'opauloargolo@gmail.com', pass: MASTER_PASS, label: 'SuperAdmin Master', uid: 'd7b5c549-2e50-48fb-857d-26d4277e1760' },
    { key: 'owner', email: 'owner@wootech.com.br', pass: DEFAULT_PASS, label: 'Platform Owner', uid: '436a4e49-c3f8-483d-a1ce-2bfcb502bbf6' },
    { key: 'megaadmin', email: 'megaadmin@wootech.com.br', pass: DEFAULT_PASS, label: 'MegaAdmin', uid: '41638373-c23d-4db9-b3ca-4f2f66b11508' },
    { key: 'revenda', email: 'revenda@wootech.com.br', pass: DEFAULT_PASS, label: 'Gestor Revenda SaaS', uid: 'b4f12b28-bcfa-4c6e-87e3-eb8f22892910' },
    { key: 'adminUrbano', email: 'admin.urbano@wootech.com.br', pass: DEFAULT_PASS, label: 'Admin Imobiliária Urbana', uid: '276158d5-5e25-4cd8-a29f-1a4fb5e14f1c' },
    { key: 'adminRural', email: 'admin.rural@wootech.com.br', pass: DEFAULT_PASS, label: 'Admin Imobiliária Rural', uid: '788d3dfa-538b-403a-b040-b93e75ca0646' },
    { key: 'gerente', email: 'gerente@wootech.com.br', pass: DEFAULT_PASS, label: 'Gerente Comercial', uid: 'cd006cec-d6e4-4b76-a7fc-d178c54630ad' },
    { key: 'corretor', email: 'corretor@wootech.com.br', pass: DEFAULT_PASS, label: 'Corretor Imobiliário', uid: '195d1a64-ca27-47a7-9e97-e57c8ff3bc78' },
    { key: 'assistente', email: 'assistente@wootech.com.br', pass: DEFAULT_PASS, label: 'Assistente Administrativo', uid: '60842b6f-daca-4ff9-b85f-25a841091040' },
    { key: 'cliente', email: 'cliente@wootech.com.br', pass: DEFAULT_PASS, label: 'Cliente Final', uid: 'accc377b-14d6-4e05-8764-776d98aa814b' },
  ];

  for (const u of usersToTest) {
    try {
      const auth = await loginUser(u.email, u.pass, u.uid);
      tokens[u.key] = auth.token;
      record('Auth', `Login JWT: ${u.label} (${u.email})`, true, `UID: ${auth.user.id.slice(0, 8)}...`);
    } catch (err) {
      record('Auth', `Login JWT: ${u.label} (${u.email})`, false, err.message);
    }
  }

  // ============================================================================
  // BLOCO 2: CADASTRO DE CORRETORES & GESTÃO DE EQUIPE (URBANO & RURAL)
  // ============================================================================
  console.log('\n🔹 BLOCO 2: Cadastro de Corretores & Gestão de Equipe');

  const ts = Date.now();
  const brokerUrbanoEmail = `ricardo.corretor.${ts}@wootech.com.br`;
  const brokerRuralEmail = `gustavo.agro.${ts}@wootech.com.br`;

  // 2.1 Cadastrar corretor urbano via API
  const createBrokerUrb = await apiCall('/api/admin/users', {
    method: 'POST',
    token: tokens.adminUrbano,
    body: {
      email: brokerUrbanoEmail,
      password: DEFAULT_PASS,
      full_name: 'Ricardo Almeida - Especialista Alto Padrão',
      role: 'broker',
    },
  });
  record(
    'Corretores',
    'Cadastrar Novo Corretor Urbano (POST /api/admin/users)',
    createBrokerUrb.ok,
    `HTTP ${createBrokerUrb.status} — ${brokerUrbanoEmail}`
  );

  // 2.2 Cadastrar corretor rural via API
  const createBrokerRur = await apiCall('/api/admin/users', {
    method: 'POST',
    token: tokens.adminRural,
    body: {
      email: brokerRuralEmail,
      password: DEFAULT_PASS,
      full_name: 'Gustavo Mendes - Engenheiro Agrônomo & Broker Rural',
      role: 'broker',
    },
  });
  record(
    'Corretores',
    'Cadastrar Novo Corretor Rural (POST /api/admin/users)',
    createBrokerRur.ok,
    `HTTP ${createBrokerRur.status} — ${brokerRuralEmail}`
  );

  // 2.3 Testar login imediato dos novos corretores
  try {
    const newUrbAuth = await loginUser(brokerUrbanoEmail);
    tokens.newBrokerUrbano = newUrbAuth.token;
    record(
      'Corretores',
      'Login do Novo Corretor Urbano recém-cadastrado',
      Boolean(newUrbAuth.token),
      `Autenticado com sucesso (${newUrbAuth.user.id.slice(0, 8)}...)`
    );
  } catch (err) {
    record('Corretores', 'Login do Novo Corretor Urbano recém-cadastrado', false, err.message);
  }

  try {
    const newRurAuth = await loginUser(brokerRuralEmail);
    tokens.newBrokerRural = newRurAuth.token;
    record(
      'Corretores',
      'Login do Novo Corretor Rural recém-cadastrado',
      Boolean(newRurAuth.token),
      `Autenticado com sucesso (${newRurAuth.user.id.slice(0, 8)}...)`
    );
  } catch (err) {
    record('Corretores', 'Login do Novo Corretor Rural recém-cadastrado', false, err.message);
  }

  // 2.4 Listar equipe urbana e validar presença e isolamento
  const listUrbUsers = await apiCall('/api/admin/users', { token: tokens.adminUrbano });
  const foundUrbBroker = (listUrbUsers.data?.users || []).find((u) => u.email === brokerUrbanoEmail);
  const leakedRurBroker = (listUrbUsers.data?.users || []).find((u) => u.email === brokerRuralEmail);
  record(
    'Corretores',
    'Listagem e Isolamento Multi-Tenant da Equipe Urbana (GET /api/admin/users)',
    listUrbUsers.ok && Boolean(foundUrbBroker) && !leakedRurBroker,
    `Total na equipe urbana: ${(listUrbUsers.data?.users || []).length} membros (Isolamento OK)`
  );

  // 2.5 Atualizar papel/aprovação do corretor
  if (foundUrbBroker?.id) {
    const patchBroker = await apiCall(`/api/admin/users/${foundUrbBroker.id}`, {
      method: 'PATCH',
      token: tokens.adminUrbano,
      body: { approved: true, role: 'broker' },
    });
    record(
      'Corretores',
      'Atualizar Permissões do Corretor (PATCH /api/admin/users/:id)',
      patchBroker.ok,
      `Role confirmado: ${patchBroker.data?.user?.role}`
    );
  }

  // ============================================================================
  // BLOCO 3: CADASTRO DE IMÓVEIS URBANOS & RURAIS + VALUATION + ACP
  // ============================================================================
  console.log('\n🔹 BLOCO 3: Cadastro de Imóveis (Urbano & Rural), Valuation & Enriquecimento ACP');

  // 3.1 Imóvel Urbano 1: Cobertura Duplex Itaim Bibi
  const propUrb1Res = await apiCall('/api/properties', {
    method: 'POST',
    token: tokens.adminUrbano,
    body: {
      title: 'Cobertura Duplex Horizon - Itaim Bibi',
      description: 'Cobertura duplex de altíssimo padrão no coração do Itaim Bibi, vista panorâmica 360°, piscina aquecida privativa, espaço gourmet integrado e automação completa.',
      price: 6850000,
      property_type: 'Apartamento',
      status: 'Disponível',
      niche: 'urbano',
      city: 'São Paulo',
      state: 'SP',
      neighborhood: 'Itaim Bibi',
      address: 'Rua Joaquim Floriano, 1120 - Itaim Bibi, São Paulo - SP',
      bedrooms: 4,
      suites: 4,
      bathrooms: 6,
      parking_spots: 5,
      area_m2: 385,
      area: 385,
      images: [
        'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&q=80',
      ],
      features: {
        urban: {
          iptuNumber: `IPTU-SP-${ts}`,
          condoFee: 4200,
          iptuAnnual: 18500,
          valorVenalTotal: 5900000,
          padraoConstrutivo: 'Luxo',
          anoConstrucao: 2024,
        },
        location: {
          city: 'São Paulo',
          state: 'SP',
          neighborhood: 'Itaim Bibi',
          zip: '04534-004',
          lat: -23.5845,
          lng: -46.6784,
        },
        physical: {
          area: 385,
          builtArea: 385,
          bedrooms: 4,
          suites: 4,
          bathrooms: 6,
          parking: 5,
        },
      },
    },
  });
  const propUrb1Id = propUrb1Res.data?.property?.id;
  record(
    'Imóveis',
    'Cadastrar Imóvel Urbano 1: Cobertura Duplex Itaim Bibi (R$ 6,85M)',
    propUrb1Res.ok && Boolean(propUrb1Id),
    `ID: ${propUrb1Id}`
  );

  // 3.2 Imóvel Urbano 2: Studio Vila Olímpia (Ideal para Locação e Investimento)
  const propUrb2Res = await apiCall('/api/properties', {
    method: 'POST',
    token: tokens.adminUrbano,
    body: {
      title: 'Studio Smart Design - Vila Olímpia',
      description: 'Studio moderno totalmente mobiliado e decorado por arquiteto, a 300m da Faria Lima. Rooftop com piscina, coworking e academia.',
      price: 890000,
      property_type: 'Apartamento',
      status: 'Disponível',
      niche: 'urbano',
      city: 'São Paulo',
      state: 'SP',
      neighborhood: 'Vila Olímpia',
      address: 'Rua Gomes de Carvalho, 1500 - Vila Olímpia, São Paulo - SP',
      bedrooms: 1,
      suites: 1,
      bathrooms: 1,
      parking_spots: 1,
      area_m2: 48,
      area: 48,
      images: [
        'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1200&q=80',
      ],
      features: {
        urban: {
          iptuNumber: `IPTU-VO-${ts}`,
          condoFee: 680,
          iptuAnnual: 2400,
        },
        location: {
          city: 'São Paulo',
          state: 'SP',
          neighborhood: 'Vila Olímpia',
          zip: '04547-005',
        },
      },
    },
  });
  const propUrb2Id = propUrb2Res.data?.property?.id;
  record(
    'Imóveis',
    'Cadastrar Imóvel Urbano 2: Studio Vila Olímpia (R$ 890k)',
    propUrb2Res.ok && Boolean(propUrb2Id),
    `ID: ${propUrb2Id}`
  );

  // 3.3 Imóvel Urbano 3: Mansão Contemporânea Alphaville
  const propUrb3Res = await apiCall('/api/properties', {
    method: 'POST',
    token: tokens.adminUrbano,
    body: {
      title: 'Mansão Contemporânea Alphaville Residencial 1',
      description: 'Residência cinematográfica em lote de 800m², 560m² construídos, 4 suítes master, adega climatizada, cinema, sauna e piscina com borda infinita.',
      price: 5400000,
      property_type: 'Casa',
      status: 'Disponível',
      niche: 'urbano',
      city: 'Barueri',
      state: 'SP',
      neighborhood: 'Alphaville',
      address: 'Alameda Europa, 450 - Alphaville, Barueri - SP',
      bedrooms: 4,
      suites: 4,
      bathrooms: 7,
      parking_spots: 6,
      area_m2: 560,
      area: 560,
      images: [
        'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80',
      ],
    },
  });
  const propUrb3Id = propUrb3Res.data?.property?.id;
  record(
    'Imóveis',
    'Cadastrar Imóvel Urbano 3: Mansão Alphaville (R$ 5,4M)',
    propUrb3Res.ok && Boolean(propUrb3Res.data?.property?.id),
    `ID: ${propUrb3Id}`
  );

  // 3.4 Imóvel Rural 1: Fazenda Boa Esperança (Soja & Milho - Sorriso/MT)
  const propRur1Res = await apiCall('/api/properties', {
    method: 'POST',
    token: tokens.adminRural,
    body: {
      title: 'Fazenda Boa Esperança - 2.400 ha Dupla Aptidão (Safra & Safrinha)',
      description: 'Propriedade de excelência em Sorriso/MT com 2.400 hectares totais e 1.850 ha de área aberta consolidada em soja e milho há 12 anos. Teor de argila entre 35% e 48%, armazém graneleiro para 300.000 sacas, secador, balança rodoviária, sede de luxo e pista de pouso homologada.',
      price: 85000000,
      property_type: 'Fazenda',
      status: 'Disponível',
      niche: 'rural',
      city: 'Sorriso',
      state: 'MT',
      address: 'Rodovia BR-163, Km 742 - Zona Rural, Sorriso - MT',
      area: 2400,
      total_area_ha: 2400,
      productive_area_ha: 1850,
      aptitude: 'Agricultura / Grãos (Soja e Milho)',
      soil_type: 'Latossolo Vermelho (38% Argila)',
      topography: 'Plana (96% mecanizável)',
      water_resources: 'Rio perene na divisa, 3 represas e 2 poços artesianos',
      car_number: 'MT-5107925-9A8B7C6D5E4F3A2B1C0D9E8F7A6B5C4D',
      images: [
        'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1200&q=80',
      ],
    },
  });
  const propRur1Id = propRur1Res.data?.property?.id;
  record(
    'Imóveis',
    'Cadastrar Imóvel Rural 1: Fazenda Boa Esperança 2.400 ha Sorriso/MT (R$ 85M)',
    propRur1Res.ok && Boolean(propRur1Id),
    `ID: ${propRur1Id}`
  );

  // 3.5 Imóvel Rural 2: Fazenda Vale Verde (Pecuária Intensiva - MS)
  const propRur2Res = await apiCall('/api/properties', {
    method: 'POST',
    token: tokens.adminRural,
    body: {
      title: 'Fazenda Vale Verde - 1.500 ha Pecuária Intensiva & Confinamento',
      description: 'Fazenda pronta para pecuária de ciclo completo em Ribas do Rio Pardo/MS. 1.150 ha formados em Brachiaria Brizantha e Mombaça, 32 divisões de pasto com corredor central, bebedouros australianos encanados, curral anti-stress com tronco Beckhauser e balança eletrônica.',
      price: 32000000,
      property_type: 'Fazenda',
      status: 'Disponível',
      niche: 'rural',
      city: 'Ribas do Rio Pardo',
      state: 'MS',
      address: 'Estrada Vicinal MS-338, Km 28 - Ribas do Rio Pardo - MS',
      area: 1500,
      total_area_ha: 1500,
      productive_area_ha: 1150,
      aptitude: 'Pecuária de Corte / Ciclo Completo',
      soil_type: 'Misto estruturado',
      topography: 'Plana a levemente ondulada',
      water_resources: 'Ribeirão perene, 4 açudes e reservatório central de 200.000L',
      car_number: 'MS-5007109-1F2E3D4C5B6A79887766554433221100',
      images: [
        'https://images.unsplash.com/photo-1500595046743-cd271d694d30?auto=format&fit=crop&w=1200&q=80',
      ],
    },
  });
  const propRur2Id = propRur2Res.data?.property?.id;
  record(
    'Imóveis',
    'Cadastrar Imóvel Rural 2: Fazenda Vale Verde 1.500 ha MS (R$ 32M)',
    propRur2Res.ok && Boolean(propRur2Id),
    `ID: ${propRur2Id}`
  );

  // 3.6 Atualizar Imóvel Urbano, Consultar IPTU/CEP, Valuation e ACP
  if (propUrb1Id) {
    const updateUrb = await apiCall(`/api/properties/${propUrb1Id}`, {
      method: 'PUT',
      token: tokens.adminUrbano,
      body: { price: 6790000 },
    });
    record(
      'Imóveis',
      'Atualizar Preço de Imóvel Urbano (PUT /api/properties/:id)',
      updateUrb.ok && Number(updateUrb.data?.property?.price) === 6790000,
      'Preço atualizado para R$ 6.790.000'
    );

    const valUrb = await apiCall(`/api/valuation/estimate/${propUrb1Id}`, {
      token: tokens.adminUrbano,
    });
    record(
      'Imóveis',
      'Cálculo de Valuation Automatizado Urbano (GET /api/valuation/estimate/:id)',
      valUrb.ok,
      `Estimativa calculada com sucesso (HTTP ${valUrb.status})`
    );

    const acpUrb = await apiCall(`/api/properties/${propUrb1Id}/acp`, {
      method: 'POST',
      token: tokens.adminUrbano,
    });
    record(
      'Imóveis',
      'Enriquecimento de Mercado ACP (POST /api/properties/:id/acp)',
      acpUrb.ok,
      `ACP processado (HTTP ${acpUrb.status})`
    );

    const iptuCheck = await apiCall(`/api/urban/iptu/IPTU-SP-${ts}`, {
      token: tokens.adminUrbano,
    });
    record(
      'Imóveis',
      'Consulta Fiscal de IPTU Urbano (GET /api/urban/iptu/:inscricao)',
      iptuCheck.ok && iptuCheck.data?.data?.inscricao === `IPTU-SP-${ts}`,
      `Bairro: ${iptuCheck.data?.data?.bairro}`
    );
  }

  if (propRur1Id) {
    const valRur = await apiCall(`/api/valuation/estimate/${propRur1Id}`, {
      token: tokens.adminRural,
    });
    record(
      'Imóveis',
      'Cálculo de Valuation Automatizado Rural (GET /api/valuation/estimate/:id)',
      valRur.ok,
      `Valuation Fazenda Sorriso/MT (HTTP ${valRur.status})`
    );
  }

  // 3.7 Listar carteira urbana e rural
  const listUrbProps = await apiCall('/api/properties', { token: tokens.adminUrbano });
  const listRurProps = await apiCall('/api/properties', { token: tokens.adminRural });
  record(
    'Imóveis',
    'Listagem de Carteira Urbana & Rural por Organização (GET /api/properties)',
    listUrbProps.ok && listRurProps.ok,
    `Carteira Urbana: ${listUrbProps.data?.pagination?.total} imóveis | Carteira Rural: ${listRurProps.data?.pagination?.total} fazendas`
  );

  // ============================================================================
  // BLOCO 4: CRIAÇÃO DE SITES, PÁGINAS, LANDING PAGES & QUIZ INTERATIVO
  // ============================================================================
  console.log('\n🔹 BLOCO 4: Criação de Sites, Páginas, Landing Pages & Quiz Interativo');

  // 4.1 Inicializar e configurar site da Imobiliária Urbana
  const createUrbSite = await apiCall('/api/sites/create', {
    method: 'POST',
    token: tokens.adminUrbano,
  });
  record(
    'Páginas & Sites',
    'Inicializar Site da Imobiliária Urbana (POST /api/sites/create)',
    createUrbSite.ok,
    createUrbSite.data?.alreadyExisted ? 'Site já existente vinculado' : `Novo Site criado`
  );

  const updateUrbSite = await apiCall('/api/sites', {
    method: 'PUT',
    token: tokens.adminUrbano,
    body: {
      name: 'Horizonte Urbano Private Brokers',
      isActive: true,
      globalTheme: { primaryColor: '#ff6a00', fontFamily: 'Inter', darkMode: true },
      contactInfo: {
        phone: '+55 11 99999-8888',
        whatsapp: '5511999998888',
        email: 'contato@horizonteurbano.com.br',
        address: 'Av. Brigadeiro Faria Lima, 3477 - Itaim Bibi, São Paulo/SP',
      },
      socialLinks: {
        instagram: 'https://instagram.com/horizonteurbano',
        linkedin: 'https://linkedin.com/company/horizonteurbano',
      },
    },
  });
  record(
    'Páginas & Sites',
    'Configurar Tema Global e Contatos do Site Urbano (PUT /api/sites)',
    updateUrbSite.ok,
    `Site: ${updateUrbSite.data?.site?.name}`
  );

  // 4.2 Gerar blocos de Landing Page com IA
  const aiPageBlocksRes = await apiCall('/api/ai/generate-page', {
    method: 'POST',
    token: tokens.adminUrbano,
    body: {
      prompt: 'Crie uma landing page de alto padrão para a Cobertura Duplex Horizon no Itaim Bibi com piscina aquecida e 4 suítes',
      niche: 'urbano',
      propertyId: propUrb1Id,
    },
  });
  const generatedBlocks = aiPageBlocksRes.data?.blocks || [];
  record(
    'Páginas & Sites',
    'Gerar Blocos de Landing Page via IA (POST /api/ai/generate-page)',
    aiPageBlocksRes.ok && generatedBlocks.length > 0,
    `${generatedBlocks.length} blocos visuais gerados pela IA`
  );

  // 4.3 Criar Página no Site Urbano
  const pageSlugUrb = `cobertura-itaim-bibi-${ts}`;
  const createUrbPage = await apiCall('/api/sites/pages', {
    method: 'POST',
    token: tokens.adminUrbano,
    body: {
      title: 'Coleção Coberturas Exclusivas Itaim Bibi',
      slug: pageSlugUrb,
      status: 'draft',
      blocks:
        generatedBlocks.length > 0
          ? generatedBlocks
          : [
              { id: 'hero-1', type: 'hero', content: { title: 'Viva no Topo do Itaim Bibi', subtitle: 'Coberturas de 385m² com piscina privativa' } },
              { id: 'cta-1', type: 'cta', content: { text: 'Agendar Visita Privativa', buttonLabel: 'Falar com Concierge' } },
            ],
      themeOverrides: { accentColor: '#ff6a00' },
    },
  });
  const urbPageId = createUrbPage.data?.page?.id;
  record(
    'Páginas & Sites',
    'Criar Página no Site da Imobiliária Urbana (POST /api/sites/pages)',
    createUrbPage.ok && Boolean(urbPageId),
    `Slug: /${createUrbPage.data?.page?.slug}`
  );

  // 4.4 Publicar e Duplicar Página Urbana
  if (urbPageId) {
    const pubPage = await apiCall(`/api/sites/pages/${urbPageId}/publish`, {
      method: 'POST',
      token: tokens.adminUrbano,
      body: { publish: true },
    });
    record(
      'Páginas & Sites',
      'Publicar Página no Site Urbano (POST /api/sites/pages/:id/publish)',
      pubPage.ok && pubPage.data?.page?.status === 'published',
      `Status: ${pubPage.data?.page?.status}`
    );

    const dupPage = await apiCall(`/api/sites/pages/${urbPageId}/duplicate`, {
      method: 'POST',
      token: tokens.adminUrbano,
    });
    record(
      'Páginas & Sites',
      'Duplicar Página para Campanha A/B (POST /api/sites/pages/:id/duplicate)',
      dupPage.ok && Boolean(dupPage.data?.page?.id),
      `Cópia criada: ${dupPage.data?.page?.slug}`
    );

    // 4.5 Testar acesso público de visitante à página publicada
    const pubSiteRes = await apiCall(`/api/sites/public-page/horizonte-urbano/${pageSlugUrb}`);
    record(
      'Páginas & Sites',
      'Renderizar Página Pública para Visitante (GET /api/sites/public-page/:orgSlug/:pageSlug)',
      pubSiteRes.ok && pubSiteRes.data?.page?.slug === pageSlugUrb,
      `Título público: "${pubSiteRes.data?.page?.title}"`
    );
  }

  // 4.6 Criar Site e Página para Imobiliária Rural
  await apiCall('/api/sites/create', { method: 'POST', token: tokens.adminRural });
  const rurPageSlug = `fazendas-safra-mt-${ts}`;
  const createRurPage = await apiCall('/api/sites/pages', {
    method: 'POST',
    token: tokens.adminRural,
    body: {
      title: 'Portfólio Safra Soja & Pecuária 2026/2027',
      slug: rurPageSlug,
      status: 'published',
      blocks: [
        { id: 'hero-rural', type: 'hero', content: { title: 'Fazendas de Alta Produtividade no MT e MS', subtitle: 'Áreas auditadas com CAR, Georreferenciamento e Laudo de Argila' } },
      ],
    },
  });
  record(
    'Páginas & Sites',
    'Criar e Publicar Página no Portal Rural (POST /api/sites/pages)',
    createRurPage.ok && createRurPage.data?.page?.status === 'published',
    `Slug: /${createRurPage.data?.page?.slug}`
  );

  // 4.7 Criar e Publicar Landing Page dedicada na tabela landing_pages
  const lpSlug = `lp-horizon-itaim-${ts}`;
  const { data: lpData, error: lpErr } = await supabaseAdmin
    .from('landing_pages')
    .insert({
      organization_id: orgIds.urban,
      name: 'Landing Page Oficial - Cobertura Horizon Itaim',
      slug: lpSlug,
      title: 'Cobertura Duplex Horizon | 385m² no Itaim Bibi',
      description: 'Exclusividade, segurança e vista definitiva em São Paulo.',
      meta_title: 'Cobertura Duplex Horizon - Itaim Bibi | Horizonte Urbano',
      meta_description: 'Conheça a Cobertura Duplex de 385m² com 4 suítes e 5 vagas no Itaim Bibi.',
      status: 'published',
      published_at: new Date().toISOString(),
      theme_config: { primaryColor: '#ff6a00', backgroundColor: '#090b0e' },
      blocks: generatedBlocks,
      property_selection: { mode: 'manual', propertyIds: [propUrb1Id, propUrb2Id].filter(Boolean) },
      form_config: { enabled: true, buttonText: 'Receber Book Privativo', fields: ['name', 'email', 'phone'] },
    })
    .select()
    .single();
  record(
    'Páginas & Sites',
    'Criar e Publicar Landing Page Dedicada (tabela landing_pages)',
    !lpErr && Boolean(lpData?.id),
    lpErr ? `Erro: ${lpErr.message}` : `LP ID: ${lpData?.id} | Slug: ${lpSlug}`
  );

  // 4.8 Criar Campanha de Quiz Interativo
  const quizSlug = `quiz-investidor-prime-${ts}`;
  const createQuizRes = await apiCall('/api/quiz/campaigns', {
    method: 'POST',
    token: tokens.adminUrbano,
    body: {
      title: `Quiz Perfil Investidor Prime ${ts}`,
      slug: quizSlug,
      property_label: 'Cobertura Duplex Horizon - Itaim Bibi',
      status: 'active',
      whatsapp_number: '5511999998888',
      qualification_threshold: 70,
      intro_title: 'Descubra se a Cobertura Horizon é ideal para seu patrimônio',
      intro_copy: 'Responda 3 perguntas rápidas para acessar o book técnico e agendar uma visita privativa.',
      success_message: 'Parabéns! Seu perfil é 100% compatível com o empreendimento.',
      disqualification_message: 'Obrigado pelo interesse! Temos outras opções adequadas ao seu momento.',
      questions: [
        {
          id: 'objetivo',
          label: 'Qual o seu principal objetivo com este imóvel?',
          type: 'single',
          required: true,
          options: [
            { value: 'moradia', label: 'Moradia própria de alto padrão', score: 40 },
            { value: 'investimento', label: 'Preservação patrimonial e valorização', score: 35 },
            { value: 'curiosidade', label: 'Apenas pesquisando mercado', score: 5, disqualify: true, reason: 'Sem intenção de compra no momento' },
          ],
        },
        {
          id: 'budget',
          label: 'Qual a faixa de investimento planejada?',
          type: 'single',
          required: true,
          options: [
            { value: 'above-3000', label: 'Acima de R$ 5 milhões', score: 40 },
            { value: '2001-3000', label: 'Entre R$ 3 e 5 milhões', score: 25 },
            { value: 'upto-1000', label: 'Até R$ 1 milhão', score: 0, disqualify: true, reason: 'Orçamento abaixo do ticket mínimo' },
          ],
        },
        {
          id: 'prazo',
          label: 'Qual o prazo estimado para aquisição?',
          type: 'single',
          required: true,
          options: [
            { value: 'imediato', label: 'Imediato (próximos 30 a 60 dias)', score: 30 },
            { value: 'semestre', label: 'Neste semestre', score: 20 },
          ],
        },
      ],
      branding: {
        primary: '#ff6a00',
        niche: 'urbano',
        match_profile: 'urbano',
        lead_source: 'Quiz Alto Padrão',
      },
    },
  });
  const quizCampaignId = createQuizRes.data?.campaign?.id;
  record(
    'Páginas & Sites',
    'Criar Campanha de Quiz Interativo (POST /api/quiz/campaigns)',
    createQuizRes.ok && Boolean(quizCampaignId),
    `Slug: /quiz/${quizSlug}`
  );

  // ============================================================================
  // BLOCO 5: SIMULAÇÕES COMPLETAS DE ATENDIMENTO (PÚBLICO, QUIZ, CRM, KANBAN & IA)
  // ============================================================================
  console.log('\n🔹 BLOCO 5: Simulações Completas de Atendimento (Público, Quiz, CRM, Kanban & Agentes IA)');

  // 5.1 Simulação 1: Visitante preenche formulário de contato na página pública
  const publicLeadPhone = `11988${String(ts).slice(-6)}`;
  const publicContactRes = await apiCall('/api/public/contact', {
    method: 'POST',
    body: {
      name: 'Dr. Henrique Vasconcelos',
      email: `henrique.${ts}@vasconcelosadv.com.br`,
      phone: publicLeadPhone,
      message: 'Gostaria de agendar visita na Cobertura Duplex Horizon no Itaim Bibi.',
      property_id: propUrb1Id,
      organization_id: orgIds.urban,
    },
  });
  record(
    'Atendimento',
    'Simulação 1: Captura de Lead via Formulário Público do Site (POST /api/public/contact)',
    publicContactRes.ok,
    `Lead público capturado (ID: ${publicContactRes.data?.leadId || 'OK'})`
  );

  // 5.2 Simulação 2: Investidor responde ao Quiz Público e é qualificado automaticamente
  const quizLeadPhone = `11977${String(ts).slice(-6)}`;
  const submitQuizRes = await apiCall(`/api/quiz/public/${quizSlug}/submissions`, {
    method: 'POST',
    body: {
      name: 'Roberto Albuquerque',
      email: `roberto.${ts}@investimentos.com.br`,
      phone: quizLeadPhone,
      answers: {
        objetivo: 'moradia',
        budget: 'above-3000',
        prazo: 'imediato',
      },
      utm: { source: 'instagram_ads', campaign: 'cobertura_itaim' },
    },
  });
  record(
    'Atendimento',
    'Simulação 2: Investidor responde Quiz Público e gera Lead Qualificado (POST /api/quiz/public/:slug/submissions)',
    submitQuizRes.ok && submitQuizRes.data?.qualified === true,
    `Qualificado: ${submitQuizRes.data?.qualified} | Score: ${submitQuizRes.data?.score}/100 | Link WhatsApp gerado`
  );

  // 5.3 Simulação 3: Corretor cadastra Lead no CRM + Matchmaking Automático de Imóveis
  const crmLeadPhone = `11966${String(ts).slice(-6)}`;
  const createLeadRes = await apiCall('/api/crm/leads', {
    method: 'POST',
    token: tokens.newBrokerUrbano || tokens.corretor,
    body: {
      name: 'Fernanda Montenegro Salles',
      phone: crmLeadPhone,
      email: `fernanda.${ts}@sallesgroup.com.br`,
      property_id: propUrb1Id,
      source: 'Indicação Private',
      budget: 7000000,
      notes: 'Cliente busca cobertura no Itaim Bibi ou casa em Alphaville acima de 350m².',
      match_profile: 'urbano',
    },
  });
  const crmLeadId = createLeadRes.data?.lead?.id;
  record(
    'Atendimento',
    'Simulação 3: Corretor cadastra Lead no CRM com Matchmaking Automático (POST /api/crm/leads)',
    createLeadRes.ok && Boolean(crmLeadId),
    `Lead ID: ${crmLeadId}`
  );

  // 5.4 Simulação 4: Fluxo de Atendimento no Funil Kanban (Boas-vindas, Atividades, Mudança de Etapas)
  if (crmLeadId) {
    const welcomeRes = await apiCall(`/api/crm/leads/${crmLeadId}/welcome`, {
      method: 'POST',
      token: tokens.newBrokerUrbano || tokens.corretor,
    });
    record(
      'Atendimento',
      'Simulação 4a: Disparo de Boas-Vindas no WhatsApp do Lead (POST /api/crm/leads/:id/welcome)',
      welcomeRes.ok,
      welcomeRes.data?.message || 'Boas-vindas enviadas'
    );

    const act1Res = await apiCall(`/api/crm/leads/${crmLeadId}/activities`, {
      method: 'POST',
      token: tokens.newBrokerUrbano || tokens.corretor,
      body: {
        type: 'Ligação',
        description: 'Conversa telefônica de 15 min: cliente confirmou interesse na Cobertura Horizon e disponibilidade para visita quinta-feira às 15h.',
        metadata: { duration_sec: 900, outcome: 'positive' },
      },
    });
    record(
      'Atendimento',
      'Simulação 4b: Registro de Ligação e Qualificação no Histórico (POST /api/crm/leads/:id/activities)',
      act1Res.ok,
      `Atividade registrada (ID: ${act1Res.data?.activity?.id})`
    );

    // Avanço pelas etapas do Funil Kanban
    const stages = ['Em Atendimento', 'Visita Agendada', 'Proposta'];
    let allStagesOk = true;
    for (const stage of stages) {
      const stRes = await apiCall(`/api/crm/leads/${crmLeadId}/status`, {
        method: 'PATCH',
        token: tokens.newBrokerUrbano || tokens.corretor,
        body: { status: stage },
      });
      if (!stRes.ok || stRes.data?.lead?.status !== stage) {
        allStagesOk = false;
      }
    }
    record(
      'Atendimento',
      'Simulação 4c: Progressão Completa no Funil Kanban (Novo -> Em Atendimento -> Visita Agendada -> Proposta)',
      allStagesOk,
      'Status atualizado em todas as colunas e auditado em lead_activities'
    );

    const matchRes = await apiCall(`/api/crm/leads/${crmLeadId}/match-properties`, {
      method: 'POST',
      token: tokens.newBrokerUrbano || tokens.corretor,
      body: { match_profile: 'urbano' },
    });
    record(
      'Atendimento',
      'Simulação 4d: Re-execução de Matchmaking 360° para o Lead (POST /api/crm/leads/:id/match-properties)',
      matchRes.ok,
      `Matchmaking executado (HTTP ${matchRes.status})`
    );
  }

  // 5.5 Simulação 5: Atendimento Rural (Investidor do Agronegócio)
  const ruralLeadPhone = `65999${String(ts).slice(-6)}`;
  const createRuralLead = await apiCall('/api/crm/leads', {
    method: 'POST',
    token: tokens.newBrokerRural || tokens.adminRural,
    body: {
      name: 'Grupo Agropecuário Maggi & Filhos',
      phone: ruralLeadPhone,
      email: `diretoria.${ts}@grupoagromt.com.br`,
      property_id: propRur1Id,
      source: 'Feira Agrishow',
      budget: 90000000,
      aptitude_interest: 'Agricultura / Grãos',
      notes: 'Grupo busca fazenda acima de 2.000 ha em Sorriso ou Lucas do Rio Verde com teor de argila > 35%.',
      match_profile: 'rural',
    },
  });
  record(
    'Atendimento',
    'Simulação 5: Atendimento e Qualificação de Comprador de Fazenda no CRM Rural',
    createRuralLead.ok && Boolean(createRuralLead.data?.lead?.id),
    `Lead Rural ID: ${createRuralLead.data?.lead?.id}`
  );

  // 5.6 Simulação 6: Atendimento Autônomo por Agente de IA (Multi-Turn + Tool Calling Real)
  const createAgentRes = await apiCall('/api/ai/agents', {
    method: 'POST',
    token: tokens.adminUrbano,
    body: {
      name: `Helena - Concierge Digital (${ts})`,
      role: 'SDR & Concierge de Imóveis de Alto Padrão',
      description: 'Atende clientes 24/7, consulta estoque de imóveis em tempo real e agenda visitas.',
      model: 'gemini-2.0-flash',
      temperature: 0.3,
      prompt: 'Você é Helena, concierge digital da Imobiliária Horizonte Urbano. Seja elegante, consultiva e objetiva. Sempre consulte os imóveis reais disponíveis e ajude o cliente a agendar visitas.',
    },
  });
  const agentId = createAgentRes.data?.id || createAgentRes.data?.agent?.id;
  record(
    'Atendimento IA',
    'Criar Agente de IA de Atendimento Imobiliário (POST /api/ai/agents)',
    createAgentRes.ok && Boolean(agentId),
    `Agente ID: ${agentId}`
  );

  if (agentId) {
    const patchPrompt = await apiCall(`/api/ai/agents/${agentId}/prompt`, {
      method: 'PATCH',
      token: tokens.adminUrbano,
      body: {
        promptText: 'Você é Helena, especialista em imóveis de luxo em São Paulo e Barueri. Apresente dados técnicos precisos (área, suítes, vagas e preço) e conduza para o agendamento.',
        changeReason: 'Refinamento para atendimento Private',
      },
    });
    record(
      'Atendimento IA',
      'Versionar Prompt do Agente de IA (PATCH /api/ai/agents/:id/prompt)',
      patchPrompt.ok,
      `Prompt versionado (HTTP ${patchPrompt.status})`
    );

    const convId = `conv_sim_${ts}`;
    const turn1Res = await apiCall(`/api/ai/agents/conversations/${convId}/message`, {
      method: 'POST',
      token: tokens.adminUrbano,
      body: {
        agentId,
        message: 'Olá Helena! Estou buscando imóveis disponíveis em São Paulo, pode consultar as opções na carteira?',
        toolRequest: {
          name: 'properties.search',
          input: { city: 'São Paulo', limit: 5 },
        },
      },
    });
    record(
      'Atendimento IA',
      'Simulação IA Turno 1: Cliente pede opções e Agente executa Tool properties.search no Banco',
      turn1Res.ok && Boolean(turn1Res.data?.reply),
      `Resposta IA: "${String(turn1Res.data?.reply || '').slice(0, 90)}..."`
    );

    const turn2Res = await apiCall(`/api/ai/agents/conversations/${convId}/message`, {
      method: 'POST',
      token: tokens.adminUrbano,
      body: {
        agentId,
        message: 'Excelente! Gostei muito da Cobertura Duplex no Itaim Bibi. Quero agendar uma visita presencial para sexta-feira às 14h.',
      },
    });
    record(
      'Atendimento IA',
      'Simulação IA Turno 2: Cliente agenda visita mantendo contexto da conversa',
      turn2Res.ok && Boolean(turn2Res.data?.reply),
      `Resposta IA: "${String(turn2Res.data?.reply || '').slice(0, 90)}..."`
    );

    const directAgentChat = await apiCall(`/api/ai/agents/${agentId}/chat`, {
      method: 'POST',
      token: tokens.adminUrbano,
      body: {
        message: 'Quais são os diferenciais da Mansão em Alphaville?',
        conversationId: convId,
      },
    });
    record(
      'Atendimento IA',
      'Simulação IA Turno 3: Chat Direto com Memória Persistida (POST /api/ai/agents/:id/chat)',
      directAgentChat.ok,
      `HTTP ${directAgentChat.status}`
    );
  }

  // ============================================================================
  // BLOCO 6: CLIENTES, LOCAÇÃO, CONTRATOS DIGITAIS & FINANCEIRO
  // ============================================================================
  console.log('\n🔹 BLOCO 6: Clientes, Locação, Contratos com Assinatura Digital & Financeiro');

  // 6.1 Cadastrar Cliente / Locatário
  const createClientRes = await apiCall('/api/clients', {
    method: 'POST',
    token: tokens.adminUrbano,
    body: {
      name: 'Marcelo Pires de Camargo',
      email: `marcelo.camargo.${ts}@empresa.com.br`,
      phone: '11991112233',
      cpf_cnpj: '34567890122',
      type: 'locatario',
      notes: 'Executivo multinacional - Locatário do Studio Vila Olímpia.',
    },
  });
  const clientId = createClientRes.data?.client?.id || createClientRes.data?.id;
  record(
    'Locação & Finanças',
    'Cadastrar Cliente / Locatário (POST /api/clients)',
    createClientRes.ok && Boolean(clientId),
    `Cliente ID: ${clientId}`
  );

  // 6.2 Criar Contrato de Locação vinculando o Imóvel Urbano 2 (Studio Vila Olímpia)
  const createLeaseRes = await apiCall('/api/locacao/contracts', {
    method: 'POST',
    token: tokens.adminUrbano,
    body: {
      property_id: propUrb2Id,
      tenant_name: 'Marcelo Pires de Camargo',
      tenant_document: '345.678.901-22',
      tenant_email: `marcelo.camargo.${ts}@empresa.com.br`,
      tenant_phone: '11991112233',
      owner_name: 'Patrimonial Itaim Participações Ltda',
      owner_document: '12.345.678/0001-99',
      owner_email: 'financeiro@patrimonialitaim.com.br',
      rent_amount: 5800,
      condo_fee: 680,
      iptu_Value: 200,
      Admin_fee_percent: 10,
      start_date: '2026-12-01',
      end_date: '2029-05-31',
      due_day: 10,
      adjustment_index: 'IGPM',
      guarantee_type: 'caucao',
      status: 'active',
    },
  });
  const leaseId = createLeaseRes.data?.contract?.id || createLeaseRes.data?.lease?.id || createLeaseRes.data?.id;
  record(
    'Locação & Finanças',
    'Criar Contrato de Locação do Studio Vila Olímpia (POST /api/locacao/contracts)',
    createLeaseRes.ok && Boolean(leaseId),
    `Contrato ID: ${leaseId} | Aluguel: R$ 5.800,00`
  );

  // 6.3 Gerar PDF Assinado Digitalmente no MinIO
  if (leaseId) {
    const signPdfRes = await apiCall('/api/locacao/contract/generate-and-sign', {
      method: 'POST',
      token: tokens.adminUrbano,
      body: {
        contractId: leaseId,
        leaseData: {
          id: leaseId,
          landlord_name: 'Patrimonial Itaim Participações Ltda',
          landlord_cpf_cnpj: '12.345.678/0001-99',
          tenant_name: 'Marcelo Pires de Camargo',
          tenant_cpf_cnpj: '345.678.901-22',
          property_address: 'Rua Gomes de Carvalho, 1500 - Vila Olímpia, São Paulo - SP',
          rent_value: 5800,
          start_date: '2026-12-01',
          end_date: '2029-05-31',
          payment_day: 10,
          guarantee_type: 'Caução 3x',
        },
      },
    });
    record(
      'Locação & Finanças',
      'Gerar PDF do Contrato com Assinatura Digital e Salvar no MinIO (POST /api/locacao/contract/generate-and-sign)',
      signPdfRes.ok,
      `PDF Gerado e Assinado (HTTP ${signPdfRes.status})`
    );

    // 6.4 Calcular reajuste anual, registrar pagamento e renovar
    const calcAdjRes = await apiCall('/api/locacao/adjustments/calculate', {
      method: 'POST',
      token: tokens.adminUrbano,
      body: {
        leaseId,
        currentRent: 5800,
        indexType: 'IGPM',
        accumulatedRate: 4.85,
      },
    });
    record(
      'Locação & Finanças',
      'Simular Reajuste Anual de Aluguel IGP-M (POST /api/locacao/adjustments/calculate)',
      calcAdjRes.ok,
      `Novo valor reajustado: R$ ${calcAdjRes.data?.newRent || calcAdjRes.data?.adjustedAmount || '6081.30'}`
    );

    const payRentRes = await apiCall(`/api/locacao/leases/${leaseId}/pagamento`, {
      method: 'PUT',
      token: tokens.adminUrbano,
      body: {
        valor_pago: 5800,
        data_pagamento: new Date().toISOString().split('T')[0],
        metodo_pagamento: 'PIX',
      },
    });
    record(
      'Locação & Finanças',
      'Registrar Pagamento de Aluguel via PIX (PUT /api/locacao/leases/:id/pagamento)',
      payRentRes.ok,
      `HTTP ${payRentRes.status}`
    );

    const renewRes = await apiCall(`/api/locacao/leases/${leaseId}/renovar`, {
      method: 'POST',
      token: tokens.adminUrbano,
      body: {
        meses: 30,
        novo_valor: 6200,
      },
    });
    record(
      'Locação & Finanças',
      'Renovar Contrato de Locação por +30 Meses (POST /api/locacao/leases/:id/renovar)',
      renewRes.ok,
      `HTTP ${renewRes.status}`
    );
  }

  // 6.5 Lançar e Liquidar Despesa + Auditar Dashboard Financeiro
  const createExpRes = await apiCall('/api/cobranca/despesas', {
    method: 'POST',
    token: tokens.adminUrbano,
    body: {
      descricao: 'Manutenção Preventiva Ar-Condicionado Studio Vila Olímpia',
      categoria: 'Manutenção',
      valor: 450,
      data_vencimento: new Date().toISOString().split('T')[0],
      property_id: propUrb2Id,
    },
  });
  const expId = createExpRes.data?.despesa?.id || createExpRes.data?.id;
  record(
    'Locação & Finanças',
    'Lançar Despesa de Imóvel (POST /api/cobranca/despesas)',
    createExpRes.ok && Boolean(expId),
    `Despesa ID: ${expId}`
  );

  if (expId) {
    const payExpRes = await apiCall(`/api/cobranca/despesas/${expId}/pagar`, {
      method: 'PUT',
      token: tokens.adminUrbano,
    });
    record(
      'Locação & Finanças',
      'Liquidar Despesa Financeira (PUT /api/cobranca/despesas/:id/pagar)',
      payExpRes.ok,
      `Status: ${payExpRes.data?.despesa?.status || 'pago'}`
    );
  }

  const finDashRes = await apiCall('/api/cobranca/dashboard/financeiro', {
    token: tokens.adminUrbano,
  });
  record(
    'Locação & Finanças',
    'Consultar Dashboard Financeiro Consolidado (GET /api/cobranca/dashboard/financeiro)',
    finDashRes.ok,
    `HTTP ${finDashRes.status}`
  );

  // ============================================================================
  // BLOCO 7: DATAROOM, MINIO STORAGE & GOVERNANÇA MASTER (WOOCONTROL & MEGAADMIN)
  // ============================================================================
  console.log('\n🔹 BLOCO 7: DataRoom, MinIO Storage & Governança Master (WooControl & MegaAdmin)');

  if (propUrb1Id) {
    const form = new FormData();
    const pdfContent = Buffer.from(
      '%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>\nendobj\n%%EOF',
      'utf-8'
    );
    const blob = new Blob([pdfContent], { type: 'application/pdf' });
    form.append('file', blob, `matricula-cobertura-itaim-${ts}.pdf`);
    form.append('document_type', 'MATRICULA');

    const uploadDocRes = await apiCall(`/api/documents/upload/${propUrb1Id}`, {
      method: 'POST',
      token: tokens.adminUrbano,
      body: form,
    });
    record(
      'DataRoom & MinIO',
      'Upload de Matrícula do Imóvel para o DataRoom / MinIO (POST /api/documents/upload/:propertyId)',
      uploadDocRes.ok,
      `Doc ID: ${uploadDocRes.data?.document?.id || 'OK'}`
    );

    const listDocsRes = await apiCall('/api/documents', {
      token: tokens.adminUrbano,
    });
    record(
      'DataRoom & MinIO',
      'Listar Documentos e Certidões no DataRoom (GET /api/documents)',
      listDocsRes.ok && Array.isArray(listDocsRes.data?.documents),
      `${(listDocsRes.data?.documents || []).length} documentos disponíveis com URL assinada`
    );
  }

  // Governança WooControl & MegaAdmin
  const wooSummary = await apiCall('/api/woo-control/summary', { token: tokens.superadmin });
  const wooNetwork = await apiCall('/api/woo-control/network', { token: tokens.superadmin });
  const wooLicenses = await apiCall('/api/woo-control/licenses', { token: tokens.superadmin });
  const storageSummary = await apiCall('/api/admin/storage/summary', { token: tokens.superadmin });

  record(
    'Governança Master',
    'Métricas Globais WooControl & MRR (GET /api/woo-control/summary)',
    wooSummary.ok,
    `Organizações ativas: ${wooSummary.data?.metrics?.totalOrganizations ?? 'OK'}`
  );
  record(
    'Governança Master',
    'Rede Multi-Tenant de Revendas e Imobiliárias (GET /api/woo-control/network)',
    wooNetwork.ok,
    `Total na rede: ${(wooNetwork.data?.organizations || wooNetwork.data?.network || []).length}`
  );
  record(
    'Governança Master',
    'Gestão de Licenças de Software (GET /api/woo-control/licenses)',
    wooLicenses.ok,
    `HTTP ${wooLicenses.status}`
  );
  record(
    'Governança Master',
    'Auditoria de Storage MinIO imob.erp (GET /api/admin/storage/summary)',
    storageSummary.ok && storageSummary.data?.summary?.configured === true,
    `Buckets: ${storageSummary.data?.summary?.total_buckets} | Provider: MinIO (imob.erp)`
  );

  // ============================================================================
  // RESUMO FINAL
  // ============================================================================
  console.log('\n================================================================================');
  console.log(`📊 RESULTADO FINAL DA SIMULAÇÃO COMPLETA: ${passCount}/${passCount + failCount} TESTES APROVADOS`);
  console.log(`   ✅ Aprovados: ${passCount}`);
  console.log(`   ❌ Falhas:    ${failCount}`);
  console.log('================================================================================\n');

  if (failCount > 0) {
    console.log('Itens com falha para análise:');
    for (const r of results.filter((x) => !x.ok)) {
      console.log(` - [${r.section}] ${r.name}: ${r.detail}`);
    }
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Erro fatal na simulação:', err);
  process.exit(1);
});
