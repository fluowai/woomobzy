import React, { useState, useEffect } from 'react';
import { supabase } from '@/services/supabase';
import { useAuth } from '@/context/AuthContext';
import { callApi } from '@/src/lib/api';
import { Calendar, Clock, Plus, Share2, X } from 'lucide-react';
import { toast } from 'sonner';

export default function SocialMediaCalendar() {
    const { user, profile } = useAuth();
    const organization = (profile as any)?.organization;
    const [posts, setPosts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showNewModal, setShowNewModal] = useState(false);
    const [savingPost, setSavingPost] = useState(false);
    const [postForm, setPostForm] = useState({
        content: '',
        scheduled_for: new Date(Date.now() + 3600 * 1000).toISOString().slice(0, 16),
        platforms: ['instagram', 'facebook'] as string[],
        media_url: '',
    });

    useEffect(() => {
        if (organization?.id) {
            fetchPosts();
        }
    }, [organization?.id]);

    const fetchPosts = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('social_posts')
                .select('*, properties(title)')
                .eq('org_id', organization.id)
                .order('scheduled_for', { ascending: true });

            if (error) throw error;
            setPosts(data || []);
        } catch (error) {
            console.error('Erro ao buscar posts:', error);
            toast.error('Não foi possível carregar o calendário.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <Share2 className="w-6 h-6 text-primary" />
                        Agendamento de Redes Sociais
                    </h1>
                    <p className="text-gray-500 mt-1">Gerencie suas publicações do Instagram e Facebook.</p>
                </div>
                <button 
                    className="bg-primary text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-primary/90 transition-colors"
                    onClick={() => setShowNewModal(true)}
                >
                    <Plus className="w-5 h-5" />
                    Novo Post
                </button>
            </div>

            {loading ? (
                <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
            ) : posts.length === 0 ? (
                <div className="bg-white rounded-xl border border-gray-200 p-12 text-center shadow-sm">
                    <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum post agendado</h3>
                    <p className="text-gray-500 max-w-sm mx-auto">
                        Crie seu primeiro post para divulgar seus imóveis automaticamente nas redes sociais.
                    </p>
                </div>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {posts.map(post => (
                        <div key={post.id} className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex justify-between items-start mb-4">
                                <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${
                                    post.status === 'published' ? 'bg-green-100 text-green-700' :
                                    post.status === 'scheduled' ? 'bg-blue-100 text-blue-700' :
                                    post.status === 'failed' ? 'bg-red-100 text-red-700' :
                                    'bg-gray-100 text-gray-700'
                                }`}>
                                    {post.status.toUpperCase()}
                                </span>
                                <div className="flex gap-1">
                                    {(post.platforms || []).map((platform, idx) => (
                                        <span key={idx} className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-600 capitalize">
                                            {platform}
                                        </span>
                                    ))}
                                </div>
                            </div>
                            
                            <p className="text-sm text-gray-700 line-clamp-3 mb-4">
                                {post.content}
                            </p>

                            {post.properties?.title && (
                                <div className="text-xs text-gray-500 mb-4 bg-gray-50 p-2 rounded">
                                    🏠 Imóvel: {post.properties.title}
                                </div>
                            )}

                            <div className="flex items-center text-xs text-gray-500 gap-1 mt-auto pt-4 border-t border-gray-100">
                                <Clock className="w-4 h-4" />
                                {new Date(post.scheduled_for).toLocaleString()}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {showNewModal && (
                <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl">
                        <div className="flex items-center justify-between border-b pb-3">
                            <h3 className="font-bold text-lg text-gray-900">Agendar Novo Post</h3>
                            <button
                                onClick={() => setShowNewModal(false)}
                                className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="space-y-3">
                            <div>
                                <label className="text-xs font-semibold text-gray-600 block mb-1">Legenda / Conteúdo</label>
                                <textarea
                                    rows={4}
                                    value={postForm.content}
                                    onChange={(e) => setPostForm((p) => ({ ...p, content: e.target.value }))}
                                    placeholder="Digite o texto da publicação..."
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-primary"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-gray-600 block mb-1">URL da Imagem (opcional)</label>
                                <input
                                    value={postForm.media_url}
                                    onChange={(e) => setPostForm((p) => ({ ...p, media_url: e.target.value }))}
                                    placeholder="https://..."
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-primary"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-gray-600 block mb-1">Data e Hora de Publicação</label>
                                <input
                                    type="datetime-local"
                                    value={postForm.scheduled_for}
                                    onChange={(e) => setPostForm((p) => ({ ...p, scheduled_for: e.target.value }))}
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-primary"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-gray-600 block mb-1">Redes</label>
                                <div className="flex gap-3">
                                    {['instagram', 'facebook'].map((platform) => {
                                        const active = postForm.platforms.includes(platform);
                                        return (
                                            <button
                                                key={platform}
                                                type="button"
                                                onClick={() =>
                                                    setPostForm((p) => ({
                                                        ...p,
                                                        platforms: active
                                                            ? p.platforms.filter((item) => item !== platform)
                                                            : [...p.platforms, platform],
                                                    }))
                                                }
                                                className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize border ${
                                                    active
                                                        ? 'bg-primary text-white border-primary'
                                                        : 'bg-white text-gray-600 border-gray-200'
                                                }`}
                                            >
                                                {platform}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 pt-2">
                            <button
                                onClick={() => setShowNewModal(false)}
                                className="px-4 py-2 rounded-lg border border-gray-200 text-xs font-bold text-gray-600"
                            >
                                Cancelar
                            </button>
                            <button
                                disabled={savingPost}
                                onClick={async () => {
                                    if (!postForm.content.trim() || postForm.platforms.length === 0) {
                                        toast.error('Informe a legenda e selecione ao menos uma rede.');
                                        return;
                                    }
                                    try {
                                        setSavingPost(true);
                                        await callApi('/api/social/posts', {
                                            method: 'POST',
                                            body: JSON.stringify({
                                                content: postForm.content.trim(),
                                                media_urls: postForm.media_url.trim()
                                                    ? [postForm.media_url.trim()]
                                                    : [],
                                                platforms: postForm.platforms,
                                                scheduled_for: new Date(postForm.scheduled_for).toISOString(),
                                            }),
                                        });
                                        toast.success('Post agendado com sucesso!');
                                        setShowNewModal(false);
                                        setPostForm((p) => ({ ...p, content: '', media_url: '' }));
                                        await fetchPosts();
                                    } catch (err: any) {
                                        toast.error(err?.message || 'Erro ao agendar post.');
                                    } finally {
                                        setSavingPost(false);
                                    }
                                }}
                                className="px-4 py-2 rounded-lg bg-primary text-white text-xs font-bold disabled:opacity-50"
                            >
                                {savingPost ? 'Agendando...' : 'Agendar Post'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
