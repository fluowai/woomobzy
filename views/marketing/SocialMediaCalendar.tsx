import React, { useState, useEffect } from 'react';
import { supabase } from '@/services/supabase';
import { useAuth } from '@/context/AuthContext';
import { Calendar, Clock, Plus, Share2 } from 'lucide-react';
import { toast } from 'sonner';

export default function SocialMediaCalendar() {
    const { user, profile } = useAuth();
    const organization = (profile as any)?.organization;
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);

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
                    onClick={() => toast.info('Abertura do modal de novo post em desenvolvimento')}
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
        </div>
    );
}
