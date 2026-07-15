# RBAC Migration Plan (Phase 2)

This document is the follow-up plan after migration
`20260715_user_roles_and_impersonation_audit.sql`. The migration is
**additive**: it does not change `profiles.role` or `server/middleware/auth.js`
behavior. Application code can be migrated in later PRs.

## Why

Two structural risks in the current authn/authz layer:

### 1. Role stored on `public.profiles.role`

`profiles.role` is the single source of truth in `auth.js`
(`resolveProfileForUser`, `verifyAuth`) and `tenant.js`. Any code path that
lets a user update their own profile (directly or via a Data API policy
that permits `UPDATE ON profiles WHERE id = auth.uid()`) can escalate to
`admin` or `superadmin`. This is a well-known Supabase footgun.

**Canonical fix:** keep roles in `public.user_roles` (separate table,
enum-typed), checked through `public.has_role()` (SECURITY DEFINER,
`SET search_path = public`). The Data API cannot mutate `user_roles`
because there is no `INSERT/UPDATE/DELETE` policy — writes only happen
through `service_role` in server code.

### 2. Hardcoded break-glass by email

`server/middleware/auth.js` contains:

```js
if (effectiveProfileEmail === 'fluowai@gmail.com') {
  profile.role = 'superadmin';
  profile.organization_id = null;
}
```

This is a static backdoor. Anyone who ever provisions a `profiles` row
(or updates one) with that email inherits `superadmin`. Even without
malicious intent, an ops mistake here is a total-compromise event.

**Replacement:** read superadmin from `user_roles`. If a genuine
break-glass is required, put it behind an env var
(`SUPERADMIN_BREAK_GLASS_USER_ID`, comparing UUIDs not emails) and log
every use to `impersonation_audit_log`.

## Migration phases

Each phase ships as its own PR so we can roll back cleanly.

### Phase 2.a (this PR) — Provision

- `user_roles` table + `app_role` enum
- `has_role(_user_id, _role)` + `current_user_has_role(_role)`
- Backfill from `profiles.role`
- `impersonation_audit_log` table + RLS
- No server-code changes

After merge, both sources exist. `profiles.role` remains the truth
until 2.b lands.

### Phase 2.b — Read from `user_roles` in server code

Update `server/middleware/auth.js`:

- `resolveProfileForUser` still returns the profile row for organization
  binding, but role comes from `user_roles` via `has_role()` RPC or a
  `SELECT role FROM user_roles WHERE user_id = $1`.
- Break-glass block: replace hardcoded email with
  `process.env.SUPERADMIN_BREAK_GLASS_USER_ID` UUID compare, and only
  activate when `user_roles` is empty for that user (recovery mode).
- Every superadmin impersonation attempt (`x-impersonate-org-id`,
  `x-organization-id` used cross-tenant) writes to
  `impersonation_audit_log` before the request proceeds.

Regression risk: role reads change source. Cover with tests in
`server/__tests__/` that assert `verifyAuth` returns the same role for a
user whose `profiles.role` and `user_roles.role` match, and DIFFERENT
role when only `user_roles` says superadmin.

### Phase 2.c — Sync trigger

Trigger `AFTER UPDATE ON profiles` that, whenever `profiles.role` changes,
also writes the new value to `user_roles` (or logs a warning). Keeps
legacy code paths that still update `profiles.role` from silently
diverging while the migration is in flight.

### Phase 2.d — Remove `profiles.role`

Once all reads go through `user_roles` and monitoring shows no
`profiles.role`-based decisions:

- `ALTER TABLE profiles DROP COLUMN role;`
- Drop the sync trigger.
- Delete the email-based break-glass code entirely.

## RLS pattern to adopt going forward

For any policy that currently reads `profiles.role`, prefer
`public.has_role(auth.uid(), 'admin')`. Never write:

```sql
-- WRONG — recursive if the policy is on profiles itself
CREATE POLICY ... USING (
  (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
);
```

Use the SECURITY DEFINER function instead:

```sql
CREATE POLICY ... USING (public.has_role(auth.uid(), 'admin'));
```

## Rollback for Phase 2.a

```sql
BEGIN;
DROP TABLE IF EXISTS public.impersonation_audit_log;
DROP FUNCTION IF EXISTS public.current_user_has_role(public.app_role);
DROP FUNCTION IF EXISTS public.has_role(uuid, public.app_role);
DROP TABLE IF EXISTS public.user_roles;
DROP TYPE  IF EXISTS public.app_role;
COMMIT;
```

Safe because Phase 2.a does not touch application code.
