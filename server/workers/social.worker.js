import { getSupabaseServer } from '../lib/supabase-server.js';
import logger from '../utils/logger.js';
// Em produção, axios seria usado para chamar a Graph API da Meta
// import axios from 'axios'; 

const CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutos (configurado pelo usuário)

export async function processScheduledPosts() {
    try {
        const supabase = getSupabaseServer();
        const now = new Date().toISOString();

        // Busca posts que estão com status 'scheduled' e cuja data de agendamento já passou ou é agora
        const { data: posts, error } = await supabase
            .from('social_posts')
            .select(`
                *,
                social_accounts (
                    platform,
                    account_id,
                    access_token
                )
            `)
            .eq('status', 'scheduled')
            .lte('scheduled_for', now);

        if (error) throw error;
        if (!posts || posts.length === 0) return;

        logger.info(`[SocialWorker] Encontrou ${posts.length} posts para publicar.`);

        for (const post of posts) {
            try {
                // Aqui entraria a lógica de integração real com a Graph API da Meta
                // Exemplo:
                // const metaResponse = await axios.post(`https://graph.facebook.com/v19.0/${account.account_id}/media`, { ... })
                
                logger.info(`[SocialWorker] Publicando post ${post.id} para org ${post.org_id}`);
                
                // Simulação de sucesso
                await supabase
                    .from('social_posts')
                    .update({ status: 'published', updated_at: new Date() })
                    .eq('id', post.id);

            } catch (postError) {
                logger.error(`[SocialWorker] Erro ao publicar post ${post.id}`, { error: postError.message });
                await supabase
                    .from('social_posts')
                    .update({ 
                        status: 'failed', 
                        error_message: postError.message,
                        updated_at: new Date()
                    })
                    .eq('id', post.id);
            }
        }
    } catch (err) {
        logger.error('[SocialWorker] Falha na execução geral do worker', { error: err.message });
    }
}

// Inicia o cron loop
export function startSocialWorker() {
    logger.info('[SocialWorker] Worker de agendamento social iniciado (intervalo de 5m).');
    setInterval(processScheduledPosts, CHECK_INTERVAL);
}
