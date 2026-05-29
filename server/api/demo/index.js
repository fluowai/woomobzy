import express from 'express';
import { getSupabaseServer } from '../../lib/supabase-server.js';
import { verifySuperAdmin } from '../../middleware/auth.js';

const router = express.Router();

const REQUIRED_SCORE = 4;

function calculateScore(data = {}) {
  let score = 0;
  if (['6-15', '16-40', '40+'].includes(data.team_size)) score += 2;
  if (['51-150', '150+'].includes(data.monthly_leads)) score += 2;
  if (['organizar_atendimento', 'aumentar_vendas', 'automatizar_processos'].includes(data.main_goal)) score += 2;
  if (['agora', '30_dias'].includes(data.urgency)) score += 1;
  return score;
}

function normalizeSlot(slot) {
  return {
    id: slot.id,
    startsAt: slot.starts_at,
    endsAt: slot.ends_at,
    status: slot.status,
  };
}

function normalizeBooking(booking) {
  return {
    id: booking.id,
    slotId: booking.slot_id,
    name: booking.name,
    email: booking.email,
    phone: booking.phone,
    company: booking.company,
    teamSize: booking.team_size,
    monthlyLeads: booking.monthly_leads,
    mainGoal: booking.main_goal,
    urgency: booking.urgency,
    score: booking.score,
    status: booking.status,
    notes: booking.notes,
    createdAt: booking.created_at,
    slot: booking.demo_availability_slots
      ? normalizeSlot(booking.demo_availability_slots)
      : undefined,
  };
}

function dateFromLocalParts(date, time, timezoneOffsetMinutes = 0) {
  const [year, month, day] = date.split('-').map(Number);
  const [hour, minute] = time.split(':').map(Number);
  return new Date(Date.UTC(year, month - 1, day, hour, minute, 0) + Number(timezoneOffsetMinutes || 0) * 60 * 1000);
}

router.get('/slots', async (_req, res) => {
  try {
    const supabase = getSupabaseServer();
    const { data, error } = await supabase
      .from('demo_availability_slots')
      .select('id, starts_at, ends_at, status')
      .eq('status', 'open')
      .gte('starts_at', new Date().toISOString())
      .order('starts_at', { ascending: true })
      .limit(80);

    if (error) throw error;
    res.json({ slots: (data || []).map(normalizeSlot) });
  } catch (error) {
    console.error('[DemoScheduler] slots error:', error);
    res.status(500).json({ error: 'Agenda indisponível. Verifique a migration da agenda de demonstração.' });
  }
});

router.post('/bookings', async (req, res) => {
  try {
    const supabase = getSupabaseServer();
    const {
      slotId,
      name,
      email,
      phone,
      company,
      teamSize,
      monthlyLeads,
      mainGoal,
      urgency,
      notes,
    } = req.body || {};

    if (!slotId || !name || !email) {
      return res.status(400).json({ error: 'Dados obrigatórios ausentes.' });
    }

    const score = calculateScore({
      team_size: teamSize,
      monthly_leads: monthlyLeads,
      main_goal: mainGoal,
      urgency,
    });

    if (score < REQUIRED_SCORE) {
      return res.status(422).json({ error: 'Lead ainda não qualificado para agenda direta.' });
    }

    const { data: slot, error: slotError } = await supabase
      .from('demo_availability_slots')
      .select('*')
      .eq('id', slotId)
      .eq('status', 'open')
      .single();

    if (slotError || !slot) {
      return res.status(409).json({ error: 'Horário indisponível. Escolha outro horário.' });
    }

    const { data: booking, error: bookingError } = await supabase
      .from('demo_bookings')
      .insert({
        slot_id: slotId,
        name,
        email,
        phone,
        company,
        team_size: teamSize,
        monthly_leads: monthlyLeads,
        main_goal: mainGoal,
        urgency,
        score,
        notes,
      })
      .select('*, demo_availability_slots(*)')
      .single();

    if (bookingError) throw bookingError;

    const { error: updateError } = await supabase
      .from('demo_availability_slots')
      .update({ status: 'booked', updated_at: new Date().toISOString() })
      .eq('id', slotId);

    if (updateError) throw updateError;

    res.status(201).json({ booking: normalizeBooking(booking) });
  } catch (error) {
    console.error('[DemoScheduler] booking error:', error);
    res.status(500).json({ error: 'Não foi possível confirmar o agendamento.' });
  }
});

