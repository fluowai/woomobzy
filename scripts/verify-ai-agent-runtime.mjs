import fs from 'node:fs';
import { randomUUID } from 'node:crypto';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const mode = process.argv[2] || '--postflight';
const migrationPath =
  process.argv[3] || 'migrations/20260815_ai_agent_swarm_runtime.sql';
const rawConnectionString =
  process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;

if (!rawConnectionString) {
  throw new Error('SUPABASE_DB_URL ou DATABASE_URL não configurada.');
}

const connectionUrl = new URL(rawConnectionString);
for (const key of ['sslmode', 'sslcert', 'sslkey', 'sslrootcert']) {
  connectionUrl.searchParams.delete(key);
}

const client = new pg.Client({
  connectionString: connectionUrl.toString(),
  ssl: { rejectUnauthorized: false },
});

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function fingerprint() {
  const { rows } = await client.query(`
    SELECT
      current_database() AS database,
      current_user AS database_user,
      current_setting('server_version') AS server_version
  `);
  return {
    host: connectionUrl.hostname,
    ...rows[0],
  };
}

async function preflight({ requireScheduling = true } = {}) {
  const { rows } = await client.query(`
    SELECT
      to_regclass('public.organizations') IS NOT NULL AS organizations,
      to_regclass('public.profiles') IS NOT NULL AS profiles,
      to_regclass('public.properties') IS NOT NULL AS properties,
      to_regclass('public.leads') IS NOT NULL AS leads,
      to_regclass('public.ai_agents') IS NOT NULL AS ai_agents,
      to_regclass('public.lead_appointments') IS NOT NULL AS lead_appointments,
      to_regclass('public.agendas') IS NOT NULL AS agendas,
      to_regclass('public.conversation_memory') IS NOT NULL AS conversation_memory,
      to_regclass('public.agent_learning') IS NOT NULL AS agent_learning,
      EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'lead_appointments'
          AND column_name = 'agenda_id'
      ) AS appointment_agenda,
      EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'lead_appointments'
          AND column_name = 'property_id'
      ) AS appointment_property
  `);
  const checks = rows[0];
  const schedulingChecks = new Set([
    'lead_appointments',
    'agendas',
    'appointment_agenda',
    'appointment_property',
  ]);
  const missing = Object.entries(checks)
    .filter(
      ([name, value]) =>
        !value && (requireScheduling || !schedulingChecks.has(name))
    )
    .map(([name]) => name);
  assert(!missing.length, `Pré-requisitos ausentes: ${missing.join(', ')}`);
  return checks;
}

function buildMigrationPlan(checks) {
  const files = [];
  if (!checks.lead_appointments) {
    files.push('migrations/20260729_create_lead_appointments.sql');
  }
  if (
    !checks.agendas ||
    !checks.appointment_agenda ||
    !checks.appointment_property
  ) {
    files.push('migrations/20260804_create_agendas.sql');
  }
  files.push(migrationPath);
  return files;
}

async function runMigrationTransaction(files, { commit }) {
  const sql = files
    .map((file) => `\n-- SOURCE: ${file}\n${fs.readFileSync(file, 'utf8')}`)
    .join('\n');
  await client.query('BEGIN');
  try {
    await client.query("SET LOCAL lock_timeout = '10s'");
    await client.query("SET LOCAL statement_timeout = '120s'");
    await client.query(sql);
    if (commit) await client.query('COMMIT');
    else await client.query('ROLLBACK');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  }
  return {
    files,
    committed: commit,
    rolled_back: !commit,
  };
}

async function applyRuntimeGrants() {
  await client.query(`
    GRANT ALL ON TABLE ai_conversation_states TO service_role;
    GRANT ALL ON TABLE ai_tool_executions TO service_role;
    GRANT ALL ON TABLE ai_execution_traces TO service_role;
  `);
  const { rows } = await client.query(`
    SELECT
      has_table_privilege(
        'service_role',
        'public.ai_conversation_states',
        'SELECT, INSERT, UPDATE, DELETE'
      ) AS conversation_state,
      has_table_privilege(
        'service_role',
        'public.ai_tool_executions',
        'SELECT, INSERT, UPDATE, DELETE'
      ) AS tool_execution,
      has_table_privilege(
        'service_role',
        'public.ai_execution_traces',
        'SELECT, INSERT, UPDATE, DELETE'
      ) AS execution_trace
  `);
  return rows[0];
}

