import axios from 'axios';
import { getSupabaseServer } from '../lib/supabase-server.js';
import logger from '../utils/logger.js';

const CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutos

async function publishToMetaGraph(post, account) {
  if (!account?.access_token || !account?.account_id) {
    throw new Error('Conta social sem access_token ou account_id válido.');
  }

  const graphBase = 'https://graph.facebook.com/v19.0';
  const mediaUrls = Array.isArray(post.media_urls) ? post.media_urls.filter(Boolean) : [];
  const platforms = Array.isArray(post.platforms) && post.platforms.length
    ? post.platforms
    : [account.platform || 'facebook'];

  const results = [];

  for (const platform of platforms) {
    if (platform === 'instagram') {
      if (!mediaUrls[0]) {
        throw new Error('Publicação no Instagram exige ao menos uma URL de imagem pública.');
      }
      const containerRes = await axios.post(
        `${graphBase}/${account.account_id}/media`,
        {
          image_url: mediaUrls[0],
          caption: post.content || '',
          access_token: account.access_token,
        },
        { timeout: 20000 }
      );
      const creationId = containerRes.data?.id;
      if (!creationId) {
        throw new Error('Falha ao criar container de mídia no Instagram.');
      }
      const publishRes = await axios.post(
        `${graphBase}/${account.account_id}/media_publish`,
        {
          creation_id: creationId,
          access_token: account.access_token,
        },
        { timeout: 20000 }
      );
      results.push({ platform: 'instagram', id: publishRes.data?.id || creationId });
    } else {
      const endpoint = mediaUrls[0]
        ? `${graphBase}/${account.account_id}/photos`
        : `${graphBase}/${account.account_id}/feed`;
      const payload = mediaUrls[0]
        ? { url: mediaUrls[0], caption: post.content || '', access_token: account.access_token }
        : { message: post.content || '', access_token: account.access_token };

      const fbRes = await axios.post(endpoint, payload, { timeout: 20000 });
      results.push({ platform: 'facebook', id: fbRes.data?.id || null });
    }
  }

  return results;
}

export async function processScheduledPosts() {
  try {
    const supabase = getSupabaseServer();
    const now = new Date().toISOString();

    const { data: posts, error } = await supabase
      .from('social_posts')
      .select('*')
      .eq('status', 'scheduled')
      .lte('scheduled_for', now);

    if (error) throw error;
    if (!posts || posts.length === 0) return;

    logger.info(`[SocialWorker] Encontrou ${posts.length} posts para publicar.`);

    for (const post of posts) {
      try {
        const { data: account } = await supabase
          .from('social_accounts')
          .select('platform, account_id, access_token')
          .eq('org_id', post.org_id)
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        const publishedResults = await publishToMetaGraph(post, account);

        await supabase
          .from('social_posts')
          .update({
            status: 'published',
            error_message: null,
            updated_at: new Date(),
          })
          .eq('id', post.id);

        logger.info(`[SocialWorker] Post ${post.id} publicado na Meta Graph API`, {
          orgId: post.org_id,
          publishedResults,
        });
      } catch (postError) {
        const errMessage =
          postError?.response?.data?.error?.message ||
          postError?.message ||
          'Falha ao publicar na Meta Graph API';
        logger.error(`[SocialWorker] Erro ao publicar post ${post.id}`, {
          error: errMessage,
        });
        await supabase
          .from('social_posts')
          .update({
            status: 'failed',
            error_message: errMessage,
            updated_at: new Date(),
          })
          .eq('id', post.id);
      }
    }
  } catch (err) {
    logger.error('[SocialWorker] Falha na execução geral do worker', {
      error: err.message,
    });
  }
}

export function startSocialWorker() {
  logger.info('[SocialWorker] Worker de agendamento social iniciado (intervalo de 5m).');
  setInterval(processScheduledPosts, CHECK_INTERVAL);
}
