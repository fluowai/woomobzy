import dotenv from 'dotenv';
import pg from 'pg';

dotenv.config({ path: '.env' });

const { Client } = pg;

const rawConnectionString =
  process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;

if (!rawConnectionString) {
  console.error('DATABASE_URL or SUPABASE_DB_URL is required.');
  process.exit(1);
}

const connectionUrl = new URL(rawConnectionString);
connectionUrl.searchParams.set('sslmode', 'no-verify');
const connectionString = connectionUrl.toString();

const client = new Client({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

const FAZENDAS = {
  name: 'Fazendas Brasil',
  slug: 'fazendasbrasil',
  legacySlug: 'fazendas-brasil',
  domain: 'fazendasbrasil.com',
  wwwDomain: 'www.fazendasbrasil.com',
  legacyDomain: 'fazendasbrasil.com.br',
  legacyWwwDomain: 'www.fazendasbrasil.com.br',
  logoUrl: '/images/fazendas-brasil/logo.png',
  brokerPhotoUrl: '/images/fazendas-brasil/renato.png',
  phone: '(44) 99843-3030',
  phoneDigits: '5544998433030',
  email: 'contato@fazendasbrasil.com.br',
  ownerEmail: 'contato@fazendasbrasil.com.br',
};

async function tableColumns(tableName) {
  const { rows } = await client.query(
    `
      select column_name
      from information_schema.columns
      where table_schema = 'public'
        and table_name = $1
    `,
    [tableName]
  );
  return new Set(rows.map((row) => row.column_name));
}

function pickColumns(columns, data) {
  return Object.entries(data).filter(([key]) => columns.has(key));
}

async function upsertOrganization() {
  const orgColumns = await tableColumns('organizations');
  const ownerEmailClause = orgColumns.has('owner_email')
    ? "or lower(coalesce(owner_email, '')) = lower($7)"
    : '';

  await client.query(
    `
      update public.organizations
      set custom_domain = null
      where lower(custom_domain) in (lower($1), lower($2), lower($3), lower($4))
        and slug not in ($5, $6)
    `,
    [
      FAZENDAS.domain,
      FAZENDAS.wwwDomain,
      FAZENDAS.legacyDomain,
      FAZENDAS.legacyWwwDomain,
      FAZENDAS.slug,
      FAZENDAS.legacySlug,
    ]
  );

  const { rows } = await client.query(
    `
      select *
      from public.organizations
      where slug in ($1, $2)
        or lower(coalesce(custom_domain, '')) in (lower($3), lower($4), lower($5), lower($6))
        ${ownerEmailClause}
        or lower(name) in ('fazendas brasil', 'imobiliaria fazendas brasil')
      order by created_at nulls last
      limit 1
    `,
    [
      FAZENDAS.slug,
      FAZENDAS.legacySlug,
      FAZENDAS.domain,
      FAZENDAS.wwwDomain,
      FAZENDAS.legacyDomain,
      FAZENDAS.legacyWwwDomain,
      FAZENDAS.ownerEmail,
    ]
  );

  const fields = pickColumns(orgColumns, {
    name: FAZENDAS.name,
    slug: FAZENDAS.slug,
    subdomain: FAZENDAS.slug,
    custom_domain: FAZENDAS.domain,
    logo_url: FAZENDAS.logoUrl,
    logo_height: 86,
    primary_color: '#064e2f',
    secondary_color: '#c98b16',
    status: 'active',
    niche: 'rural',
    owner_email: FAZENDAS.ownerEmail,
    updated_at: new Date().toISOString(),
  });

  if (rows[0]) {
    const setSql = fields
      .map(([key], index) => `${key} = $${index + 1}`)
      .join(', ');
    await client.query(
      `update public.organizations set ${setSql} where id = $${fields.length + 1}`,
      [...fields.map(([, value]) => value), rows[0].id]
    );
    return rows[0].id;
  }

  const insertFields = fields.filter(([key]) => key !== 'updated_at');
  const columnsSql = insertFields.map(([key]) => key).join(', ');
  const valuesSql = insertFields.map((_, index) => `$${index + 1}`).join(', ');
  const { rows: inserted } = await client.query(
    `insert into public.organizations (${columnsSql}) values (${valuesSql}) returning id`,
    insertFields.map(([, value]) => value)
  );
  return inserted[0].id;
}

async function upsertDomains(organizationId) {
  const columns = await tableColumns('domains');
  if (
    columns.size === 0 ||
    !columns.has('organization_id') ||
    !columns.has('domain')
  )
    return;

  const domains = [
    FAZENDAS.domain,
    FAZENDAS.wwwDomain,
    FAZENDAS.legacyDomain,
    FAZENDAS.legacyWwwDomain,
  ];

  for (const domain of domains) {
    const payload = pickColumns(columns, {
      organization_id: organizationId,
      domain,
      is_custom: true,
      is_primary: domain === FAZENDAS.domain,
      status: 'active',
      ssl_status: 'active',
      verified_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    const updateFields = payload.filter(([key]) => key !== 'domain');
    const insertColumns = payload.map(([key]) => key).join(', ');
    const insertValues = payload.map((_, index) => `$${index + 1}`).join(', ');
    const updateSql = updateFields
      .map(([key], index) => `${key} = $${payload.length + index + 1}`)
      .join(', ');

    await client.query(
      `
        insert into public.domains (${insertColumns})
        values (${insertValues})
        on conflict (domain) do update set ${updateSql}
      `,
      [
        ...payload.map(([, value]) => value),
        ...updateFields.map(([, value]) => value),
      ]
    );
  }
}

async function upsertSiteSettings(organizationId) {
  const columns = await tableColumns('site_settings');
  if (columns.size === 0 || !columns.has('organization_id')) return;

  const payload = pickColumns(columns, {
    organization_id: organizationId,
    agency_name: FAZENDAS.name,
    agencyName: FAZENDAS.name,
    is_live: true,
    isLive: true,
    template_id: 'fazendas-brasil',
    primary_color: '#064e2f',
    secondary_color: '#c98b16',
    header_color: '#ffffff',
    logo_url: FAZENDAS.logoUrl,
    logoHeight: 86,
    logo_height: 86,
    contact_phone: FAZENDAS.phone,
    contact_email: FAZENDAS.email,
    footer_text: `© ${new Date().getFullYear()} Fazendas Brasil. Todos os direitos reservados.`,
    social_links: JSON.stringify({
      whatsapp: `https://wa.me/${FAZENDAS.phoneDigits}`,
    }),
    home_content: JSON.stringify({
      broker_name: 'Renato Piovesana',
      broker_creci: 'CRECI 16644F',
      broker_photo: FAZENDAS.brokerPhotoUrl,
      broker_bio:
        'Mais de 20 anos no mercado rural conectando investidores e produtores as melhores oportunidades.',
      hero_title: 'Fazendas do Brasil em um so lugar',
      hero_subtitle:
        'Conectamos investidores e produtores as melhores oportunidades rurais do pais.',
    }),
    updated_at: new Date().toISOString(),
  });

  const { rows } = await client.query(
    'select id from public.site_settings where organization_id = $1 limit 1',
    [organizationId]
  );

  if (rows[0]) {
    const fields = payload.filter(([key]) => key !== 'organization_id');
    if (fields.length === 0) return;
    const setSql = fields
      .map(([key], index) => `${key} = $${index + 1}`)
      .join(', ');
    await client.query(
      `update public.site_settings set ${setSql} where organization_id = $${fields.length + 1}`,
      [...fields.map(([, value]) => value), organizationId]
    );
    return;
  }

  const columnsSql = payload.map(([key]) => key).join(', ');
  const valuesSql = payload.map((_, index) => `$${index + 1}`).join(', ');
  await client.query(
    `insert into public.site_settings (${columnsSql}) values (${valuesSql})`,
    payload.map(([, value]) => value)
  );
}

async function ensurePublishedMarker(organizationId) {
  const columns = await tableColumns('landing_pages');
  if (
    columns.size === 0 ||
    !columns.has('organization_id') ||
    !columns.has('slug')
  )
    return;

  const { rows } = await client.query(
    `
      select id
      from public.landing_pages
      where organization_id = $1
        and slug in ('home', 'inicio', 'site')
      limit 1
    `,
    [organizationId]
  );

  const payload = pickColumns(columns, {
    organization_id: organizationId,
    user_id: null,
    name: 'Site Fazendas Brasil',
    slug: 'home',
    title: 'Fazendas Brasil',
    description: 'As melhores fazendas do Brasil em um so lugar.',
    meta_title: 'Fazendas Brasil',
    meta_description:
      'Fazendas a venda em todo o Brasil com curadoria especializada em imoveis rurais.',
    template_id: 'fazendas-brasil-custom',
    theme_config: JSON.stringify({
      primaryColor: '#064e2f',
      secondaryColor: '#c98b16',
      backgroundColor: '#f7f8f4',
      textColor: '#132018',
      fontFamily: 'Inter, sans-serif',
    }),
    blocks: JSON.stringify([]),
    settings: JSON.stringify({ showBranding: false }),
    property_selection: JSON.stringify({ mode: 'all', limit: 12 }),
    form_config: JSON.stringify({
      enabled: true,
      whatsappEnabled: true,
      whatsappNumber: FAZENDAS.phoneDigits,
      recipientEmail: FAZENDAS.email,
    }),
    content: JSON.stringify([]),
    status: 'published',
    is_active: true,
    published_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });

  if (rows[0]) {
    const fields = payload.filter(
      ([key]) => key !== 'organization_id' && key !== 'slug'
    );
    const setSql = fields
      .map(([key], index) => `${key} = $${index + 1}`)
      .join(', ');
    await client.query(
      `update public.landing_pages set ${setSql} where id = $${fields.length + 1}`,
      [...fields.map(([, value]) => value), rows[0].id]
    );
    return;
  }

  const columnsSql = payload.map(([key]) => key).join(', ');
  const valuesSql = payload.map((_, index) => `$${index + 1}`).join(', ');
  await client.query(
    `insert into public.landing_pages (${columnsSql}) values (${valuesSql})`,
    payload.map(([, value]) => value)
  );
}

try {
  await client.connect();
  await client.query('begin');
  const organizationId = await upsertOrganization();
  await upsertDomains(organizationId);
  await upsertSiteSettings(organizationId);
  await ensurePublishedMarker(organizationId);
  await client.query('commit');
  console.log(
    `Fazendas Brasil published for organization ${organizationId} at ${FAZENDAS.domain}`
  );
} catch (error) {
  await client.query('rollback').catch(() => {});
  console.error('Failed to publish Fazendas Brasil site:', error.message);
  process.exitCode = 1;
} finally {
  await client.end().catch(() => {});
}
