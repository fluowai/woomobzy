import { Router } from 'express';
import { verifyAuth, verifyAdmin } from '../../middleware/auth.js';
import { requireTenant } from '../../middleware/tenant.js';
import { getSupabaseServer } from '../../lib/supabase-server.js';

const router = Router();
const supabase = new Proxy({}, { get: (_, prop) => getSupabaseServer()[prop] });

function mapSite(dbItem) {
  return {
    id: dbItem.id,
    organizationId: dbItem.organization_id,
    name: dbItem.name || 'Meu Site',
    isActive: dbItem.is_active ?? true,
    logoUrl: dbItem.logo_url,
    faviconUrl: dbItem.favicon_url,
    globalTheme: dbItem.global_theme || {},
    globalHeader: dbItem.global_header || [],
    globalFooter: dbItem.global_footer || [],
    menuConfig: dbItem.menu_config || [],
    contactInfo: dbItem.contact_info || {},
    socialLinks: dbItem.social_links || {},
    customCss: dbItem.custom_css,
    customJs: dbItem.custom_js,
    customHead: dbItem.custom_head,
    createdAt: dbItem.created_at,
    updatedAt: dbItem.updated_at,
  };
}

function mapPage(dbItem) {
  return {
    id: dbItem.id,
    siteId: dbItem.site_id,
    title: dbItem.title,
    slug: dbItem.slug,
    sortOrder: dbItem.sort_order || 0,
    blocks: dbItem.blocks || [],
    themeOverrides: dbItem.theme_overrides || {},
    metaTitle: dbItem.meta_title,
    metaDescription: dbItem.meta_description,
    metaKeywords: dbItem.meta_keywords || [],
    ogImage: dbItem.og_image,
    status: dbItem.status || 'draft',
    isHome: dbItem.is_home || false,
    customCss: dbItem.custom_css,
    customJs: dbItem.custom_js,
    createdAt: dbItem.created_at,
    updatedAt: dbItem.updated_at,
  };
}

function generateSlug(name) {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    || 'pagina';
}

