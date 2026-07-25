import fs from 'fs';

let base = fs.readFileSync('base_schema_from_user_FIXED.sql', 'utf8');
let b2b2b = fs.readFileSync('sql/setup_whitelabel_b2b2b.sql', 'utf8');
let rls = fs.readFileSync('migrations/setup_whitelabel_rls.sql', 'utf8');

let finalSql = `-- ========================================================================
-- IMOBZY - COMPLETE EXECUTABLE DATABASE SCHEMA
-- Generated from base schema provided by user, with FK dependencies fixed.
-- Includes White-label (B2B2B) Multi-tenant logic and RLS policies.
-- ========================================================================

${base}

${b2b2b}

${rls}`;

fs.writeFileSync('FULL_DATABASE_SCHEMA.sql', finalSql);
console.log('Created FULL_DATABASE_SCHEMA.sql successfully!');
