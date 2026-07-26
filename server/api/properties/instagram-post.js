import { Router } from 'express';
import sharp from 'sharp';
import { verifyAuth } from '../../middleware/auth.js';
import { requireTenant } from '../../middleware/tenant.js';
import { getSupabaseServer } from '../../lib/supabase-server.js';

const router = Router();

const supabase = new Proxy(
  {},
  {
    get: (_, prop) => {
      const client = getSupabaseServer();
      const value = client[prop];
      return typeof value === 'function' ? value.bind(client) : value;
    },
  }
);

function formatPrice(price) {
  if (!price) return '';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  }).format(price);
}

function escapeXml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function getTemplateSVG(template, property, settings, w, h) {
  const title = escapeXml(property.title || 'Imóvel');
  const price = formatPrice(property.price);
  const city = escapeXml(property.location?.city || property.city || '');
  const state = escapeXml(property.location?.state || property.state || '');
  const locationStr = city && state ? `${city} - ${state}` : city || state;
  const purpose = escapeXml(property.purpose || 'Venda');
  const propertyType = escapeXml(property.property_type || property.type || '');
  const primaryColor = settings?.primary_color || '#2563eb';
  const secondaryColor = settings?.secondary_color || '#1e40af';
  const agencyName = escapeXml(settings?.agency_name || '');

  const features = property.features || {};
  const badges = [];

  if (propertyType) badges.push(propertyType);
  if (purpose) badges.push(purpose);

  if (features.dormitorios) {
    badges.push(`${features.dormitorios} ${features.dormitorios === 1 ? 'quarto' : 'quartos'}`);
  }
  if (features.banheiros) {
    badges.push(`${features.banheiros} ${features.banheiros === 1 ? 'banheiro' : 'banheiros'}`);
  }
  if (features.vagas) {
    badges.push(`${features.vagas} ${features.vagas === 1 ? 'vaga' : 'vagas'}`);
  }

  const area =
    features.areaHectares ||
    features.areaM2 ||
    features.areaConstruida ||
    property.total_area_ha ||
    null;
  if (area) {
    const unit = features.preferredUnit === 'ha' || features.areaHectares ? 'ha' : 'm²';
    const formatted = Number(area).toLocaleString('pt-BR');
    badges.push(`${formatted} ${unit}`);
  }

  const badgesSvg = badges
    .slice(0, 5)
    .map((b, i) => {
      const x = 40 + i * 160;
      return `<rect x="${x}" y="${h - 140}" width="140" height="36" rx="18" fill="rgba(255,255,255,0.15)" />
        <text x="${x + 70}" y="${h - 116}" text-anchor="middle" fill="white" font-size="14" font-family="Arial, sans-serif" font-weight="500">${escapeXml(b)}</text>`;
    })
    .join('\n    ');

  const logoSvg = settings?.logo_url
    ? `<image href="${escapeXml(settings.logo_url)}" x="40" y="40" width="140" height="50" preserveAspectRatio="xMidYMid meet" />`
    : `<text x="40" y="72" fill="white" font-size="20" font-family="Arial, sans-serif" font-weight="700">${agencyName || 'IMOBZY'}</text>`;

  if (template === 'luxo') {
    return `
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="rgba(0,0,0,0)" />
          <stop offset="60%" stop-color="rgba(0,0,0,0.3)" />
          <stop offset="100%" stop-color="rgba(0,0,0,0.85)" />
        </linearGradient>
        <linearGradient id="accent" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stop-color="#c9a84c" />
          <stop offset="50%" stop-color="#f0d78c" />
          <stop offset="100%" stop-color="#c9a84c" />
        </linearGradient>
      </defs>
      <rect width="${w}" height="${h}" fill="url(#bg)" />
      <rect x="20" y="20" width="${w - 40}" height="${h - 40}" rx="8" fill="none" stroke="url(#accent)" stroke-width="1.5" opacity="0.6" />
      ${logoSvg}
      <text x="${w / 2}" y="${h - 200}" text-anchor="middle" fill="url(#accent)" font-size="14" font-family="Georgia, serif" letter-spacing="6" font-weight="400">EXCLUSIVO</text>
      <text x="${w / 2}" y="${h - 165}" text-anchor="middle" fill="white" font-size="36" font-family="Georgia, serif" font-weight="700">${price}</text>
      <text x="${w / 2}" y="${h - 120}" text-anchor="middle" fill="white" font-size="20" font-family="Georgia, serif" opacity="0.9">${title}</text>
      <text x="${w / 2}" y="${h - 88}" text-anchor="middle" fill="rgba(255,255,255,0.7)" font-size="15" font-family="Arial, sans-serif">${locationStr}</text>
      <line x1="${w / 2 - 40}" y1="${h - 70}" x2="${w / 2 + 40}" y2="${h - 70}" stroke="url(#accent)" stroke-width="1" />
      ${badgesSvg}`;
  }

  if (template === 'rural') {
    return `
      <defs>
        <linearGradient id="bg" x1="0" y1="0.5" x2="1" y2="0.5">
          <stop offset="0%" stop-color="rgba(0,0,0,0)" />
          <stop offset="70%" stop-color="rgba(0,0,0,0.15)" />
          <stop offset="100%" stop-color="rgba(6,78,59,0.92)" />
        </linearGradient>
      </defs>
      <rect width="${w}" height="${h}" fill="url(#bg)" />
      ${logoSvg}
      <rect x="${w - 380}" y="40" width="340" height="${h - 80}" rx="12" fill="rgba(6,78,59,0.85)" />
      <text x="${w - 210}" y="100" text-anchor="middle" fill="white" font-size="14" font-family="Arial, sans-serif" font-weight="700" letter-spacing="4">ÁREA TOTAL</text>
      <text x="${w - 210}" y="160" text-anchor="middle" fill="#86efac" font-size="40" font-family="Arial, sans-serif" font-weight="800">${area ? `${Number(area).toLocaleString('pt-BR')}` : '—'}</text>
      <text x="${w - 210}" y="185" text-anchor="middle" fill="rgba(255,255,255,0.7)" font-size="16" font-family="Arial, sans-serif">${features.preferredUnit === 'ha' || features.areaHectares ? 'hectares' : 'm²'}</text>
      <line x1="${w - 340}" y1="210" x2="${w - 80}" y2="210" stroke="rgba(255,255,255,0.2)" stroke-width="1" />
      <text x="${w - 210}" y="250" text-anchor="middle" fill="white" font-size="28" font-family="Arial, sans-serif" font-weight="700">${price}</text>
      <text x="${w - 210}" y="290" text-anchor="middle" fill="rgba(255,255,255,0.8)" font-size="16" font-family="Arial, sans-serif">${title}</text>
      <text x="${w - 210}" y="320" text-anchor="middle" fill="#86efac" font-size="14" font-family="Arial, sans-serif">${locationStr}</text>
      <rect x="${w - 350}" y="${h - 120}" width="300" height="44" rx="22" fill="white" />
      <text x="${w - 200}" y="${h - 92}" text-anchor="middle" fill="#064e3b" font-size="15" font-family="Arial, sans-serif" font-weight="700">Saiba mais</text>`;
  }

  if (template === 'moderno') {
    return `
      <defs>
        <linearGradient id="bg" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stop-color="rgba(0,0,0,0.7)" />
          <stop offset="40%" stop-color="rgba(0,0,0,0.1)" />
          <stop offset="100%" stop-color="rgba(0,0,0,0)" />
        </linearGradient>
      </defs>
      <rect width="${w}" height="${h}" fill="url(#bg)" />
      ${logoSvg}
      <rect x="0" y="${h - 280}" width="${w}" height="280" fill="${primaryColor}" opacity="0.95" />
      <rect x="40" y="${h - 260}" width="6" height="60" rx="3" fill="white" />
      <text x="60" y="${h - 215}" fill="white" font-size="32" font-family="Arial, sans-serif" font-weight="800">${price}</text>
      <text x="60" y="${h - 178}" fill="rgba(255,255,255,0.9)" font-size="18" font-family="Arial, sans-serif" font-weight="600">${title}</text>
      <text x="60" y="${h - 150}" fill="rgba(255,255,255,0.7)" font-size="14" font-family="Arial, sans-serif">📍 ${locationStr}</text>
      <line x1="60" y1="${h - 130}" x2="${w - 40}" y2="${h - 130}" stroke="rgba(255,255,255,0.2)" stroke-width="1" />
      <text x="60" y="${h - 100}" fill="rgba(255,255,255,0.6)" font-size="13" font-family="Arial, sans-serif" letter-spacing="2">${badges.map(escapeXml).join('  •  ')}</text>
      <rect x="${w - 160}" y="${h - 60}" width="120" height="40" rx="20" fill="white" />
      <text x="${w - 100}" y="${h - 34}" text-anchor="middle" fill="${primaryColor}" font-size="14" font-family="Arial, sans-serif" font-weight="700">Ver mais</text>`;
  }

  return `
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="rgba(0,0,0,0)" />
        <stop offset="50%" stop-color="rgba(0,0,0,0.15)" />
        <stop offset="100%" stop-color="rgba(0,0,0,0.8)" />
      </linearGradient>
    </defs>
    <rect width="${w}" height="${h}" fill="url(#bg)" />
    ${logoSvg}
    <text x="40" y="${h - 160}" fill="white" font-size="32" font-family="Arial, sans-serif" font-weight="800">${price}</text>
    <text x="40" y="${h - 120}" fill="rgba(255,255,255,0.95)" font-size="22" font-family="Arial, sans-serif" font-weight="600">${title}</text>
    <text x="40" y="${h - 90}" fill="rgba(255,255,255,0.7)" font-size="15" font-family="Arial, sans-serif">📍 ${locationStr}</text>
    ${badgesSvg}`;
}

