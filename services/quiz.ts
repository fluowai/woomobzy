import { callApi, getApiUrl } from '../src/lib/api';
import { supabase } from './supabase';

export type QuizOption = {
  value: string;
  label: string;
  score: number;
  disqualify?: boolean;
  reason?: string;
};

export type QuizQuestion = {
  id: string;
  label: string;
  type: 'single';
  required: boolean;
  options: QuizOption[];
};

export type QuizCampaign = {
  id: string;
  title: string;
  slug: string;
  property_label: string;
  status: 'draft' | 'active' | 'paused' | 'archived';
  whatsapp_number: string;
  qualification_threshold: number;
  intro_title: string;
  intro_copy: string;
  success_message: string;
  disqualification_message: string;
  questions: QuizQuestion[];
  branding: Record<string, string>;
  created_at: string;
  quiz_submissions?: Array<{ count: number }>;
};

export type QuizSubmission = {
  id: string;
  name: string;
  email?: string | null;
  phone: string;
  score: number;
  qualification_status: 'qualified' | 'nurture';
  disqualification_reasons: string[];
  created_at: string;
};

export type RentalQuizInput = {
  city: string;
  bedrooms: number;
  minRent: number;
  maxRent: number;
};

export function buildRentalQuestions(input: RentalQuizInput): QuizQuestion[] {
  const city = input.city.trim() || 'sua cidade';
  const bedrooms = Math.max(1, input.bedrooms || 1);
  const minRent = Math.max(0, input.minRent || 0);
  const maxRent = Math.max(minRent, input.maxRent || minRent);
  const below = Math.max(0, minRent - 1);

  return [
    {
      id: 'intent',
      label: `Você procura um imóvel para morar em ${city}?`,
      type: 'single',
      required: true,
      options: [
        { value: 'yes', label: `Sim, quero morar em ${city}`, score: 20 },
        { value: 'moving', label: `Estou me mudando para ${city} a trabalho`, score: 20 },
        { value: 'no', label: 'Não, procuro em outra cidade', score: 0, disqualify: true, reason: `Não pretende morar em ${city}` },
      ],
    },
    {
      id: 'household',
      label: 'Para quantas pessoas seria o imóvel?',
      type: 'single',
      required: true,
      options: [
        { value: '1', label: '1 pessoa', score: 4 },
        { value: '2-3', label: '2 a 3 pessoas', score: 10 },
        { value: '4-5', label: '4 a 5 pessoas', score: 10 },
        { value: '6+', label: '6 pessoas ou mais', score: 5 },
      ],
    },
    {
      id: 'bedrooms',
      label: `Você precisa de ${bedrooms} quartos?`,
      type: 'single',
      required: true,
      options: [
        { value: `${bedrooms}+`, label: `Sim, ${bedrooms} quartos ou mais`, score: 15 },
        { value: 'less', label: 'Um imóvel menor seria suficiente', score: 0, disqualify: true, reason: `Busca imóvel menor que ${bedrooms} quartos` },
      ],
    },
    {
      id: 'budget',
      label: 'Qual faixa mensal de aluguel cabe no seu planejamento?',
      type: 'single',
      required: true,
      options: [
        { value: 'below', label: `Abaixo de R$ ${below.toLocaleString('pt-BR')}`, score: 0, disqualify: true, reason: 'Faixa de aluguel incompatível com a campanha' },
        { value: 'compatible', label: `De R$ ${minRent.toLocaleString('pt-BR')} a R$ ${maxRent.toLocaleString('pt-BR')}`, score: 20 },
        { value: 'above', label: `Acima de R$ ${maxRent.toLocaleString('pt-BR')}`, score: 20 },
      ],
    },
    {
      id: 'move_time',
      label: 'Quando pretende se mudar?',
      type: 'single',
      required: true,
      options: [
        { value: '15', label: 'Em até 15 dias', score: 15 },
        { value: '30', label: 'Em até 30 dias', score: 15 },
        { value: '60', label: 'Entre 31 e 60 dias', score: 8 },
        { value: 'later', label: 'Depois de 60 dias ou sem prazo', score: 0, reason: 'Sem urgência de mudança' },
      ],
    },
    {
      id: 'income',
      label: 'Você possui renda comprovável para o cadastro?',
      type: 'single',
      required: true,
      options: [
        { value: 'yes', label: 'Sim', score: 10 },
        { value: 'guarantor', label: 'Tenho responsável financeiro ou garantia', score: 6 },
        { value: 'no', label: 'Não possuo renda ou responsável', score: 0, disqualify: true, reason: 'Sem condição mínima de cadastro' },
      ],
    },
    {
      id: 'restrictions',
      label: 'Existe alguma restrição de cadastro que a imobiliária precisa conhecer?',
      type: 'single',
      required: true,
      options: [
        { value: 'no', label: 'Não', score: 5 },
        { value: 'yes', label: 'Sim, prefiro explicar no atendimento', score: 0, reason: 'Possui restrição de cadastro' },
      ],
    },
    {
      id: 'garage',
      label: 'Garagem é importante para você?',
      type: 'single',
      required: true,
      options: [
        { value: 'yes', label: 'Sim', score: 3 },
        { value: 'no', label: 'Não é essencial', score: 1 },
      ],
    },
    {
      id: 'visit',
      label: 'Se o imóvel estiver disponível, você quer agendar uma visita?',
      type: 'single',
      required: true,
      options: [
        { value: 'yes', label: 'Sim, quero visitar', score: 2 },
        { value: 'details', label: 'Quero receber mais detalhes primeiro', score: 1 },
        { value: 'no', label: 'Ainda não', score: 0 },
      ],
    },
  ];
}

