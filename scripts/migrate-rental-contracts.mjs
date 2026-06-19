#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const colors = {
  reset: '\x1b[0m', green: '\x1b[32m', red: '\x1b[31m',
  yellow: '\x1b[33m', blue: '\x1b[34m', cyan: '\x1b[36m',
};
const log = {
  info: (m) => console.log(`${colors.blue}\u2139${colors.reset} ${m}`),
  success: (m) => console.log(`${colors.green}\u2705 ${m}${colors.reset}`),
  error: (m) => console.log(`${colors.red}\u274C ${m}${colors.reset}`),
  warn: (m) => console.log(`${colors.yellow}\u26A0\uFE0F  ${m}${colors.reset}`),
};

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  log.error('VITE_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY n\u00E3o configuradas');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function query(sql) {
  const { data, error } = await supabase.rpc('exec_sql', { sql });
  if (error) throw error;
  return data;
}

const LEASE_STATUS_MAP = {
  active: 'active',
  expired: 'expired',
  terminated: 'terminated',
};

const PAYMENT_STATUS_MAP = {
  em_dia: 'em_dia',
  atrasado: 'atrasado',
  inadimplente: 'inadimplente',
};

async function migrateRentalContracts() {
  console.log(`${colors.cyan}
\u2554\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2557
\u2551  rental_contracts \u2192 leases Data Migration    \u2551
\u255a\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u255d
${colors.reset}`);

  // Create migration tracking table
  log.info('Creating migration tracking table...');
  await query(`
    CREATE TABLE IF NOT EXISTS _rental_contracts_migration (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      rental_contract_id UUID NOT NULL UNIQUE,
      lease_id UUID NOT NULL,
      organization_id UUID,
      migrated_at TIMESTAMPTZ DEFAULT now(),
      status TEXT DEFAULT 'pending'
    );
  `);
  log.success('Tracking table ready');

  // Step 1: Migrate rental_contracts -> leases
  log.info('Step 1: Migrating rental_contracts to leases...');

  const { data: contracts, error: fetchError } = await supabase
    .from('rental_contracts')
    .select('*')
    .order('created_at', { ascending: true });

  if (fetchError) throw fetchError;
  if (!contracts || contracts.length === 0) {
    log.warn('No rental_contracts found to migrate');
    return;
  }

  log.info(`Found ${contracts.length} contracts to migrate`);

  let migrated = 0;
  let skipped = 0;
  let errors = 0;

  for (const rc of contracts) {
    // Check if already migrated
    const { data: existing } = await supabase
      .from('_rental_contracts_migration')
      .select('lease_id')
      .eq('rental_contract_id', rc.id)
      .single();

    if (existing) {
      skipped++;
      continue;
    }

    const leaseData = {
      organization_id: rc.organization_id,
      property_id: rc.property_id,
      tenant_name: rc.tenant_name,
      tenant_email: rc.tenant_email,
      tenant_phone: rc.tenant_phone,
      tenant_cpf: rc.tenant_cpf || null,
      tenant_rg: rc.tenant_rg || null,
      tenant_birth_date: rc.tenant_birth_date || null,
      tenant_marital_status: rc.tenant_marital_status || null,
      tenant_profession: rc.tenant_profession || null,
      tenant_employer: rc.tenant_employer || null,
      tenant_monthly_income: rc.tenant_monthly_income || null,
      start_date: rc.start_date,
      end_date: rc.end_date,
      monthly_rent: rc.monthly_rent || 0,
      adjustment_index: rc.adjustment_index || 'IGPM',
      payment_status: PAYMENT_STATUS_MAP[rc.payment_status] || 'em_dia',
      status: LEASE_STATUS_MAP[rc.status] || 'active',
      created_at: rc.created_at,
      updated_at: rc.updated_at,
      // Extra fields from v4
      guarantee_type: (rc.guarantee_type || null),
      evaluation_score: rc.evaluation_score || 0,
      evaluation_status: rc.evaluation_status || 'em_analise',
      credit_score: rc.credit_score || null,
      has_restrictions: rc.has_restrictions || false,
      restriction_notes: rc.restriction_notes || null,
      analysis_notes: rc.analysis_notes || null,
      guarantor_name: rc.guarantor_name || null,
      guarantor_cpf: rc.guarantor_cpf || null,
      guarantor_phone: rc.guarantor_phone || null,
      guarantor_monthly_income: rc.guarantor_monthly_income || null,
    };

    const { data: lease, error: insertError } = await supabase
      .from('leases')
      .insert(leaseData)
      .select()
      .single();

    if (insertError) {
      log.error(`Failed to migrate contract ${rc.id}: ${insertError.message}`);
      errors++;
      continue;
    }

    // Track migration
    await supabase
      .from('_rental_contracts_migration')
      .insert({
        rental_contract_id: rc.id,
        lease_id: lease.id,
        organization_id: rc.organization_id,
        status: 'migrated',
      });

    migrated++;
    if (migrated % 10 === 0) process.stdout.write(`${colors.green}.${colors.reset}`);
  }

  console.log('');
  log.success(`Contracts: ${migrated} migrated, ${skipped} skipped, ${errors} errors`);

  // Step 2: Migrate billing -> invoices
  log.info('Step 2: Migrating billing records to invoices...');

  const { data: billingRecords, error: billingError } = await supabase
    .from('billing')
    .select('*')
    .order('created_at', { ascending: true });

  if (billingError) {
    log.warn(`Could not read billing: ${billingError.message}`);
  } else if (billingRecords && billingRecords.length > 0) {
    let bMigrated = 0;
    let bErrors = 0;

    for (const bill of billingRecords) {
      // Get mapped lease
      const { data: mapping } = await supabase
        .from('_rental_contracts_migration')
        .select('lease_id')
        .eq('rental_contract_id', bill.contract_id)
        .single();

      if (!mapping) {
        bErrors++;
        continue;
      }

      const statusMap = {
        aberto: 'pendente',
        pago: 'pago',
        vencido: 'vencido',
        cancelado: 'cancelado',
        protesto: 'protestado',
      };

      const { error: invError } = await supabase
        .from('invoices')
        .insert({
          lease_id: mapping.lease_id,
          organization_id: bill.organization_id,
          invoice_number: bill.nossonumero || null,
          due_date: bill.due_date,
          amount: bill.amount || 0,
          total: bill.amount || 0,
          status: statusMap[bill.status] || 'pendente',
          payment_date: bill.payment_date || null,
          barcode: bill.barcode || null,
          nossonumero: bill.nossonumero || null,
          invoice_url: bill.invoice_url || null,
          created_at: bill.created_at,
        });

      if (invError) {
        bErrors++;
        continue;
      }
      bMigrated++;
    }

    log.success(`Billing: ${bMigrated} migrated, ${bErrors} errors`);
  } else {
    log.warn('No billing records found');
  }

  // Step 3: Migrate payment_history -> lease_history
  log.info('Step 3: Migrating payment_history...');

  const { data: payments, error: payError } = await supabase
    .from('payment_history')
    .select('*')
    .order('created_at', { ascending: true });

  if (payError) {
    log.warn(`Could not read payment_history: ${payError.message}`);
  } else if (payments && payments.length > 0) {
    let pMigrated = 0;
    let pErrors = 0;

    for (const pay of payments) {
      const { data: mapping } = await supabase
        .from('_rental_contracts_migration')
        .select('lease_id')
        .eq('rental_contract_id', pay.contract_id)
        .single();

      if (!mapping) { pErrors++; continue; }

      const { error: histError } = await supabase
        .from('lease_history')
        .insert({
          lease_id: mapping.lease_id,
          organization_id: pay.organization_id,
          action: 'payment',
          description: `Pagamento: ${pay.amount_paid || 0} em ${pay.payment_date || ''}`,
          field_changed: 'payment_status',
          old_value: pay.status,
          new_value: pay.status === 'pago' ? 'em_dia' : pay.status,
          created_at: pay.created_at || pay.payment_date,
        });

      if (histError) { pErrors++; continue; }
      pMigrated++;
    }

    log.success(`Payments: ${pMigrated} migrated, ${pErrors} errors`);
  } else {
    log.warn('No payment_history records found');
  }

  // Step 4: Migrate contract_renewals -> rent_adjustments
  log.info('Step 4: Migrating contract_renewals to rent_adjustments...');

  const { data: renewals, error: renError } = await supabase
    .from('contract_renewals')
    .select('*')
    .order('created_at', { ascending: true });

  if (renError) {
    log.warn(`Could not read contract_renewals: ${renError.message}`);
  } else if (renewals && renewals.length > 0) {
    let rMigrated = 0;
    let rErrors = 0;

    for (const ren of renewals) {
      const { data: mapping } = await supabase
        .from('_rental_contracts_migration')
        .select('lease_id')
        .eq('rental_contract_id', ren.contract_id)
        .single();

      if (!mapping) { rErrors++; continue; }

      const { error: adjError } = await supabase
        .from('rent_adjustments')
        .insert({
          lease_id: mapping.lease_id,
          organization_id: ren.organization_id,
          previous_rent: ren.old_rent || 0,
          new_rent: ren.new_rent || 0,
          adjustment_index: ren.adjustment_index || 'IGPM',
          adjustment_date: ren.created_at?.split('T')[0] || new Date().toISOString().split('T')[0],
          approved: true,
          created_at: ren.created_at,
        });

      if (adjError) { rErrors++; continue; }
      rMigrated++;
    }

    log.success(`Renewals: ${rMigrated} migrated, ${rErrors} errors`);
  } else {
    log.warn('No contract_renewals found');
  }

  // Summary
  console.log(`\n${colors.cyan}\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550${colors.reset}`);
  log.success(`Migration complete!`);
  console.log(`  Contracts migrated: ${migrated}`);
  console.log(`  Contracts skipped (already migrated): ${skipped}`);
  console.log(`  Contract errors: ${errors}`);
  console.log(`\n${colors.yellow}Note: The old rental_contracts table is kept intact.`);
  console.log(`The migration tracking table _rental_contracts_migration maps old IDs to new lease IDs.`);
  console.log(`To verify: npm run check-db${colors.reset}`);
}

migrateRentalContracts().catch((err) => {
  log.error(`Fatal: ${err.message}`);
  process.exit(1);
});
