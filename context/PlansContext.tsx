
import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from './AuthContext';

// Define available features
export type Feature = 'crm' | 'site' | 'ia_chat' | 'api' | 'whatsapp';

interface PlanLimits {
    users: number;
    properties: number;
    whatsapp_instances: number;
}

interface Plan {
    id: string;
    name: string;
    features: Feature[];
    limits: PlanLimits;
}

interface PlansContextType {
    currentPlan: Plan | null;
    loading: boolean;
    hasFeature: (feature: Feature) => boolean;
    checkLimit: (limit: keyof PlanLimits, currentValue: number) => boolean;
}

const PlansContext = createContext<PlansContextType | undefined>(undefined);

export const PlansProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user, profile } = useAuth();
    const [currentPlan, setCurrentPlan] = useState<Plan | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user) {
            fetchPlan();
        } else {
            setLoading(false);
        }
    }, [user]);

    const fetchPlan = async () => {
        if (!user) return;
        try {
            // 1. Get Org ID from profile
            const { data: profileData } = await supabase
                .from('profiles')
                .select('organization_id')
                .eq('id', user.id)
                .single();

            if (!profileData?.organization_id) {
                setLoading(false);
                return;
            }

            // 2. Get Plan details via Organization
            const { data: orgData, error } = await supabase
                .from('organizations')
                .select(`
                    plan_id,
                    plans (
                        id,
                        name,
                        features,
                        limits
                    )
                `)
                .eq('id', profileData.organization_id)
                .single();

            if (error) throw error;

            if (orgData.plans) {
                // @ts-ignore
                setCurrentPlan(orgData.plans as Plan);
            }
        } catch (error) {
            console.error('Error fetching plan:', error);
            // Fallback to basic plan or null
        } finally {
            setLoading(false);
        }
    };

    const hasFeature = (feature: Feature): boolean => {
        // Super admin has everything
        if (profile?.role === 'superadmin') return true;
        
        if (!currentPlan) return false;
        return currentPlan.features.includes(feature);
    };

    const checkLimit = (limit: keyof PlanLimits, currentValue: number): boolean => {
        // Super admin has no limits
        if (profile?.role === 'superadmin') return true;

        if (!currentPlan) return false;
        const max = currentPlan.limits[limit];
        return currentValue < max;
    };

    return (
        <PlansContext.Provider value={{ currentPlan, loading, hasFeature, checkLimit }}>
            {children}
        </PlansContext.Provider>
    );
};

export const usePlans = () => {
    const context = useContext(PlansContext);
    if (context === undefined) {
        throw new Error('usePlans must be used within a PlansProvider');
    }
    return context;
};
