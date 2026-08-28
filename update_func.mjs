import pg from 'pg';
import dotenv from 'dotenv';
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
dotenv.config();

const client = new pg.Client({
    connectionString: process.env.SUPABASE_DB_URL,
    ssl: { rejectUnauthorized: false }
});

async function run() {
    await client.connect();
    
    const sql = `
CREATE OR REPLACE FUNCTION public.search_properties_for_lead(tipo text DEFAULT NULL::text, bairro text DEFAULT NULL::text, cidade text DEFAULT NULL::text, quartos integer DEFAULT NULL::integer, finalidade text DEFAULT NULL::text, orcamento_maximo numeric DEFAULT NULL::numeric, organization_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_org uuid;
  v_rows jsonb;
BEGIN
  v_org := COALESCE(organization_id, get_my_org_id());

  SELECT COALESCE(jsonb_agg(x), '[]'::jsonb) INTO v_rows
  FROM (
    SELECT jsonb_build_object(
      'id', p.id,
      'city', p.city,
      'price', p.price,
      'title', p.title,
      'property_type', p.property_type
    ) AS x
    FROM properties p
    WHERE (v_org IS NULL OR p.organization_id = v_org)
      AND (tipo IS NULL OR p.property_type ILIKE '%' || tipo || '%')
      AND (bairro IS NULL OR p.neighborhood ILIKE '%' || bairro || '%' OR p.city ILIKE '%' || bairro || '%')
      AND (cidade IS NULL OR (p.city ILIKE '%' || cidade || '%' OR p.neighborhood ILIKE '%' || cidade || '%' OR p.location_city ILIKE '%' || cidade || '%'))
      AND (
          finalidade IS NULL 
          OR p.purpose ILIKE '%' || finalidade || '%'
          OR (finalidade ILIKE '%locacao%' AND p.purpose ILIKE '%Locação%')
          OR (finalidade ILIKE '%venda%' AND p.purpose ILIKE '%Venda%')
      )
      AND (orcamento_maximo IS NULL OR p.price <= orcamento_maximo)
    ORDER BY p.created_at DESC
    LIMIT 10
  ) s;

  RETURN jsonb_build_object('results', v_rows);
END;
$function$
    `;
    
    await client.query(sql);
    console.log('Function updated successfully');
    await client.end();
}
run();
