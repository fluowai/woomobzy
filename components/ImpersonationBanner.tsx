
import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { ShieldAlert, LogOut } from 'lucide-react';
import { supabase } from '../services/supabase';

const ImpersonationBanner: React.FC = () => {
    const { user, loading } = useAuth();
    const [isImpersonating, setIsImpersonating] = useState(false);
    const [actorId, setActorId] = useState<string | null>(null);

    useEffect(() => {
        if (!user || loading) return;

        // Check for specific claim in app_metadata
        // This relies on the custom token we minted
        const checkImpersonation = () => {
            const output = user.app_metadata?.provider === 'impersonation';
            setIsImpersonating(output);
            if (output) {
                setActorId(user.app_metadata.actor_user_id as string);
            }
        };

        checkImpersonation();
    }, [user, loading]);

    const exitSupportMode = async () => {
        if (confirm('Sair do modo de suporte e encerrar sessão do cliente?')) {
            await supabase.auth.signOut();
            localStorage.removeItem('isImpersonating');
            // Redirect to login or admin login
            window.location.href = '/login';
        }
    };

    if (!isImpersonating) return null;

    return (
        <div className="bg-amber-500 text-white px-4 py-2 shadow-md flex items-center justify-between z-[9999] relative">
            <div className="flex items-center gap-2">
                <ShieldAlert className="h-5 w-5 animate-pulse" />
                <span className="font-bold text-sm md:text-base">
                    MODO SUPORTE: Você está acessando como o cliente.
                </span>
                <span className="text-xs bg-amber-700/50 px-2 py-0.5 rounded ml-2 hidden sm:inline-block">
                    Sessão Monitorada
                </span>
            </div>
            <button 
                onClick={exitSupportMode}
                className="flex items-center gap-1 bg-white text-amber-600 px-3 py-1 rounded text-sm font-bold hover:bg-amber-50 transition-colors shadow-sm"
            >
                <LogOut size={14} />
                Sair
            </button>
        </div>
    );
};

export default ImpersonationBanner;
