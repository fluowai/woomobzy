export type LeaseStatus =
  | 'draft'
  | 'cadastral_analysis'
  | 'income_analysis'
  | 'pending_signatures'
  | 'active'
  | 'suspended'
  | 'terminated'
  | 'expired'
  | 'archived';

export type GuaranteeType =
  | 'fiador'
  | 'seguro_fianca'
  | 'deposito_caucao'
  | 'titulo_capitalizacao'
  | 'sem';

export type EvaluationStatus =
  | 'em_analise'
  | 'aprovado'
  | 'aprovado_com_ressalva'
  | 'reprovado';

export type PaymentStatus = 'em_dia' | 'atrasado' | 'inadimplente';

export type SignatureStatus =
  | 'pending'
  | 'sent'
  | 'partially_signed'
  | 'signed'
  | 'refused'
  | 'expired';

export type InvoiceStatus =
  | 'pendente'
  | 'vencido'
  | 'pago'
  | 'cancelado'
  | 'protestado';

export type InspectionType = 'entrada' | 'saida' | 'periodica';

export type TerminationType =
  | 'acordo'
  | 'unilateral_locatario'
  | 'unilateral_locador'
  | 'quebra_contratual';

export type AdjustmentIndex =
  | 'IGPM'
  | 'IPCA'
  | 'INCC'
  | 'ICV'
  | 'POUPANCA';

export interface Lease {
  id: string;
  organization_id: string;
  contract_number?: string;
  status: LeaseStatus;

  created_at: string;
  updated_at: string;
  signed_at?: string;
  activated_at?: string;
  terminated_at?: string;

  property_id?: string;
  owner_id?: string;

  tenant_id?: string;
  tenant_name: string;
  tenant_email?: string;
  tenant_phone?: string;
  tenant_cpf?: string;
  tenant_rg?: string;
  tenant_type?: 'PF' | 'PJ';
  tenant_birth_date?: string;
  tenant_marital_status?: string;
  tenant_profession?: string;
  tenant_employer?: string;
  tenant_monthly_income?: number;

  co_tenants?: string[];

  guarantor_id?: string;
  guarantor_name?: string;
  guarantor_cpf?: string;
  guarantor_phone?: string;
  guarantor_email?: string;
  guarantor_monthly_income?: number;

  witness_1_name?: string;
  witness_1_cpf?: string;
  witness_2_name?: string;
  witness_2_cpf?: string;

  guarantee_type?: GuaranteeType;
  guarantee_value?: number;
  guarantee_details?: Record<string, unknown>;
  caution_amount?: number;
  caution_payment_date?: string;
  insurance_company?: string;
  insurance_policy_number?: string;

  monthly_rent: number;
  condominium_fee?: number;
  iptu_amount?: number;
  due_day?: number;
  adjustment_index?: AdjustmentIndex;
  adjustment_period_months?: number;
  late_fee_percent?: number;
  late_interest_percent?: number;
  currency_correction?: boolean;

  start_date?: string;
  end_date?: string;
  contract_duration_months?: number;
  occupation_date?: string;
  key_delivery_date?: string;
  rental_purpose?: string;

  commission_percent?: number;
  commission_payer?: 'locador' | 'locatario' | 'ambos';

  signature_method?: string;
  signature_status?: SignatureStatus;
  signed_document_url?: string;

  evaluation_score?: number;
  evaluation_status?: EvaluationStatus;
  credit_score?: number;
  has_restrictions?: boolean;
  restriction_notes?: string;
  analysis_notes?: string;

  payment_status?: PaymentStatus;

  current_template_id?: string;
  last_rent_adjustment?: string;
  next_rent_adjustment?: string;
  renewal_count?: number;
  previous_lease_id?: string;

  // Owner
  owner_name?: string;
  owner_cpf_cnpj?: string;
  owner_email?: string;
  owner_phone?: string;
  owner_address_zip?: string;

  // Tenant address
  tenant_city?: string;
  tenant_state?: string;
  tenant_address_zip?: string;
  tenant_address_street?: string;
  tenant_address_number?: string;
  tenant_address_complement?: string;
  tenant_address_neighborhood?: string;
  tenant_previous_landlord?: string;
  tenant_previous_landlord_phone?: string;
  tenant_employer_phone?: string;
  income_proof_status?: string;

