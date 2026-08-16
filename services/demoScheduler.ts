import { callApi } from '../src/lib/api';

export type DemoSlot = {
  id: string;
  startsAt: string;
  endsAt: string;
  status: 'open' | 'booked' | 'blocked';
};

export type DemoBooking = {
  id: string;
  slotId: string;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  teamSize?: string;
  monthlyLeads?: string;
  mainGoal?: string;
  urgency?: string;
  score: number;
  status: 'scheduled' | 'completed' | 'cancelled' | 'no_show';
  notes?: string;
  createdAt: string;
  slot?: DemoSlot;
};

export type DemoQualification = {
  name: string;
  email: string;
  phone?: string;
  company?: string;
  teamSize: string;
  monthlyLeads: string;
  mainGoal: string;
  urgency: string;
};

export const demoSchedulerService = {
  async listPublicSlots(): Promise<DemoSlot[]> {
    const data = await callApi('/api/demo/slots');
    return data.slots || [];
  },

  async createBooking(
    payload: DemoQualification & { slotId: string; notes?: string }
  ): Promise<DemoBooking> {
    const data = await callApi('/api/demo/bookings', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return data.booking;
  },

  async getAdminOverview(): Promise<{
    slots: DemoSlot[];
    bookings: DemoBooking[];
  }> {
    return callApi('/api/demo/admin/overview');
  },

  async createSlots(payload: {
    date: string;
    startTime: string;
    endTime: string;
  }): Promise<DemoSlot[]> {
    const data = await callApi('/api/demo/admin/slots', {
      method: 'POST',
      body: JSON.stringify({
        ...payload,
        timezoneOffsetMinutes: new Date().getTimezoneOffset(),
      }),
    });
    return data.slots || [];
  },

  async blockSlot(id: string): Promise<void> {
    await callApi(`/api/demo/admin/slots/${id}`, { method: 'DELETE' });
  },

  async updateBookingStatus(
    id: string,
    status: DemoBooking['status']
  ): Promise<DemoBooking> {
    const data = await callApi(`/api/demo/admin/bookings/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
    return data.booking;
  },
};

export const scoreQualification = (data: Partial<DemoQualification>) => {
  let score = 0;
  if (['6-15', '16-40', '40+'].includes(data.teamSize || '')) score += 2;
  if (['51-150', '150+'].includes(data.monthlyLeads || '')) score += 2;
  if (
    [
      'organizar_atendimento',
      'aumentar_vendas',
      'automatizar_processos',
    ].includes(data.mainGoal || '')
  )
    score += 2;
  if (['agora', '30_dias'].includes(data.urgency || '')) score += 1;
  return score;
};