router.get('/admin/overview', verifySuperAdmin, async (_req, res) => {
  try {
    const supabase = getSupabaseServer();
    const [slotsResult, bookingsResult] = await Promise.all([
      supabase
        .from('demo_availability_slots')
        .select('*')
        .gte('starts_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        .order('starts_at', { ascending: true })
        .limit(200),
      supabase
        .from('demo_bookings')
        .select('*, demo_availability_slots(*)')
        .order('created_at', { ascending: false })
        .limit(200),
    ]);

    if (slotsResult.error) throw slotsResult.error;
    if (bookingsResult.error) throw bookingsResult.error;

    res.json({
      slots: (slotsResult.data || []).map(normalizeSlot),
      bookings: (bookingsResult.data || []).map(normalizeBooking),
    });
  } catch (error) {
    console.error('[DemoScheduler] admin overview error:', error);
    res.status(500).json({ error: 'Erro ao carregar agenda de demonstrações.' });
  }
});

router.post('/admin/slots', verifySuperAdmin, async (req, res) => {
  try {
    const supabase = getSupabaseServer();
    const { date, startTime, endTime, timezoneOffsetMinutes } = req.body || {};
    if (!date || !startTime || !endTime) {
      return res.status(400).json({ error: 'Informe data, início e fim.' });
    }

    const slots = [];
    const start = dateFromLocalParts(date, startTime, timezoneOffsetMinutes);
    const end = dateFromLocalParts(date, endTime, timezoneOffsetMinutes);

    for (let cursor = new Date(start); cursor < end; cursor = new Date(cursor.getTime() + 30 * 60 * 1000)) {
      const slotEnd = new Date(cursor.getTime() + 30 * 60 * 1000);
      if (slotEnd <= end) {
        slots.push({
          starts_at: cursor.toISOString(),
          ends_at: slotEnd.toISOString(),
          status: 'open',
          created_by: req.user?.id || null,
        });
      }
    }

    if (slots.length === 0) {
      return res.status(400).json({ error: 'Janela precisa ter pelo menos 30 minutos.' });
    }

    const { data, error } = await supabase
      .from('demo_availability_slots')
      .upsert(slots, { onConflict: 'starts_at', ignoreDuplicates: true })
      .select('*');

    if (error) throw error;
    res.status(201).json({ slots: (data || []).map(normalizeSlot) });
  } catch (error) {
    console.error('[DemoScheduler] create slots error:', error);
    res.status(500).json({ error: 'Erro ao criar horários.' });
  }
});

router.patch('/admin/bookings/:id', verifySuperAdmin, async (req, res) => {
  try {
    const supabase = getSupabaseServer();
    const { status } = req.body || {};
    if (!['scheduled', 'completed', 'cancelled', 'no_show'].includes(status)) {
      return res.status(400).json({ error: 'Status inválido.' });
    }

    const { data, error } = await supabase
      .from('demo_bookings')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .select('*, demo_availability_slots(*)')
      .single();

    if (error) throw error;
    res.json({ booking: normalizeBooking(data) });
  } catch (error) {
    console.error('[DemoScheduler] update booking error:', error);
    res.status(500).json({ error: 'Erro ao atualizar agendamento.' });
  }
});

router.delete('/admin/slots/:id', verifySuperAdmin, async (req, res) => {
  try {
    const supabase = getSupabaseServer();
    const { error } = await supabase
      .from('demo_availability_slots')
      .update({ status: 'blocked', updated_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .eq('status', 'open');

    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    console.error('[DemoScheduler] block slot error:', error);
    res.status(500).json({ error: 'Erro ao bloquear horário.' });
  }
});

export default router;