async function postflight() {
  const { rows: relationRows } = await client.query(`
    SELECT
      c.relname AS relation,
      c.relrowsecurity AS rls_enabled
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname IN (
        'ai_conversation_states',
        'ai_tool_executions',
        'ai_execution_traces'
      )
    ORDER BY c.relname
  `);
  assert(relationRows.length === 3, 'Tabelas do runtime AI incompletas.');
  assert(
    relationRows.every((row) => row.rls_enabled),
    'RLS não está habilitada em todas as tabelas do runtime AI.'
  );

  const { rows: objectRows } = await client.query(`
    SELECT
      to_regprocedure('public.guard_active_appointment_slot()') IS NOT NULL
        AS appointment_guard_function,
      to_regprocedure('public.purge_expired_ai_runtime_data()') IS NOT NULL
        AS retention_function,
      EXISTS (
        SELECT 1 FROM pg_trigger
        WHERE tgname = 'trg_guard_active_appointment_slot'
          AND NOT tgisinternal
          AND tgenabled <> 'D'
      ) AS appointment_guard_trigger,
      EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'public.ai_conversation_states'::regclass
          AND contype = 'u'
          AND pg_get_constraintdef(oid) LIKE '%organization_id, session_id%'
      ) AS conversation_state_unique,
      EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'public.ai_tool_executions'::regclass
          AND contype = 'u'
          AND pg_get_constraintdef(oid) LIKE '%organization_id, idempotency_key%'
      ) AS tool_execution_unique,
      EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'conversation_memory'
          AND column_name = 'retention_until'
      ) AS conversation_retention,
      EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'agent_learning'
          AND column_name = 'retention_until'
      ) AS learning_retention,
      has_table_privilege(
        'service_role',
        'public.ai_conversation_states',
        'SELECT, INSERT, UPDATE, DELETE'
      ) AS service_role_conversation_state_acl,
      has_table_privilege(
        'service_role',
        'public.ai_tool_executions',
        'SELECT, INSERT, UPDATE, DELETE'
      ) AS service_role_tool_execution_acl,
      has_table_privilege(
        'service_role',
        'public.ai_execution_traces',
        'SELECT, INSERT, UPDATE, DELETE'
      ) AS service_role_execution_trace_acl
  `);
  const objects = objectRows[0];
  const missingObjects = Object.entries(objects)
    .filter(([, value]) => !value)
    .map(([name]) => name);
  assert(
    !missingObjects.length,
    `Objetos do runtime ausentes: ${missingObjects.join(', ')}`
  );

  const expectedPolicyTables = [
    'agent_learning',
    'agent_qualifications',
    'ai_agents',
    'conversation_memory',
    'lead_followups',
    'lead_tags',
  ];
  const { rows: policyRows } = await client.query(`
    SELECT tablename, roles
    FROM pg_policies
    WHERE schemaname = 'public'
      AND policyname LIKE 'Service role full access on %'
    ORDER BY tablename
  `);
  for (const table of expectedPolicyTables) {
    const policy = policyRows.find((row) => row.tablename === table);
    assert(policy, `Policy service_role ausente em ${table}.`);
    const roles = Array.isArray(policy.roles)
      ? policy.roles
      : String(policy.roles || '')
          .replace(/^\{|\}$/g, '')
          .split(',')
          .map((role) => role.trim())
          .filter(Boolean);
    assert(
      roles.length === 1 && roles[0] === 'service_role',
      `Policy service_role incorreta em ${table}.`
    );
    policy.roles = roles;
  }

  return {
    relations: relationRows,
    objects,
    service_role_policies: policyRows.filter((row) =>
      expectedPolicyTables.includes(row.tablename)
    ),
  };
}

async function expectUniqueViolation(statement, params) {
  await client.query('SAVEPOINT expected_unique_violation');
  try {
    await client.query(statement, params);
    throw new Error('A operação duplicada foi aceita pelo banco.');
  } catch (error) {
    await client.query('ROLLBACK TO SAVEPOINT expected_unique_violation');
    assert(
      error.code === '23505',
      `Era esperado SQLSTATE 23505, recebido ${error.code || error.message}.`
    );
  } finally {
    await client.query('RELEASE SAVEPOINT expected_unique_violation');
  }
}