  // Guarantor spouse
  guarantor_spouse_name?: string;
  guarantor_spouse_cpf?: string;

  created_by?: string;
  updated_by?: string;

  // Joined/calculated fields
  property_title?: string;
  property_city?: string;
  property_state?: string;
  dias_restantes?: number;
  meses_restantes?: number;
}

export interface ContractTemplate {
  id: string;
  organization_id?: string;
  name: string;
  description?: string;
  category: string;
  content: string;
  variables?: string[];
  is_active: boolean;
  is_default: boolean;
  version: number;
  source_file_url?: string;
  source_file_name?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  versions?: ContractVersion[];
}

export interface ContractVersion {
  id: string;
  template_id: string;
  organization_id: string;
  version: number;
  content: string;
  variables?: string[];
  change_log?: string;
  created_by?: string;
  created_at: string;
}

export interface GeneratedContract {
  id: string;
  lease_id: string;
  template_id: string;
  organization_id: string;
  content: string;
  content_html?: string;
  pdf_url?: string;
  docx_url?: string;
  hash_sha256?: string;
  version: number;
  created_at: string;
}

export interface Signature {
  id: string;
  lease_id: string;
  organization_id: string;
  signer_type: 'locador' | 'locatario' | 'fiador' | 'co_locatario' | 'testemunha_1' | 'testemunha_2';
  signer_name: string;
  signer_email?: string;
  signer_phone?: string;
  signer_cpf?: string;
  status: 'pending' | 'sent' | 'signed' | 'refused' | 'expired';
  signed_at?: string;
  ip_address?: string;
  user_agent?: string;
  signature_hash?: string;
  document_hash?: string;
  signature_provider?: string;
  provider_signature_id?: string;
  invitation_sent_at?: string;
  invitation_method?: 'whatsapp' | 'email' | 'ambos';
  created_at: string;
}

export interface Inspection {
  id: string;
  lease_id: string;
  organization_id: string;
  inspection_type: InspectionType;
  inspection_date: string;
  inspector_name?: string;
  tenant_present?: boolean;
  owner_present?: boolean;
  items?: InspectionItem[];
  meter_readings?: MeterReading;
  notes?: string;
  report_url?: string;
  signed_by_tenant?: boolean;
  signed_by_owner?: boolean;
  created_at: string;
}

export interface InspectionItem {
  room: string;
  item: string;
  condition: 'otimo' | 'bom' | 'regular' | 'ruim' | 'inexistente';
  observation?: string;
  photo_urls?: string[];
}

export interface MeterReading {
  water_meter?: string;
  energy_meter?: string;
  gas_meter?: string;
}

export interface Invoice {
  id: string;
  lease_id: string;
  organization_id: string;
  invoice_number?: string;
  due_date: string;
  reference_month?: string;
  amount: number;
  rent_amount?: number;
  condominium_amount?: number;
  iptu_amount?: number;
  late_fee?: number;
  late_interest?: number;
  discount?: number;
  total: number;
  status: InvoiceStatus;
  payment_date?: string;
  payment_method?: string;
  payment_proof_url?: string;
  barcode?: string;
  nossonumero?: string;
  invoice_url?: string;
  pix_code?: string;
  paid_amount?: number;
  created_at: string;
}

export interface RentAdjustment {
  id: string;
  lease_id: string;
  organization_id: string;
  previous_rent: number;
  new_rent: number;
  adjustment_index: string;
  index_rate?: number;
  adjustment_date: string;
  calculated_by?: string;
  approved?: boolean;
  notification_sent?: boolean;
  created_at: string;
}

export interface LeaseTermination {
  id: string;
  lease_id: string;
  organization_id: string;
  termination_type: TerminationType;
  termination_date: string;
  fine_amount?: number;
  fine_paid?: boolean;
  days_notice?: number;
  notice_date?: string;
  reason?: string;
  key_return_date?: string;
  inspection_report_url?: string;
  settlement_document_url?: string;
  created_at: string;
}

export interface LeaseHistory {
  id: string;
  lease_id: string;
  organization_id: string;
  action: string;
  description?: string;
  field_changed?: string;
  old_value?: string;
  new_value?: string;
  user_id?: string;
  created_at: string;
}

