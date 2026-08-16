import { describe, expect, it } from 'vitest';

import type { UnifiedChat } from '../views/WhatsApp/hooks/unifiedInbox';
import {
  filterInboxChats,
  formatSla,
  getInboxMetrics,
  isSlaOverdue,
} from '../views/WhatsApp/inboxPresentation';

const now = new Date('2026-08-01T15:00:00Z').getTime();

function chat(overrides: Partial<UnifiedChat>): UnifiedChat {
  return {
    id: 'chat-1',
    instance_id: 'instance-1',
    chat_jid: '5511999999999@s.whatsapp.net',
    name: 'Marina Lopes',
    is_group: false,
    unread_count: 1,
    last_message_at: '2026-08-01T14:48:00Z',
    created_at: '2026-08-01T14:00:00Z',
    updated_at: '2026-08-01T14:48:00Z',
    platform: 'whatsapp',
    ...overrides,
  };
}

describe('WhatsApp inbox presentation', () => {
  it('filters mine, unassigned, platform and SLA queues using real chat context', () => {
    const mine = chat({
      id: 'mine',
      crm_is_mine: true,
      crm_assigned_to: 'user-1',
    });
    const unassigned = chat({ id: 'free', crm_assigned_to: null });
    const overdue = chat({
      id: 'late',
      last_message_at: '2026-08-01T13:00:00Z',
    });
    const chats = [mine, unassigned, overdue];

    expect(
      filterInboxChats(chats, {
        platform: 'all',
        queue: 'mine',
        groups: false,
        now,
      })
    ).toEqual([mine]);
    expect(
      filterInboxChats(chats, {
        platform: 'all',
        queue: 'unassigned',
        groups: false,
        now,
      })
    ).toEqual([unassigned, overdue]);
    expect(
      filterInboxChats(chats, {
        platform: 'all',
        queue: 'sla',
        groups: false,
        now,
      })
    ).toEqual([overdue]);
  });

  it('calculates metrics and SLA labels', () => {
    const current = chat({
      id: 'current',
      crm_is_mine: true,
      crm_assigned_to: 'user-1',
    });
    const overdue = chat({
      id: 'late',
      last_message_at: '2026-08-01T13:00:00Z',
    });
    const metrics = getInboxMetrics([current, overdue], now);

    expect(metrics).toMatchObject({
      conversations: 2,
      open: 2,
      overdue: 1,
      mine: 1,
    });
    expect(isSlaOverdue(overdue, now)).toBe(true);
    expect(formatSla(current, now)).toBe('SLA 18min');
    expect(formatSla(overdue, now)).toBe('SLA vencido');
  });
});
