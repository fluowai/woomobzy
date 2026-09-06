import { v4 as uuidv4 } from 'uuid';

/**
 * Emite uma licença para uma organização.
 * Se isTrial for true, a licença dura 7 dias e fica com status TRIAL.
 * Caso contrário, dura 1 ano e fica com status ACTIVE.
 */
export async function issueLicense(db, organizationId, plan, isTrial = false) {
  // Pegar o primeiro produto ativo como padrão
  const { data: products } = await db
    .from('woo_products')
    .select('id')
    .eq('status', 'ACTIVE')
    .order('created_at', { ascending: true })
    .limit(1);
    
  let productId = null;
  if (products && products.length > 0) {
    productId = products[0].id;
  } else {
    // Tenta pegar qualquer um se não houver ativos
    const { data: anyProds } = await db.from('woo_products').select('id').limit(1);
    if (anyProds && anyProds.length > 0) productId = anyProds[0].id;
  }

  const licenseId = uuidv4().toUpperCase();
  const now = new Date();
  
  let expiresAt = new Date();
  let status = isTrial ? 'TRIAL' : 'ACTIVE';
  
  if (isTrial) {
    expiresAt.setDate(now.getDate() + 7);
  } else {
    expiresAt.setFullYear(now.getFullYear() + 1);
  }

  const { data, error } = await db.from('woo_licenses').insert({
    organization_id: organizationId,
    product_id: productId, // Pode ser null se não houver produtos cadastrados, o banco pode aceitar dependendo da constraint
    plan: plan || 'Básico',
    license_id: licenseId,
    status,
    expires_at: expiresAt.toISOString(),
    allowed_domains: [],
    max_instances: 1,
    features: {}
  }).select().single();

  if (error) throw error;
  return data;
}