export interface LeaseDashboardResumo {
  total: number;
  ativos: number;
  em_andamento: number;
  encerrados: number;
  receita_mensal: number;
  receita_anual: number;
  inadimplentes: number;
  atrasados: number;
  em_dia: number;
  valor_inadimplencia: number;
  vencendo_30_dias: number;
  vencendo_90_dias: number;
}

export interface LeaseTimelineEvent {
  type: 'due' | 'adjustment' | 'end';
  label: string;
  description: string;
  date: string;
  lease_id: string;
  days_until: number;
}

// Wizard state
export interface LeaseWizardState {
  currentStep: number;
  isDirty: boolean;
  isSaving: boolean;
  lastSavedAt?: string;
  leaseId?: string;
  completedSteps: number[];
  errors: Record<string, string[]>;
}

export const LEASE_STATUS_LABELS: Record<LeaseStatus, string> = {
  draft: 'Rascunho',
  cadastral_analysis: 'Análise Cadastral',
  income_analysis: 'Análise de Renda',
  pending_signatures: 'Aguardando Assinaturas',
  active: 'Ativo',
  suspended: 'Suspenso',
  terminated: 'Encerrado',
  expired: 'Expirado',
  archived: 'Arquivado',
};

export const LEASE_STATUS_COLORS: Record<LeaseStatus, string> = {
  draft: 'bg-blue-100 text-blue-700 border-blue-200',
  cadastral_analysis: 'bg-amber-100 text-amber-700 border-amber-200',
  income_analysis: 'bg-orange-100 text-orange-700 border-orange-200',
  pending_signatures: 'bg-purple-100 text-purple-700 border-purple-200',
  active: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  suspended: 'bg-red-100 text-red-700 border-red-200',
  terminated: 'bg-slate-100 text-slate-600 border-slate-200',
  expired: 'bg-gray-100 text-gray-600 border-gray-200',
  archived: 'bg-slate-100 text-slate-400 border-slate-200',
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  em_dia: 'Em Dia',
  atrasado: 'Atrasado',
  inadimplente: 'Inadimplente',
};

export const SIGNATURE_STATUS_LABELS: Record<SignatureStatus, string> = {
  pending: 'Pendente',
  sent: 'Enviado',
  partially_signed: 'Parcialmente Assinado',
  signed: 'Assinado',
  refused: 'Recusado',
  expired: 'Expirado',
};

export const ADJUSTMENT_INDICES: AdjustmentIndex[] = [
  'IGPM', 'IPCA', 'INCC', 'ICV', 'POUPANCA',
];

export const ADJUSTMENT_INDICES_LABELS: Record<AdjustmentIndex, string> = {
  IGPM: 'IGP-M (FGV)',
  IPCA: 'IPCA (IBGE)',
  INCC: 'INCC (FGV)',
  ICV: 'ICV (Dieese)',
  POUPANCA: 'Poupança',
};

export const GUARANTEE_LABELS: Record<GuaranteeType, string> = {
  fiador: 'Fiador',
  seguro_fianca: 'Seguro Fiança',
  deposito_caucao: 'Depósito Caução',
  titulo_capitalizacao: 'Título de Capitalização',
  sem: 'Sem Garantia',
};

export const WIZARD_STEPS = [
  { id: 1, label: 'Locatário', icon: 'User' },
  { id: 2, label: 'Análise Cadastral', icon: 'ShieldCheck' },
  { id: 3, label: 'Renda e Documentos', icon: 'Briefcase' },
  { id: 4, label: 'Imóvel', icon: 'Building2' },
  { id: 5, label: 'Locador/Proprietário', icon: 'Home' },
  { id: 6, label: 'Garantia', icon: 'Lock' },
  { id: 7, label: 'Condições Comerciais', icon: 'DollarSign' },
  { id: 8, label: 'Vistoria', icon: 'ClipboardCheck' },
  { id: 9, label: 'Gerar Contrato', icon: 'FileText' },
  { id: 10, label: 'Assinatura', icon: 'PenTool' },
  { id: 11, label: 'Revisão e Ativar', icon: 'CheckCircle' },
] as const;