async function integrationChecks() {
  const result = {
    appointment_conflict_blocked: false,
    tool_replay_blocked: false,
    cross_tenant_runtime_denied: false,
    service_role_runtime_access: false,
    rolled_back: false,
  };

  await client.query('BEGIN');
  try {
    let { rows: contextRows } = await client.query(`
      SELECT o.id AS organization_id, l.id AS lead_id
      FROM organizations o
      JOIN leads l ON l.organization_id = o.id
      LIMIT 1
    `);
    if (!contextRows.length) {
      let { rows: organizationRows } = await client.query(`
        SELECT id AS organization_id
        FROM organizations
        LIMIT 1
      `);
      if (!organizationRows.length) {
        const suffix = randomUUID();
        organizationRows = (
          await client.query(
            `INSERT INTO organizations (name, slug)
             VALUES ($1, $2)
             RETURNING id AS organization_id`,
            ['AI runtime check', `ai-runtime-check-${suffix}`]
          )
        ).rows;
      }
      const { rows: leadRows } = await client.query(
        `INSERT INTO leads (organization_id, name, phone)
         VALUES ($1, $2, $3)
         RETURNING id AS lead_id`,
        [
          organizationRows[0].organization_id,
          'AI runtime check',
          `runtime-${randomUUID()}`,
        ]
      );
      contextRows = [
        {
          organization_id: organizationRows[0].organization_id,
          lead_id: leadRows[0].lead_id,
        },
      ];
    }
    const { organization_id: organizationId, lead_id: leadId } = contextRows[0];

    const { rows: agendaRows } = await client.query(
      `INSERT INTO agendas (organization_id, name)
       VALUES ($1, $2)
       RETURNING id`,
      [organizationId, `AI runtime check ${randomUUID()}`]
    );
    const agendaId = agendaRows[0].id;
    const appointmentDate = '2099-08-15T15:00:00.000Z';
    await client.query(
      `INSERT INTO lead_appointments
        (organization_id, lead_id, agenda_id, title, appointment_date, type, status)
       VALUES ($1, $2, $3, $4, $5, 'meeting', 'pending')`,
      [organizationId, leadId, agendaId, 'AI runtime check', appointmentDate]
    );
    await expectUniqueViolation(
      `INSERT INTO lead_appointments
        (organization_id, lead_id, agenda_id, title, appointment_date, type, status)
       VALUES ($1, $2, $3, $4, $5, 'meeting', 'pending')`,
      [
        organizationId,
        leadId,
        agendaId,
        'AI runtime duplicate',
        appointmentDate,
      ]
    );
    result.appointment_conflict_blocked = true;

    const idempotencyKey = `runtime-check-${randomUUID()}`;
    await client.query(
      `INSERT INTO ai_tool_executions
        (organization_id, tool_name, idempotency_key, arguments_hash)
       VALUES ($1, 'agendar_visita', $2, $3)`,
      [organizationId, idempotencyKey, 'runtime-check']
    );
    await expectUniqueViolation(
      `INSERT INTO ai_tool_executions
        (organization_id, tool_name, idempotency_key, arguments_hash)
       VALUES ($1, 'agendar_visita', $2, $3)`,
      [organizationId, idempotencyKey, 'runtime-check']
    );
    result.tool_replay_blocked = true;
  } finally {
    await client.query('ROLLBACK');
    result.rolled_back = true;
  }

  const { rows: profileRows } = await client.query(`
    SELECT id, organization_id
    FROM profiles
    WHERE organization_id IS NOT NULL
    ORDER BY organization_id, id
    LIMIT 2
  `);
  const { rows: organizationRows } = await client.query(`
    SELECT id AS organization_id
    FROM organizations
    LIMIT 1
  `);
  const actor = profileRows[0] || {
    id: randomUUID(),
    organization_id: null,
  };
  const target = profileRows.find(
    (profile) => profile.organization_id !== actor.organization_id
  ) ||
    profileRows[0] ||
    organizationRows[0] || {
      organization_id: randomUUID(),
    };

  await client.query('BEGIN');
  try {
    await client.query('SET LOCAL ROLE authenticated');
    await client.query("SELECT set_config('request.jwt.claim.sub', $1, true)", [
      actor.id,
    ]);
    try {
      const { rows } = await client.query(
        `SELECT count(*)::int AS visible
         FROM ai_conversation_states
         WHERE organization_id = $1`,
        [target.organization_id]
      );
      result.cross_tenant_runtime_denied = rows[0].visible === 0;
    } catch (error) {
      result.cross_tenant_runtime_denied = error.code === '42501';
    }
  } finally {
    await client.query('ROLLBACK');
  }
  assert(
    result.cross_tenant_runtime_denied,
    'Role authenticated conseguiu acessar o runtime AI.'
  );

  await client.query('BEGIN');
  try {
    await client.query('SET LOCAL ROLE service_role');
    await client.query('SELECT count(*) FROM ai_conversation_states');
    result.service_role_runtime_access = true;
  } finally {
    await client.query('ROLLBACK');
  }

  return result;
}

await client.connect();
try {
  const result = { target: await fingerprint() };
  if (mode === '--preflight') result.preflight = await preflight();
  else if (mode === '--dry-run') {
    result.preflight = await preflight();
    result.dry_run = await runMigrationTransaction([migrationPath], {
      commit: false,
    });
  } else if (mode === '--dry-run-full' || mode === '--apply-full') {
    result.preflight = await preflight({ requireScheduling: false });
    const files = buildMigrationPlan(result.preflight);
    result.migration = await runMigrationTransaction(files, {
      commit: mode === '--apply-full',
    });
  } else if (mode === '--postflight') result.postflight = await postflight();
  else if (mode === '--apply-grants') {
    result.grants = await applyRuntimeGrants();
  } else if (mode === '--integration') {
    result.postflight = await postflight();
    result.integration = await integrationChecks();
  } else throw new Error(`Modo inválido: ${mode}`);

  console.log(JSON.stringify(result, null, 2));
} finally {
  await client.end();
}