export const quizService = {
  async listCampaigns(): Promise<QuizCampaign[]> {
    try {
      const response = await callApi('/api/quiz/campaigns');
      return response.campaigns || [];
    } catch (apiError) {
      const { data, error } = await supabase
        .from('quiz_campaigns')
        .select('*, quiz_submissions(count)')
        .neq('status', 'archived')
        .order('created_at', { ascending: false });
      if (error) throw apiError;
      return (data || []) as QuizCampaign[];
    }
  },

  async createCampaign(payload: Omit<QuizCampaign, 'id' | 'created_at' | 'quiz_submissions'>) {
    const response = await callApi('/api/quiz/campaigns', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return response.campaign as QuizCampaign;
  },

  async generateFromPdf(file: File, defaults: Record<string, string | number>) {
    const formData = new FormData();
    formData.append('file', file);
    Object.entries(defaults).forEach(([key, value]) => {
      formData.append(key, String(value ?? ''));
    });

    const response = await callApi('/api/quiz/campaigns/generate-from-pdf', {
      method: 'POST',
      body: formData,
    });
    return response.campaign as Omit<QuizCampaign, 'id' | 'created_at' | 'quiz_submissions'>;
  },

  async updateCampaign(id: string, payload: Partial<QuizCampaign>) {
    const response = await callApi(`/api/quiz/campaigns/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
    return response.campaign as QuizCampaign;
  },

  async listSubmissions(id: string): Promise<QuizSubmission[]> {
    try {
      const response = await callApi(`/api/quiz/campaigns/${id}/submissions`);
      return response.submissions || [];
    } catch (apiError) {
      const { data, error } = await supabase
        .from('quiz_submissions')
        .select('*')
        .eq('campaign_id', id)
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) throw apiError;
      return (data || []) as QuizSubmission[];
    }
  },

  async getPublicCampaign(slug: string): Promise<QuizCampaign> {
    const response = await fetch(getApiUrl(`/api/quiz/public/${encodeURIComponent(slug)}`));
    if (response.ok) return (await response.json()).campaign;

    const apiData = await response.json().catch(() => ({}));
    const { data, error } = await supabase.rpc('get_public_quiz', { p_slug: slug });
    if (error || !data) throw new Error(error?.message || apiData.error || 'Quiz indisponível.');
    return data as QuizCampaign;
  },

  async submitPublic(slug: string, payload: Record<string, unknown>) {
    const response = await fetch(getApiUrl(`/api/quiz/public/${encodeURIComponent(slug)}/submissions`), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await response.json().catch(() => ({}));
    if (response.ok) return data as { qualified: boolean; score: number; message: string; whatsapp_url?: string | null };

    const { data: fallback, error } = await supabase.rpc('submit_public_quiz', {
      p_slug: slug,
      p_name: payload.name,
      p_email: payload.email || '',
      p_phone: payload.phone,
      p_answers: payload.answers || {},
      p_utm: payload.utm || {},
    });
    if (error || !fallback) throw new Error(error?.message || data.error || 'Não foi possível concluir o quiz.');
    return fallback as { qualified: boolean; score: number; message: string; whatsapp_url?: string | null };
  },
};
