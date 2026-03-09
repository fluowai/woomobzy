
import jwt from 'jsonwebtoken';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Configuração Supabase (Service Role é CRUCIAL aqui para bypassar RLS e verificar admin)
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../../../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY; 
const jwtSecret = process.env.SUPABASE_JWT_SECRET; // Obrigatório para assinar tokens válidos!

if (!supabaseServiceKey || !jwtSecret) {
    console.error("❌ ERRO CRÍTICO: SUPABASE_SERVICE_ROLE_KEY ou SUPABASE_JWT_SECRET faltando!");
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

// Store OTC codes in memory for simplicity (Production: Redis)
const otcStore = new Map(); // code -> { actorId, targetUserId, tenantId, expiresAt }

// 1. INICIAR SESSÃO (Gera Código de Troca)
export const startImpersonation = async (req, res) => {
    const { actorId, targetUserId, tenantId, reason } = req.body;

    if (!actorId || !targetUserId || !tenantId) {
        return res.status(400).json({ error: 'Dados incompletos' });
    }

    try {
        // A. Verificar se o Ator é Super Admin
        const { data: actorProfile, error: actorError } = await supabaseAdmin
            .from('profiles')
            .select('role')
            .eq('id', actorId)
            .single();

        if (actorError || actorProfile?.role !== 'superadmin') {
            await logAudit(actorId, 'IMPERSONATE_ATTEMPT_FAILED', { reason: 'Unauthorized', target: targetUserId }, req.ip);
            return res.status(403).json({ error: 'Acesso negado. Apenas Super Admins.' });
        }

        // B. Criar Registro de Sessão no Banco
        const { data: session, error: sessionError } = await supabaseAdmin
            .from('impersonation_sessions')
            .insert([{
                tenant_id: tenantId,
                actor_user_id: actorId,
                impersonated_user_id: targetUserId,
                reason: reason || 'Suporte Técnico',
                expires_at: new Date(Date.now() + 3600000).toISOString(), // 1 hora
                status: 'active'
            }])
            .select()
            .single();

        if (sessionError) throw sessionError;

        // C. Gerar Código de Uso Único (OTC)
        const code = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        otcStore.set(code, {
            sessionId: session.id,
            actorId,
            targetUserId,
            tenantId,
            expiresAt: Date.now() + 60000 // 60 segundos
        });

        // D. Audit Log
        await logAudit(actorId, 'IMPERSONATE_Start', { sessionId: session.id, target: targetUserId, tenant: tenantId }, req.ip);

        res.json({ success: true, redirectUrl: `/impersonate?code=${code}` });

    } catch (error) {
        console.error('❌ Erro ao iniciar impersonation:', error);
        res.status(500).json({ error: error.message });
    }
};

// 2. TROCAR CÓDIGO POR TOKEN (Exchange)
export const exchangeImpersonationToken = async (req, res) => {
    const { code } = req.body;

    if (!code || !otcStore.has(code)) {
        return res.status(400).json({ error: 'Código inválido ou expirado' });
    }

    const data = otcStore.get(code);
    otcStore.delete(code); // Invalida imediatamente (Single Use)

    if (Date.now() > data.expiresAt) {
        return res.status(400).json({ error: 'Código expirado' });
    }

    try {
         // A. Gerar JWT Assinado com Segredo do Supabase
         // Isso faz o Supabase (Postgres) achar que é um login legítimo
         const payload = {
            aud: 'authenticated',
            role: 'authenticated',
            sub: data.targetUserId, // ID do usuario alvo!
            exp: Math.floor(Date.now() / 1000) + 3600, // 1 hora
            app_metadata: {
                provider: 'impersonation',
                impersonation_session: data.sessionId,
                actor_user_id: data.actorId, // Quem realmente está logado
                tenant_id: data.tenantId
            },
            user_metadata: {
                impersonated: true
            }
         };

         const token = jwt.sign(payload, jwtSecret);

         res.json({ success: true, token });

    } catch (error) {
        console.error('❌ Erro ao gerar token:', error);
        res.status(500).json({ error: 'Erro ao gerar token de acesso' });
    }
};

// Helper de Auditoria
async function logAudit(actorId, action, details, ip) {
    try {
        await supabaseAdmin.from('audit_logs').insert([{
            actor_id: actorId,
            action,
            details,
            ip_address: ip
        }]);
    } catch (e) {
        console.error('Falha ao auditar:', e);
    }
}