// ==========================================
// GET /api/sites — Buscar site da organização
// ==========================================
router.get('/', verifyAuth, requireTenant, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('sites')
      .select('*')
      .eq('organization_id', req.orgId)
      .maybeSingle();

    if (error) throw error;
    res.json({ success: true, site: data ? mapSite(data) : null });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// PUT /api/sites — Atualizar site
// ==========================================
router.put('/', verifyAuth, requireTenant, async (req, res) => {
  try {
    const { data: existing } = await supabase
      .from('sites')
      .select('id')
      .eq('organization_id', req.orgId)
      .maybeSingle();

    if (!existing) {
      return res.status(404).json({ error: 'Site não encontrado. Crie-o primeiro.' });
    }

    const payload = {};
    const fields = [
      ['name', 'name'],
      ['isActive', 'is_active'],
      ['logoUrl', 'logo_url'],
      ['faviconUrl', 'favicon_url'],
      ['globalTheme', 'global_theme'],
      ['globalHeader', 'global_header'],
      ['globalFooter', 'global_footer'],
      ['menuConfig', 'menu_config'],
      ['contactInfo', 'contact_info'],
      ['socialLinks', 'social_links'],
      ['customCss', 'custom_css'],
      ['customJs', 'custom_js'],
      ['customHead', 'custom_head'],
    ];

    for (const [key, dbKey] of fields) {
      if (req.body[key] !== undefined) payload[dbKey] = req.body[key];
    }
    payload.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('sites')
      .update(payload)
      .eq('id', existing.id)
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, site: mapSite(data) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// POST /api/sites/create — Criar site (se não existir)
// ==========================================
router.post('/create', verifyAuth, requireTenant, async (req, res) => {
  try {
    const { data: existing } = await supabase
      .from('sites')
      .select('id')
      .eq('organization_id', req.orgId)
      .maybeSingle();

    if (existing) {
      return res.json({ success: true, siteId: existing.id, alreadyExisted: true });
    }

    const { data: org } = await supabase
      .from('organizations')
      .select('name')
      .eq('id', req.orgId)
      .single();

    const { data, error } = await supabase
      .from('sites')
      .insert({
        organization_id: req.orgId,
        name: `Site - ${org?.name || 'Imobiliária'}`,
      })
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, site: mapSite(data) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// GET /api/sites/pages — Listar páginas do site
// ==========================================
router.get('/pages', verifyAuth, requireTenant, async (req, res) => {
  try {
    const { data: site } = await supabase
      .from('sites')
      .select('id')
      .eq('organization_id', req.orgId)
      .maybeSingle();

    if (!site) {
      return res.json({ success: true, pages: [] });
    }

    const { data, error } = await supabase
      .from('site_pages')
      .select('*')
      .eq('site_id', site.id)
      .order('sort_order', { ascending: true });

    if (error) throw error;
    res.json({ success: true, pages: (data || []).map(mapPage) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// GET /api/sites/pages/:id — Buscar página por ID
// ==========================================
router.get('/pages/:id', verifyAuth, requireTenant, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('site_pages')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error) {
      return res.status(404).json({ error: 'Página não encontrada' });
    }

    const { data: site } = await supabase
      .from('sites')
      .select('organization_id')
      .eq('id', data.site_id)
      .single();

    if (!site || site.organization_id !== req.orgId) {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    res.json({ success: true, page: mapPage(data) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// POST /api/sites/pages — Criar página
// ==========================================
router.post('/pages', verifyAuth, requireTenant, async (req, res) => {
  try {
    const { data: site } = await supabase
      .from('sites')
      .select('id')
      .eq('organization_id', req.orgId)
      .single();

    if (!site) {
      return res.status(404).json({ error: 'Site não encontrado' });
    }

    const { title, blocks, themeOverrides, status } = req.body;
    let slug = req.body.slug || generateSlug(title || 'pagina');

    const { data: existing } = await supabase
      .from('site_pages')
      .select('id')
      .eq('site_id', site.id)
      .eq('slug', slug)
      .maybeSingle();

    if (existing) {
      slug = `${slug}-${Date.now()}`;
    }

    const { data: maxOrder } = await supabase
      .from('site_pages')
      .select('sort_order')
      .eq('site_id', site.id)
      .order('sort_order', { ascending: false })
      .limit(1)
      .maybeSingle();

    const payload = {
      site_id: site.id,
      title: title || 'Nova Página',
      slug,
      blocks: blocks || [],
      theme_overrides: themeOverrides || {},
      status: status || 'draft',
      sort_order: (maxOrder?.sort_order ?? -1) + 1,
    };

    const { data, error } = await supabase
      .from('site_pages')
      .insert(payload)
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, page: mapPage(data) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// PUT /api/sites/pages/:id — Atualizar página
// ==========================================
router.put('/pages/:id', verifyAuth, requireTenant, async (req, res) => {
  try {
    const { data: page } = await supabase
      .from('site_pages')
      .select('site_id')
      .eq('id', req.params.id)
      .single();

    if (!page) {
      return res.status(404).json({ error: 'Página não encontrada' });
    }

    const { data: site } = await supabase
      .from('sites')
      .select('organization_id')
      .eq('id', page.site_id)
      .single();

    if (!site || site.organization_id !== req.orgId) {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    const payload = {};
    const pageFields = [
      ['title', 'title'],
      ['slug', 'slug'],
      ['blocks', 'blocks'],
      ['themeOverrides', 'theme_overrides'],
      ['metaTitle', 'meta_title'],
      ['metaDescription', 'meta_description'],
      ['metaKeywords', 'meta_keywords'],
      ['ogImage', 'og_image'],
      ['status', 'status'],
      ['isHome', 'is_home'],
      ['customCss', 'custom_css'],
      ['customJs', 'custom_js'],
      ['sortOrder', 'sort_order'],
    ];

    for (const [key, dbKey] of pageFields) {
      if (req.body[key] !== undefined) payload[dbKey] = req.body[key];
    }
    payload.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('site_pages')
      .update(payload)
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, page: mapPage(data) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// DELETE /api/sites/pages/:id — Excluir página
// ==========================================
router.delete('/pages/:id', verifyAuth, requireTenant, async (req, res) => {
  try {
    const { data: page } = await supabase
      .from('site_pages')
      .select('site_id')
      .eq('id', req.params.id)
      .single();

    if (!page) {
      return res.status(404).json({ error: 'Página não encontrada' });
    }

    const { data: site } = await supabase
      .from('sites')
      .select('organization_id')
      .eq('id', page.site_id)
      .single();

    if (!site || site.organization_id !== req.orgId) {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    const { error } = await supabase
      .from('site_pages')
      .delete()
      .eq('id', req.params.id);

    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// POST /api/sites/pages/reorder — Reordenar páginas
// ==========================================
router.post('/pages/reorder', verifyAuth, requireTenant, async (req, res) => {
  try {
    const { pageIds } = req.body;
    if (!Array.isArray(pageIds)) {
      return res.status(400).json({ error: 'pageIds deve ser um array' });
    }

    const updates = pageIds.map((id, index) => ({
      id,
      sort_order: index,
      updated_at: new Date().toISOString(),
    }));

    const { error } = await supabase
      .from('site_pages')
      .upsert(updates, { onConflict: 'id' });

    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// POST /api/sites/pages/:id/publish — Publicar/Despublicar
// ==========================================
router.post('/pages/:id/publish', verifyAuth, requireTenant, async (req, res) => {
  try {
    const { publish } = req.body;
    const newStatus = publish ? 'published' : 'draft';

    const { data, error } = await supabase
      .from('site_pages')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, page: mapPage(data) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// POST /api/sites/pages/:id/duplicate — Duplicar página
// ==========================================
router.post('/pages/:id/duplicate', verifyAuth, requireTenant, async (req, res) => {
  try {
    const { data: original } = await supabase
      .from('site_pages')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (!original) {
      return res.status(404).json({ error: 'Página não encontrada' });
    }

    const slug = `${original.slug}-copy-${Date.now()}`;
    const { data, error } = await supabase
      .from('site_pages')
      .insert({
        site_id: original.site_id,
        title: `${original.title} (Cópia)`,
        slug,
        blocks: original.blocks,
        theme_overrides: original.theme_overrides,
        status: 'draft',
        sort_order: original.sort_order + 1,
      })
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, page: mapPage(data) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// GET /api/sites/public/:orgSlug — Site público (para renderização)
// ==========================================
router.get('/public/:orgSlug', async (req, res) => {
  try {
    const { orgSlug } = req.params;

    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('id, name, slug, logo_url, custom_domain')
      .eq('slug', orgSlug)
      .maybeSingle();

    if (orgError || !org) {
      return res.status(404).json({ error: 'Organização não encontrada' });
    }

    const { data: site } = await supabase
      .from('sites')
      .select('*')
      .eq('organization_id', org.id)
      .maybeSingle();

    if (!site) {
      return res.json({ success: true, site: null, pages: [] });
    }

    const { data: pages } = await supabase
      .from('site_pages')
      .select('*')
      .eq('site_id', site.id)
      .eq('status', 'published')
      .order('sort_order', { ascending: true });

    res.json({
      success: true,
      organization: org,
      site: mapSite(site),
      pages: (pages || []).map(mapPage),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// GET /api/sites/public-page/:orgSlug/:pageSlug — Página pública específica
// ==========================================
router.get('/public-page/:orgSlug/:pageSlug', async (req, res) => {
  try {
    const { orgSlug, pageSlug } = req.params;

    const { data: org } = await supabase
      .from('organizations')
      .select('id')
      .eq('slug', orgSlug)
      .maybeSingle();

    if (!org) {
      return res.status(404).json({ error: 'Organização não encontrada' });
    }

    const { data: site } = await supabase
      .from('sites')
      .select('id')
      .eq('organization_id', org.id)
      .maybeSingle();

    if (!site) {
      return res.status(404).json({ error: 'Site não encontrado' });
    }

    const { data: page } = await supabase
      .from('site_pages')
      .select('*')
      .eq('site_id', site.id)
      .eq('slug', pageSlug)
      .eq('status', 'published')
      .maybeSingle();

    if (!page) {
      return res.status(404).json({ error: 'Página não encontrada' });
    }

    res.json({ success: true, page: mapPage(page) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
