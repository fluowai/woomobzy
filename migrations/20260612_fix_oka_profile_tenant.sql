-- Ensure OKA owner/admin profiles are linked to the OKA organization.
-- This keeps tenant-scoped routes such as /api/quiz/campaigns available
-- for both historical OKA login emails.

update public.profiles
set
  organization_id = '0e2dc1dc-825c-4eb1-8e2e-dc70a257eca3',
  role = 'admin',
  updated_at = now()
where lower(email) in ('contato@oka.com.br', 'contato@okaimoveis.com.br');