async function fetchImageBuffer(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch image: ${res.status}`);
  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

const MEDIA_POSTS_BUCKET = 'media-posts';

async function composeInstagramImage(property, settings, template, format, imageIndex) {
  const images = property.images || [];
  const imageUrl = images[Math.min(imageIndex, images.length - 1)];
  const [w, h] = format === '1080x1350' ? [1080, 1350] : [1080, 1080];

  const photoBuffer = await fetchImageBuffer(imageUrl);

  const resizedPhoto = await sharp(photoBuffer)
    .resize(w, h, { fit: 'cover', position: 'centre' })
    .toBuffer();

  const svgOverlay = getTemplateSVG(template, property, settings, w, h);

  const finalImage = await sharp(resizedPhoto)
    .composite([{ input: Buffer.from(svgOverlay), top: 0, left: 0 }])
    .png({ quality: 95 })
    .toBuffer();

  return { finalImage, w, h };
}

router.post(
  '/:id/instagram-post',
  verifyAuth,
  requireTenant,
  async (req, res) => {
    try {
      const { id } = req.params;
      const { template = 'padrao', format = '1080x1080', imageIndex = 0, save = false } = req.body;

      const { data: property, error: propError } = await supabase
        .from('properties')
        .select('*')
        .eq('id', id)
        .eq('organization_id', req.orgId)
        .single();

      if (propError || !property) {
        return res.status(404).json({ error: 'Imóvel não encontrado' });
      }

      const images = property.images || [];
      if (images.length === 0) {
        return res.status(400).json({ error: 'Imóvel não possui imagens' });
      }

      const { data: settings } = await supabase
        .from('site_settings')
        .select('logo_url, agency_name, primary_color, secondary_color')
        .eq('organization_id', req.orgId)
        .maybeSingle();

      const { finalImage } = await composeInstagramImage(property, settings, template, format, imageIndex);

      if (!save) {
        res.setHeader('Content-Type', 'image/png');
        res.setHeader('Content-Length', finalImage.length);
        res.setHeader(
          'Content-Disposition',
          `inline; filename="instagram-${property.title?.replace(/\s+/g, '-').toLowerCase() || 'post'}.png"`
        );
        return res.send(finalImage);
      }

      const slug = (property.title || 'post').replace(/[^a-zA-Z0-9\u00C0-\u00FF]+/g, '-').toLowerCase().slice(0, 60);
      const storagePath = `${req.orgId}/${id}/${slug}-${template}-${format}-${Date.now()}.png`;

      const { error: uploadError } = await supabase.storage
        .from(MEDIA_POSTS_BUCKET)
        .upload(storagePath, finalImage, { contentType: 'image/png', upsert: false });

      if (uploadError) {
        console.error('[InstagramPost] Upload error:', uploadError.message);
        return res.status(500).json({ error: 'Erro ao salvar imagem no storage' });
      }

      const { data: urlData } = supabase.storage
        .from(MEDIA_POSTS_BUCKET)
        .getPublicUrl(storagePath);

      const { data: mediaPost, error: dbError } = await supabase
        .from('media_posts')
        .insert({
          company_id: req.orgId,
          property_id: id,
          template,
          format,
          image_index: imageIndex,
          storage_path: storagePath,
          public_url: urlData.publicUrl,
          file_size_bytes: finalImage.length,
          status: 'draft',
        })
        .select()
        .single();

      if (dbError) {
        console.error('[InstagramPost] DB insert error:', dbError.message);
        return res.status(500).json({ error: 'Erro ao registrar post' });
      }

      res.status(201).json({
        success: true,
        mediaPost,
        url: urlData.publicUrl,
      });
    } catch (err) {
      console.error('[InstagramPost] Error:', err.message);
      res.status(500).json({ error: 'Erro ao gerar arte' });
    }
  }
);

router.get(
  '/:id/instagram-post/preview',
  verifyAuth,
  requireTenant,
  async (req, res) => {
    try {
      const { id } = req.params;
      const template = req.query.template || 'padrao';
      const format = req.query.format || '1080x1080';
      const imageIndex = Number(req.query.imageIndex) || 0;

      const { data: property, error: propError } = await supabase
        .from('properties')
        .select('id, title, price, property_type, purpose, city, state, neighborhood, features, images, total_area_ha, organization_id')
        .eq('id', id)
        .eq('organization_id', req.orgId)
        .single();

      if (propError || !property) {
        return res.status(404).json({ error: 'Imóvel não encontrado' });
      }

      const images = property.images || [];
      if (images.length === 0) {
        return res.status(400).json({ error: 'Imóvel não possui imagens' });
      }

      const { data: settings } = await supabase
        .from('site_settings')
        .select('logo_url, agency_name, primary_color, secondary_color')
        .eq('organization_id', req.orgId)
        .maybeSingle();

      const [w, h] = format === '1080x1350' ? [1080, 1350] : [1080, 1080];
      const imageUrl = images[Math.min(imageIndex, images.length - 1)];

      const svgOverlay = getTemplateSVG(template, property, settings, w, h);

      const placeholder = await sharp({
        create: { width: w, height: h, channels: 4, background: { r: 30, g: 30, b: 30, alpha: 1 } },
      })
        .composite([{ input: Buffer.from(svgOverlay), top: 0, left: 0 }])
        .png()
        .toBuffer();

      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Cache-Control', 'no-cache');
      res.send(placeholder);
    } catch (err) {
      console.error('[InstagramPost Preview] Error:', err.message);
      res.status(500).json({ error: 'Erro ao gerar preview' });
    }
  }
);

router.get(
  '/:id/instagram-post/list',
  verifyAuth,
  requireTenant,
  async (req, res) => {
    try {
      const { id } = req.params;
      const { page = 1, limit = 20 } = req.query;
      const offset = (page - 1) * limit;

      const { data, error, count } = await supabase
        .from('media_posts')
        .select('*', { count: 'exact' })
        .eq('property_id', id)
        .eq('company_id', req.orgId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;

      res.json({
        success: true,
        posts: data || [],
        pagination: {
          total: count,
          page: Number(page),
          limit: Number(limit),
        },
      });
    } catch (err) {
      console.error('[InstagramPost List] Error:', err.message);
      res.status(500).json({ error: 'Erro ao listar posts salvos' });
    }
  }
);

router.delete(
  '/:id/instagram-post/:postId',
  verifyAuth,
  requireTenant,
  async (req, res) => {
    try {
      const { postId } = req.params;

      const { data: post, error: fetchError } = await supabase
        .from('media_posts')
        .select('storage_path')
        .eq('id', postId)
        .eq('company_id', req.orgId)
        .single();

      if (fetchError || !post) {
        return res.status(404).json({ error: 'Post não encontrado' });
      }

      await supabase.storage.from(MEDIA_POSTS_BUCKET).remove([post.storage_path]);

      const { error: dbError } = await supabase
        .from('media_posts')
        .delete()
        .eq('id', postId)
        .eq('company_id', req.orgId);

      if (dbError) throw dbError;

      res.json({ success: true, message: 'Post excluído' });
    } catch (err) {
      console.error('[InstagramPost Delete] Error:', err.message);
      res.status(500).json({ error: 'Erro ao excluir post' });
    }
  }
);

export default router;
