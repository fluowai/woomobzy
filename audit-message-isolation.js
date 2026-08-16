import 'dotenv/config';
import { Client } from 'pg';
import fs from 'node:fs';
import path from 'node:path';

const DATABASE_URL = stripQuotes(
  process.env.DATABASE_URL || process.env.SUPABASE_DB_URL || ''
);
const NORMALIZED_DATABASE_URL = normalizeDatabaseUrl(DATABASE_URL);

if (!DATABASE_URL) {
  console.error('ERRO: DATABASE_URL ou SUPABASE_DB_URL nao encontrada no .env');
  process.exit(1);
}

const client = new Client({
  connectionString: NORMALIZED_DATABASE_URL,
  ssl:
    DATABASE_URL.includes('supabase') ||
    DATABASE_URL.includes('sslmode=require')
      ? { rejectUnauthorized: false }
      : undefined,
});

const REPORT = {
  generatedAt: new Date().toISOString(),
  status: 'PENDING',
  schema: {},
  database: {},
  code: {},
  riskLevel: 'UNKNOWN',
  likelyCauses: [],
  recommendedFixes: [],
};

const TABLE_SETS = [
  {
    label: 'imobzy_whatsapp',
    messages: 'whatsapp_messages',
    conversations: 'whatsapp_chats',
    contacts: 'whatsapp_contacts',
    instances: 'whatsapp_instances',
    messageConversationColumn: 'chat_id',
    conversationChatColumn: 'chat_jid',
    messageChatColumn: null,
    contactPhoneColumn: 'phone',
  },
  {
    label: 'generic',
    messages: 'messages',
    conversations: 'conversations',
    contacts: 'contacts',
    instances: 'whatsapp_instances',
    messageConversationColumn: 'conversation_id',
    conversationChatColumn: 'whatsapp_chat_id',
    messageChatColumn: 'whatsapp_chat_id',
    contactPhoneColumn: 'phone',
  },
];

