/**
 * Inspection Routes - Vistorias
 * /api/locacao/inspections
 */
import { Router } from 'express';
import { z } from 'zod';
import { getSupabaseServer } from '../../lib/supabase-server.js';
import { verifyAuth } from '../../middleware/auth.js';
import { requireTenant } from '../../middleware/tenant.js';
import { isValidUUID } from '../../lib/shared-utils.js';
import multer from 'multer';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    cb(null, allowed.includes(file.mimetype));
  },
});

const inspectionSchema = z.object({
  lease_id: z.string().uuid(),
  inspection_type: z.enum(['entrada', 'saida', 'periodica']),
  inspection_date: z.string(),
  inspector_name: z.string().optional(),
  tenant_present: z.boolean().optional(),
  owner_present: z.boolean().optional(),
  items: z
    .array(
      z.object({
        room: z.string(),
        item: z.string(),
        condition: z.enum(['otimo', 'bom', 'regular', 'ruim', 'inexistente']),
        observation: z.string().optional(),
        photo_urls: z.array(z.string()).optional(),
      })
    )
    .optional(),
  meter_readings: z
    .object({
      water_meter: z.string().optional(),
      energy_meter: z.string().optional(),
      gas_meter: z.string().optional(),
    })
    .optional(),
  notes: z.string().optional(),
});

/**
 * GET /api/locacao/inspections/:lease_id
 */
router.get('/:lease_id', verifyAuth, requireTenant, async (req, res) => {
  try {
    const { lease_id } = req.params;
    if (!isValidUUID(lease_id))
      return res.status(400).json({ error: 'ID inválido' });

    const supabase = getSupabaseServer();
    const { data, error } = await supabase
      .from('inspections')
      .select('*')
      .eq('lease_id', lease_id)
      .eq('organization_id', req.orgId)
      .order('inspection_date', { ascending: false });

    if (error) throw error;

    res.json({ success: true, data: data || [] });
  } catch (error) {
    console.error('[InspectionRoutes] List error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/locacao/inspections
 */
router.post('/', verifyAuth, requireTenant, async (req, res) => {
  try {
    const validation = inspectionSchema.safeParse(req.body);
    if (!validation.success) {
      return res
        .status(400)
        .json({ error: 'Dados inválidos', details: validation.error.issues });
    }

    const supabase = getSupabaseServer();
    const { data, error } = await supabase
      .from('inspections')
      .insert({
        organization_id: req.orgId,
        ...validation.data,
      })
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({ success: true, data });
  } catch (error) {
    console.error('[InspectionRoutes] Create error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/locacao/inspections/:id
 */
router.put('/:id', verifyAuth, requireTenant, async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidUUID(id)) return res.status(400).json({ error: 'ID inválido' });

    const validation = inspectionSchema.partial().safeParse(req.body);
    if (!validation.success) {
      return res
        .status(400)
        .json({ error: 'Dados inválidos', details: validation.error.issues });
    }

    const supabase = getSupabaseServer();
    const { data, error } = await supabase
      .from('inspections')
      .update(validation.data)
      .eq('id', id)
      .eq('organization_id', req.orgId)
      .select()
      .single();

    if (error) throw error;
    if (!data)
      return res.status(404).json({ error: 'Vistoria não encontrada' });

    res.json({ success: true, data });
  } catch (error) {
    console.error('[InspectionRoutes] Update error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/locacao/inspections/:id/photos
 * Upload photos for an inspection item. Accepts multiple files.
 */
router.post(
  '/:id/photos',
  verifyAuth,
  requireTenant,
  upload.array('photos', 20),
  async (req, res) => {
    try {
      const { id } = req.params;
      if (!isValidUUID(id))
        return res.status(400).json({ error: 'ID inválido' });

      if (!req.files?.length) {
        return res.status(400).json({ error: 'Nenhuma foto enviada' });
      }

      const supabase = getSupabaseServer();
      const { data: inspection, error: findError } = await supabase
        .from('inspections')
        .select('id, organization_id, items')
        .eq('id', id)
        .eq('organization_id', req.orgId)
        .single();

      if (findError || !inspection) {
        return res.status(404).json({ error: 'Vistoria não encontrada' });
      }

      const room = req.body.room || 'Geral';
      const item = req.body.item || 'Foto';
      const photoUrls = [];

      for (const file of req.files) {
        const fileName = `inspections/${req.orgId}/${id}/${room}_${item}_${Date.now()}_${file.originalname}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('property-images')
          .upload(fileName, file.buffer, { contentType: file.mimetype });

        if (uploadError) {
          console.warn('[InspectionPhotos] Upload error:', uploadError.message);
          continue;
        }

        const { data: urlData } = supabase.storage
          .from('property-images')
          .getPublicUrl(uploadData.path);

        photoUrls.push(urlData.publicUrl);
      }

      // Update items with new photos
      const items = Array.isArray(inspection.items)
        ? [...inspection.items]
        : [];
      const existingItemIndex = items.findIndex(
        (i) => i.room === room && i.item === item
      );

      if (existingItemIndex >= 0) {
        items[existingItemIndex].photo_urls = [
          ...(items[existingItemIndex].photo_urls || []),
          ...photoUrls,
        ];
      } else {
        items.push({
          room,
          item,
          condition: 'bom',
          photo_urls: photoUrls,
          observation: req.body.observation || '',
        });
      }

      const { error: updateError } = await supabase
        .from('inspections')
        .update({ items })
        .eq('id', id)
        .eq('organization_id', req.orgId);

      if (updateError) throw updateError;

      res.json({
        success: true,
        photos_uploaded: photoUrls.length,
        photo_urls: photoUrls,
      });
    } catch (error) {
      console.error('[InspectionRoutes] Photo upload error:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

export default router;
