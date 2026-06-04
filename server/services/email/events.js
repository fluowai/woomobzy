import { getSupabaseServer } from '../../lib/supabase-server.js';

export async function emitEmailEvent({
  organizationId,
  userId = null,
  accountId,
  emailId,
  eventType,
  payload = {},
}) {
  const supabase = getSupabaseServer();
  const { error } = await supabase.from('email_events').insert({
    organization_id: organizationId,
    user_id: userId,
    account_id: accountId,
    email_id: emailId,
    event_type: eventType,
    payload,
  });

  if (error) {
    console.warn('[EmailEvents] Falha ao registrar evento:', error.message);
  }
}