function stripQuotes(value) {
  return value.trim().replace(/^['"]|['"]$/g, '');
}

function normalizeDatabaseUrl(value) {
  try {
    const url = new URL(value);
    url.searchParams.delete('sslmode');
    return url.toString();
  } catch {
    return value;
  }
}

function section(title) {
  console.log('\n============================================================');
  console.log(title);
  console.log('============================================================');
}

function logFinding(type, message, rows = []) {
  console.log(`\n[${type}] ${message}`);
  if (rows?.length) {
    console.table(rows.slice(0, 20));
    if (rows.length > 20)
      console.log(`... mostrando 20 de ${rows.length} registros`);
  }
}

async function tableExists(tableName) {
  const result = await client.query(
    `
    SELECT EXISTS (
      SELECT FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name = $1
    ) AS exists;
    `,
    [tableName]
  );

  return result.rows[0]?.exists === true;
}

async function columnExists(tableName, columnName) {
  const result = await client.query(
    `
    SELECT EXISTS (
      SELECT FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = $1
      AND column_name = $2
    ) AS exists;
    `,
    [tableName, columnName]
  );

  return result.rows[0]?.exists === true;
}

async function getColumns(tableName) {
  const result = await client.query(
    `
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = $1
    ORDER BY ordinal_position;
    `,
    [tableName]
  );
  return result.rows.map((row) => row.column_name);
}

async function safeQuery(name, sql) {
  try {
    const result = await client.query(sql);
    REPORT.database[name] = {
      ok: true,
      count: result.rows.length,
      rows: result.rows,
    };
    return result.rows;
  } catch (error) {
    REPORT.database[name] = {
      ok: false,
      error: error.message,
    };
    console.log(`\n[ERRO NA QUERY: ${name}] ${error.message}`);
    return [];
  }
}

async function detectSchema() {
  section('1. DETECCAO DO SCHEMA REAL');

  for (const tableSet of TABLE_SETS) {
    const exists = {
      messages: await tableExists(tableSet.messages),
      conversations: await tableExists(tableSet.conversations),
      contacts: await tableExists(tableSet.contacts),
      instances: await tableExists(tableSet.instances),
    };

    REPORT.schema[tableSet.label] = {
      tables: tableSet,
      exists,
    };

    if (exists.messages && exists.conversations && exists.instances) {
      const columns = {
        messages: await getColumns(tableSet.messages),
        conversations: await getColumns(tableSet.conversations),
        contacts: exists.contacts ? await getColumns(tableSet.contacts) : [],
        instances: await getColumns(tableSet.instances),
      };
      REPORT.schema[tableSet.label].columns = columns;
      logFinding('INFO', `Schema detectado: ${tableSet.label}`, [
        { table: tableSet.messages, columns: columns.messages.join(', ') },
        {
          table: tableSet.conversations,
          columns: columns.conversations.join(', '),
        },
        { table: tableSet.instances, columns: columns.instances.join(', ') },
      ]);
      return { ...tableSet, exists, columns };
    }
  }

  logFinding('CRITICO', 'Nenhum schema minimo de mensagens foi encontrado.');
  REPORT.status = 'MISSING_REQUIRED_TABLES';
  return null;
}

async function auditRequiredColumns(schema) {
  section('2. COLUNAS CRITICAS DE ISOLAMENTO');

  const checks = [
    [schema.messages, 'instance_id'],
    [schema.conversations, 'instance_id'],
    [schema.instances, 'tenant_id'],
  ];

  if (schema.label === 'generic') {
    checks.push(
      [schema.messages, 'tenant_id'],
      [schema.conversations, 'tenant_id'],
      [schema.messages, schema.messageConversationColumn],
      [schema.conversations, schema.conversationChatColumn]
    );
  }

  if (schema.exists.contacts) {
    checks.push([schema.contacts, schema.contactPhoneColumn]);
    if (schema.label === 'generic') checks.push([schema.contacts, 'tenant_id']);
    if (schema.label === 'imobzy_whatsapp')
      checks.push([schema.contacts, 'instance_id']);
  }

  const rows = [];
  for (const [table, column] of checks) {
    const exists = await columnExists(table, column);
    rows.push({ table, column, exists });
    if (!exists)
      REPORT.likelyCauses.push(`Coluna critica ausente: ${table}.${column}`);
  }

  logFinding(
    rows.some((row) => !row.exists) ? 'ALERTA' : 'OK',
    'Colunas criticas:',
    rows
  );
}

async function auditMissingTenant(schema) {
  section('3. REGISTROS SEM TENANT');

  if (await columnExists(schema.messages, 'tenant_id')) {
    const rows = await safeQuery(
      `${schema.messages}_without_tenant`,
      `
      SELECT id, instance_id, tenant_id, created_at
      FROM ${schema.messages}
      WHERE tenant_id IS NULL
      ORDER BY created_at DESC
      LIMIT 100;
      `
    );
    if (rows.length) {
      logFinding(
        'CRITICO',
        `Mensagens sem tenant_id em ${schema.messages}.`,
        rows
      );
      REPORT.likelyCauses.push('Mensagens foram gravadas sem tenant_id.');
    } else {
      logFinding('OK', `Nenhuma mensagem sem tenant_id em ${schema.messages}.`);
    }
  } else {
    REPORT.recommendedFixes.push(
      `${schema.messages} nao possui tenant_id; isolamento precisa ser garantido por instance_id + whatsapp_instances.tenant_id.`
    );
  }

  if (await columnExists(schema.conversations, 'tenant_id')) {
    const rows = await safeQuery(
      `${schema.conversations}_without_tenant`,
      `
      SELECT id, instance_id, tenant_id, created_at
      FROM ${schema.conversations}
      WHERE tenant_id IS NULL
      ORDER BY created_at DESC
      LIMIT 100;
      `
    );
    if (rows.length) {
      logFinding(
        'CRITICO',
        `Conversas sem tenant_id em ${schema.conversations}.`,
        rows
      );
      REPORT.likelyCauses.push('Conversas foram criadas sem tenant_id.');
    } else {
      logFinding(
        'OK',
        `Nenhuma conversa sem tenant_id em ${schema.conversations}.`
      );
    }
  } else {
    REPORT.recommendedFixes.push(
      `${schema.conversations} nao possui tenant_id; consultas devem sempre validar instance_id contra whatsapp_instances.tenant_id.`
    );
  }
}

async function auditTenantMismatchWithInstance(schema) {
  section('4. TENANT DIFERENTE DA INSTANCIA');

  if (await columnExists(schema.messages, 'tenant_id')) {
    const rows = await safeQuery(
      `${schema.messages}_tenant_mismatch_instance`,
      `
      SELECT
        m.id AS message_id,
        m.tenant_id AS message_tenant_id,
        m.instance_id,
        wi.tenant_id AS instance_tenant_id,
        m.created_at
      FROM ${schema.messages} m
      JOIN ${schema.instances} wi ON wi.id = m.instance_id
      WHERE m.tenant_id IS NOT NULL
      AND wi.tenant_id IS NOT NULL
      AND m.tenant_id <> wi.tenant_id
      ORDER BY m.created_at DESC
      LIMIT 100;
      `
    );
    if (rows.length) {
      logFinding(
        'CRITICO',
        'Mensagens com tenant_id diferente da instancia.',
        rows
      );
      REPORT.likelyCauses.push(
        'Ingestao/webhook atribuiu tenant errado a mensagem.'
      );
    } else {
      logFinding(
        'OK',
        'Nenhum conflito de tenant entre mensagens e instancias.'
      );
    }
  }

  if (await columnExists(schema.conversations, 'tenant_id')) {
    const rows = await safeQuery(
      `${schema.conversations}_tenant_mismatch_instance`,
      `
      SELECT
        c.id AS conversation_id,
        c.tenant_id AS conversation_tenant_id,
        c.instance_id,
        wi.tenant_id AS instance_tenant_id,
        c.created_at
      FROM ${schema.conversations} c
      JOIN ${schema.instances} wi ON wi.id = c.instance_id
      WHERE c.tenant_id IS NOT NULL
      AND wi.tenant_id IS NOT NULL
      AND c.tenant_id <> wi.tenant_id
      ORDER BY c.created_at DESC
      LIMIT 100;
      `
    );
    if (rows.length) {
      logFinding(
        'CRITICO',
        'Conversas com tenant_id diferente da instancia.',
        rows
      );
      REPORT.likelyCauses.push(
        'Conversa criada ou atualizada usando tenant incorreto.'
      );
    } else {
      logFinding(
        'OK',
        'Nenhum conflito de tenant entre conversas e instancias.'
      );
    }
  }
}

async function auditInstanceAccessRisks(schema) {
  section('5. RISCO DE ACESSO POR INSTANCE_ID');

  const duplicateChats = await safeQuery(
    `${schema.conversations}_duplicated_chat_ids`,
    `
    SELECT
      c.${schema.conversationChatColumn} AS whatsapp_chat_id,
      COUNT(*) AS total_conversations,
      COUNT(DISTINCT c.instance_id) AS total_instances,
      COUNT(DISTINCT wi.tenant_id) AS total_tenants,
      ARRAY_AGG(c.id) AS conversation_ids,
      ARRAY_AGG(c.instance_id) AS instance_ids,
      ARRAY_AGG(wi.tenant_id) AS tenant_ids
    FROM ${schema.conversations} c
    LEFT JOIN ${schema.instances} wi ON wi.id = c.instance_id
    WHERE c.${schema.conversationChatColumn} IS NOT NULL
    GROUP BY c.${schema.conversationChatColumn}
    HAVING COUNT(*) > 1
    ORDER BY COUNT(*) DESC
    LIMIT 100;
    `
  );

  if (duplicateChats.length) {
    logFinding(
      'ALERTA',
      'Mesmo chat/JID aparece em mais de uma conversa. Isso exige filtro por tenant + instance.',
      duplicateChats
    );
    REPORT.likelyCauses.push(
      'Possivel uso de chat_jid/whatsapp_chat_id como identificador global sem validar instance_id e tenant.'
    );
  } else {
    logFinding('OK', 'Nenhum chat/JID duplicado encontrado.');
  }

  const orphanMessages = await safeQuery(
    `${schema.messages}_orphan_without_conversation`,
    `
    SELECT m.id, m.instance_id, m.${schema.messageConversationColumn} AS conversation_id, m.created_at
    FROM ${schema.messages} m
    LEFT JOIN ${schema.conversations} c ON c.id = m.${schema.messageConversationColumn}
    WHERE m.${schema.messageConversationColumn} IS NOT NULL
    AND c.id IS NULL
    ORDER BY m.created_at DESC
    LIMIT 100;
    `
  );

  if (orphanMessages.length) {
    logFinding(
      'ALERTA',
      'Mensagens apontam para conversa inexistente.',
      orphanMessages
    );
    REPORT.likelyCauses.push(
      'Mensagens foram criadas sem consistencia com conversas.'
    );
  } else {
    logFinding('OK', 'Nenhuma mensagem orfa encontrada.');
  }

  const orphanConversations = await safeQuery(
    `${schema.conversations}_orphan_without_instance`,
    `
    SELECT c.id, c.instance_id, c.${schema.conversationChatColumn} AS whatsapp_chat_id, c.created_at
    FROM ${schema.conversations} c
    LEFT JOIN ${schema.instances} wi ON wi.id = c.instance_id
    WHERE c.instance_id IS NOT NULL
    AND wi.id IS NULL
    ORDER BY c.created_at DESC
    LIMIT 100;
    `
  );

  if (orphanConversations.length) {
    logFinding(
      'CRITICO',
      'Conversas vinculadas a instancias inexistentes.',
      orphanConversations
    );
    REPORT.likelyCauses.push(
      'Conversa sem vinculo confiavel com instancia WhatsApp.'
    );
  } else {
    logFinding('OK', 'Nenhuma conversa orfa sem instancia encontrada.');
  }
}

async function auditContacts(schema) {
  section('6. CONTATOS COMPARTILHADOS');

  if (!schema.exists.contacts) {
    logFinding('INFO', 'Tabela de contatos nao encontrada neste schema.');
    return;
  }

  const tenantExpression =
    schema.label === 'imobzy_whatsapp' ? 'wi.tenant_id' : 'c.tenant_id';
  const join =
    schema.label === 'imobzy_whatsapp'
      ? `LEFT JOIN ${schema.instances} wi ON wi.id = c.instance_id`
      : '';

  const rows = await safeQuery(
    `${schema.contacts}_same_phone_multiple_tenants`,
    `
    SELECT
      c.${schema.contactPhoneColumn} AS phone,
      COUNT(*) AS total_contacts,
      COUNT(DISTINCT ${tenantExpression}) AS total_tenants,
      ARRAY_AGG(c.id) AS contact_ids,
      ARRAY_AGG(${tenantExpression}) AS tenant_ids
    FROM ${schema.contacts} c
    ${join}
    WHERE c.${schema.contactPhoneColumn} IS NOT NULL
    GROUP BY c.${schema.contactPhoneColumn}
    HAVING COUNT(DISTINCT ${tenantExpression}) > 1
    ORDER BY COUNT(DISTINCT ${tenantExpression}) DESC
    LIMIT 100;
    `
  );

  if (rows.length) {
    logFinding(
      'INFO',
      'Mesmo telefone aparece em multiplos tenants. Normal em SaaS, perigoso se buscar so por telefone.',
      rows
    );
    REPORT.recommendedFixes.push(
      'Garantir busca de contato por tenant/instance + phone, nunca apenas por phone.'
    );
  } else {
    logFinding('OK', 'Nenhum telefone compartilhado entre tenants encontrado.');
  }
}

async function auditIndexesAndRls(schema) {
  section('7. INDICES, CONSTRAINTS E RLS');

  const tables = [
    schema.messages,
    schema.conversations,
    schema.contacts,
    schema.instances,
  ]
    .filter(Boolean)
    .filter((value, index, arr) => arr.indexOf(value) === index);
  const quoted = tables.map((table) => `'${table}'`).join(',');

  const indexes = await safeQuery(
    'indexes',
    `
    SELECT tablename, indexname, indexdef
    FROM pg_indexes
    WHERE schemaname = 'public'
    AND tablename IN (${quoted})
    ORDER BY tablename, indexname;
    `
  );
  logFinding('INFO', 'Indices encontrados:', indexes);

  const rls = await safeQuery(
    'rls_status',
    `
    SELECT c.relname AS table_name, c.relrowsecurity AS rls_enabled, c.relforcerowsecurity AS rls_forced
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
    AND c.relname IN (${quoted});
    `
  );
  logFinding('INFO', 'Status RLS:', rls);

  if (rls.some((row) => !row.rls_enabled)) {
    REPORT.recommendedFixes.push(
      'Ativar RLS nas tabelas WhatsApp se qualquer acesso direto pelo Supabase for permitido.'
    );
  }
}

async function scanCodeForDangerousPatterns() {
  section('8. AUDITORIA DO CODIGO');

  const patterns = [
    {
      name: 'SELECT whatsapp_messages exposto sem JOIN de instancia',
      regex:
        /select[\s\S]{0,180}from\s+whatsapp_messages(?![\s\S]{0,320}join\s+whatsapp_instances)/gi,
    },
    { name: 'Socket io.emit global', regex: /\bio\.emit\s*\(/g },
    {
      name: 'Socket broadcast sem sala tenant',
      regex: /broadcast\s*\([^)]*(new_message|message|chat)/gi,
    },
    {
      name: 'Uso direto de req.user.id como tenant WhatsApp',
      regex:
        /tenant_id['"]?\s*[:,=]\s*req\.user\.id|tenant_id['"]?\s*[:,=]\s*req\.user\?\.id|set\(['"]tenant_id['"],\s*req\.user\?\.id\)/g,
    },
  ];

  const files = listSourceFiles(process.cwd());
  const findings = [];

  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');
    for (const pattern of patterns) {
      const matches = content.match(pattern.regex);
      if (matches?.length) {
        findings.push({
          file: path.relative(process.cwd(), file),
          issue: pattern.name,
          occurrences: matches.length,
        });
      }
    }
  }

  REPORT.code.dangerousPatterns = findings;
  if (findings.length) {
    logFinding(
      'ALERTA',
      'Pontos perigosos encontrados no codigo. Revisar manualmente.',
      findings
    );
    REPORT.likelyCauses.push(
      'Existem consultas/proxy/realtime potencialmente globais ou usando usuario como tenant.'
    );
  } else {
    logFinding('OK', 'Nenhum padrao perigoso obvio encontrado no codigo.');
  }
}

function listSourceFiles(root) {
  const ignored = new Set([
    'node_modules',
    'dist',
    'build',
    '.next',
    '.git',
    'coverage',
  ]);
  const output = [];

  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (ignored.has(entry.name)) continue;
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (
        /\.(js|ts|tsx|jsx|go)$/.test(entry.name) &&
        entry.name !== 'audit-message-isolation.js'
      ) {
        output.push(fullPath);
      }
    }
  }

  walk(root);
  return output;
}

function classifyRisk() {
  const criticalRows = Object.entries(REPORT.database).reduce(
    (acc, [key, item]) => {
      if (!item?.ok) return acc;
      if (
        key.includes('without_tenant') ||
        key.includes('tenant_mismatch_instance') ||
        key.includes('orphan_without_instance')
      ) {
        return acc + item.count;
      }
      return acc;
    },
    0
  );

  const codeFindings = REPORT.code.dangerousPatterns?.length || 0;

  if (criticalRows > 0) {
    REPORT.riskLevel = 'CRITICAL';
    REPORT.status = 'DATA_LEAK_RISK_CONFIRMED';
  } else if (codeFindings > 0) {
    REPORT.riskLevel = 'HIGH';
    REPORT.status = 'CODE_RISK_FOUND';
  } else {
    REPORT.riskLevel = 'LOW';
    REPORT.status = 'NO_OBVIOUS_LEAK_FOUND';
  }
}

function generateSolutionPlan() {
  section('9. PLANO DE SOLUCAO RECOMENDADO');

  const defaultFixes = [
    'Usar req.orgId como tenant do WhatsApp no proxy Node, nunca req.user.id.',
    'Validar no Go que instance_id pertence ao tenant_id antes de listar chats, listar mensagens, marcar lido, renomear contato ou enviar mensagem.',
    'Listar mensagens somente depois de confirmar que o chat pertence a uma instancia do tenant atual.',
    'WebSocket deve enviar eventos por tenant_id + instance_id, e o cliente deve ignorar eventos de outra instancia.',
    'Criar testes com dois tenants, duas instancias e o mesmo telefone aparecendo nos dois.',
    'Retornar 403 ao tentar acessar chat_id ou instance_id de outro tenant.',
  ];

  REPORT.recommendedFixes = Array.from(
    new Set([...REPORT.recommendedFixes, ...defaultFixes])
  );

  console.log('\nCAUSAS PROVAVEIS:');
  const causes = Array.from(new Set(REPORT.likelyCauses));
  if (!causes.length)
    console.log(
      '- Nenhuma causa obvia confirmada, revisar backend e socket mesmo assim.'
    );
  for (const cause of causes) console.log(`- ${cause}`);

  console.log('\nCORRECOES RECOMENDADAS:');
  for (const fix of REPORT.recommendedFixes) console.log(`- ${fix}`);
}

function saveReport() {
  section('10. GERANDO RELATORIO');
  classifyRisk();

  const reportPath = path.join(
    process.cwd(),
    `imobzy-message-isolation-report-${Date.now()}.json`
  );
  fs.writeFileSync(reportPath, JSON.stringify(REPORT, null, 2), 'utf8');

  console.log(`Relatorio salvo em: ${reportPath}`);
  console.log(`Status: ${REPORT.status}`);
  console.log(`Risco: ${REPORT.riskLevel}`);
}

async function main() {
  try {
    section('IMOBZY - AUDITORIA P0 DE ISOLAMENTO MULTI-TENANT');
    console.log('Conectando ao banco...');
    await client.connect();
    console.log('Conectado.');

    const schema = await detectSchema();
    if (!schema) {
      saveReport();
      return;
    }

    await auditRequiredColumns(schema);
    await auditMissingTenant(schema);
    await auditTenantMismatchWithInstance(schema);
    await auditInstanceAccessRisks(schema);
    await auditContacts(schema);
    await auditIndexesAndRls(schema);
    await scanCodeForDangerousPatterns();
    generateSolutionPlan();
    saveReport();

    section('CONCLUSAO');
    if (REPORT.riskLevel === 'CRITICAL') {
      console.log('RISCO CRITICO CONFIRMADO.');
    } else if (REPORT.riskLevel === 'HIGH') {
      console.log(
        'RISCO ALTO: o banco nao confirmou vazamento critico, mas o codigo tem pontos perigosos.'
      );
    } else {
      console.log('Nenhum vazamento obvio encontrado pela auditoria.');
    }
  } catch (error) {
    console.error('\nERRO FATAL NA AUDITORIA:');
    console.error(error);
  } finally {
    await client.end().catch(() => {});
  }
}

main();
