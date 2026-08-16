import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';

const ROOT = process.cwd();

function read(relativePath: string) {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

describe('AI agent runtime hardening', () => {
  it('restringe policies legadas ao service_role', () => {
    const migration = read('migrations/20260815_ai_agent_swarm_runtime.sql');

    expect(migration).toContain(
      'CREATE POLICY "Service role full access on ai_agents" ON ai_agents\n  FOR ALL TO service_role'
    );
    expect(migration).toContain(
      'CREATE POLICY "Service role full access on conversation_memory" ON conversation_memory\n  FOR ALL TO service_role'
    );
    expect(migration).not.toMatch(
      /CREATE POLICY "Service role full access on ai_agents" ON ai_agents\s+FOR ALL USING/
    );
  });

  it('mantém ledger idempotente e barreiras de concorrência da agenda', () => {
    const migration = read('migrations/20260815_ai_agent_swarm_runtime.sql');

    expect(migration).toContain('UNIQUE (organization_id, idempotency_key)');
    expect(migration).toContain('guard_active_appointment_slot()');
    expect(migration).toContain('pg_advisory_xact_lock');
    expect(migration).toContain('trg_guard_active_appointment_slot');
  });

  it('exige perfil administrativo nas superfícies de configuração e teste', () => {
    const agentsRoutes = read('server/api/ai/agents.routes.js');
    const automationRoutes = read('server/api/ai/automation.routes.js');
    const chatRoutes = read('server/api/ai/chat.routes.js');
    const gate = "requireRole('admin', 'superadmin')";

    expect(
      agentsRoutes.match(new RegExp(gate.replace(/[()']/g, '\\$&'), 'g'))
    ).toHaveLength(4);
    expect(
      automationRoutes.match(new RegExp(gate.replace(/[()']/g, '\\$&'), 'g'))
    ).toHaveLength(3);
    expect(chatRoutes).toContain(gate);
  });

  it('isola simulações e desabilita efeitos colaterais', () => {
    const simulator = read('server/services/ai/conversationSimulator.js');
    const chatRoutes = read('server/api/ai/chat.routes.js');
    const simulationRoute = chatRoutes
      .split("'/agents/:id/simulate'")[1]
      .split("'/agents/:id/memory'")[0];

    expect(simulator).toContain('const sessionId = `sim-${agent.id}-');
    expect(simulator).toContain('allowSideEffects: false');
    expect(simulator).toContain('sessionId,');
    expect(simulator).toContain('config?.gemini?.apiKey');
    expect(simulator).not.toContain('config?.namoBana?.apiKey');
    expect(simulationRoute).not.toContain('session_id');
  });
});
