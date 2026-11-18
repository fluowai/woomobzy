export type UserProfileRole =
  | 'platform_owner'
  | 'platform_admin'
  | 'superadmin'
  | 'reseller_admin'
  | 'admin'
  | 'gerente'
  | 'broker'
  | 'assistente'
  | 'user'
  | 'customer_user';

export type NavigationContext =
  | 'urban'
  | 'rural'
  | 'superadmin'
  | 'megaadmin'
  | 'woocontrol'
  | 'portal';

export interface NavigationSubItem {
  id: string;
  label: string;
  path: string;
  exact?: boolean;
}

export interface NavigationItem {
  id: string;
  label: string;
  path: string;
  iconName: string;
  exact?: boolean;
  children?: NavigationSubItem[];
  badge?: string | number;
}

export function normalizeProfileRole(role?: string | null): UserProfileRole {
  const r = String(role || '').toLowerCase().trim().replace(/[\s-]/g, '_');
  if (r === 'platform_owner' || r === 'platformowner') return 'platform_owner';
  if (r === 'platform_admin' || r === 'platformadmin' || r === 'megaadmin' || r === 'mega_admin') return 'platform_admin';
  if (r === 'superadmin' || r === 'super_admin' || r === 'reseller_admin' || r === 'reselleradmin') return 'superadmin';
  if (r === 'admin' || r === 'administrator' || r === 'gestor') return 'admin';
  if (r === 'gerente' || r === 'manager' || r === 'commercialmanager') return 'gerente';
  if (r === 'broker' || r === 'corretor' || r === 'agent') return 'broker';
  if (r === 'assistente' || r === 'assistant' || r === 'atendente') return 'assistente';
  return 'user';
}

export function getProfileDisplayTitle(
  role?: string | null,
  context: NavigationContext = 'urban',
  organizationName?: string | null
): string {
  const normalizedRole = normalizeProfileRole(role);
  switch (normalizedRole) {
    case 'platform_owner':
      return 'Master (Woo Control)';
    case 'platform_admin':
      return 'Mega Admin Global';
    case 'superadmin':
      return 'Revenda White Label';
    case 'admin':
      return context === 'rural' ? 'Admin da imobiliária • Rural' : 'Admin da imobiliária • Urbano';
    case 'gerente':
      return 'Gerente Comercial';
    case 'broker':
      return 'Corretor';
    case 'assistente':
      return 'Atendente';
    case 'user':
    case 'customer_user':
      return 'Usuário autenticado';
    default:
      return organizationName || 'Wootech CRM';
  }
}

/**
 * Retorna os itens de navegação canônicos para cada perfil e contexto,
 * respeitando estritamente a ordem e agrupamentos do documento de requisitos.
 */
export function getNavigationForProfile(
  role?: string | null,
  context: NavigationContext = 'urban',
  options?: {
    isRural?: boolean;
    hasHybridAccess?: boolean;
  }
): NavigationItem[] {
  const normalizedRole = normalizeProfileRole(role);
  const prefix = context === 'rural' ? '/rural' : '/urban';
  const propLabel = context === 'rural' ? 'Propriedades' : 'Imóveis';
  const propIcon = context === 'rural' ? 'Trees' : 'Building2';

  // 1. Master (PLATFORM_OWNER, /woo-control)
  if (normalizedRole === 'platform_owner' && context === 'woocontrol') {
    return [
      {
        id: 'overview',
        label: 'Visão geral',
        path: '/woo-control',
        iconName: 'Activity',
        exact: true,
      },
      {
        id: 'network',
        label: 'Rede e licenças',
        path: '/woo-control/resellers',
        iconName: 'Network',
        children: [
          { id: 'resellers', label: 'Revendas Whitelabel', path: '/woo-control/resellers' },
          { id: 'customers', label: 'Clientes Imobiliárias', path: '/woo-control/customers' },
          { id: 'products', label: 'Produtos & Planos', path: '/woo-control/products' },
          { id: 'licensing', label: 'Licenciamento', path: '/woo-control/licensing' },
        ],
      },
      {
        id: 'infrastructure',
        label: 'Infraestrutura',
        path: '/woo-control/deployments',
        iconName: 'Server',
        children: [
          { id: 'deployments', label: 'Implantações', path: '/woo-control/deployments' },
          { id: 'snapshots', label: 'Snapshots', path: '/woo-control/snapshots' },
          { id: 'releases', label: 'Releases', path: '/woo-control/releases' },
          { id: 'stack-generator', label: 'Gerador de Stack', path: '/woo-control/stack-generator' },
        ],
      },
      {
        id: 'operations',
        label: 'Operação e suporte',
        path: '/woo-control/support',
        iconName: 'Headset',
        children: [
          { id: 'support', label: 'Central de Suporte', path: '/woo-control/support' },
          { id: 'academy', label: 'Academia', path: '/woo-control/academy' },
        ],
      },
      {
        id: 'finance',
        label: 'Financeiro global',
        path: '/woo-control/revenue',
        iconName: 'DollarSign',
      },
      {
        id: 'governance',
        label: 'Governança',
        path: '/woo-control/security',
        iconName: 'ShieldAlert',
        children: [
          { id: 'security', label: 'Segurança', path: '/woo-control/security' },
          { id: 'audit', label: 'Auditoria', path: '/woo-control/audit' },
          { id: 'settings', label: 'Configurações', path: '/woo-control/settings' },
        ],
      },
    ];
  }

  // 2. Mega Admin (PLATFORM_ADMIN, /megaadmin)
  if (
    (normalizedRole === 'platform_admin' || normalizedRole === 'platform_owner') &&
    context === 'megaadmin'
  ) {
    return [
      {
        id: 'overview',
        label: 'Visão geral',
        path: '/megaadmin',
        iconName: 'LayoutDashboard',
        exact: true,
      },
      {
        id: 'organizations',
        label: 'Organizações',
        path: '/megaadmin/tenants',
        iconName: 'Building2',
        children: [
          { id: 'all-tenants', label: 'Todas as Imobiliárias', path: '/megaadmin/tenants' },
          { id: 'resellers', label: 'Revendas', path: '/megaadmin/resellers' },
          { id: 'direct-clients', label: 'Clientes Diretos', path: '/megaadmin/direct-clients' },
        ],
      },
      {
        id: 'plans-billing',
        label: 'Planos e cobrança',
        path: '/megaadmin/plans',
        iconName: 'CreditCard',
        children: [
          { id: 'plans', label: 'Planos & Assinaturas', path: '/megaadmin/plans' },
          { id: 'billing', label: 'Billing & Receita', path: '/megaadmin/billing' },
        ],
      },
      {
        id: 'infrastructure',
        label: 'Infraestrutura',
        path: '/megaadmin/monitoring',
        iconName: 'Activity',
        children: [
          { id: 'monitoring', label: 'Monitoramento & Saúde', path: '/megaadmin/monitoring' },
          { id: 'analytics', label: 'Analytics Global', path: '/megaadmin/analytics' },
          { id: 'storage', label: 'Storage Intelligence', path: '/megaadmin/storage-intelligence' },
          { id: 'importer', label: 'Smart Importer', path: '/megaadmin/importer' },
        ],
      },
      {
        id: 'support',
        label: 'Suporte',
        path: '/megaadmin/support',
        iconName: 'HelpCircle',
      },
      {
        id: 'settings',
        label: 'Configurações',
        path: '/megaadmin/settings',
        iconName: 'Settings',
        children: [
          { id: 'global-settings', label: 'Configurações Globais', path: '/megaadmin/settings' },
          { id: 'domains', label: 'Domínios & SSL', path: '/megaadmin/domains' },
          { id: 'feature-flags', label: 'Recursos por Plano', path: '/megaadmin/feature-flags' },
          { id: 'team', label: 'Equipe Master', path: '/megaadmin/team' },
          { id: 'audit-log', label: 'Trilha de Auditoria', path: '/megaadmin/audit-log' },
        ],
      },
    ];
  }

  // 3. Revenda (RESELLER_ADMIN, /superadmin)
  if (
    (normalizedRole === 'superadmin' || normalizedRole === 'platform_admin' || normalizedRole === 'platform_owner') &&
    context === 'superadmin'
  ) {
    return [
      {
        id: 'overview',
        label: 'Visão geral',
        path: '/superadmin',
        iconName: 'LayoutDashboard',
        exact: true,
      },
      {
        id: 'client-tenants',
        label: 'Imobiliárias clientes',
        path: '/superadmin/tenants',
        iconName: 'Building2',
      },
      {
        id: 'plans-billing',
        label: 'Planos e faturamento',
        path: '/superadmin/plans',
        iconName: 'CreditCard',
        children: [
          { id: 'plans', label: 'Planos & Pacotes', path: '/superadmin/plans' },
          { id: 'billing', label: 'Billing & Faturamento', path: '/superadmin/billing' },
        ],
      },
      {
        id: 'support',
        label: 'Suporte',
        path: '/superadmin/support',
        iconName: 'HelpCircle',
      },
      {
        id: 'my-reseller',
        label: 'Minha revenda',
        path: '/superadmin/settings',
        iconName: 'Settings',
        children: [
          { id: 'brand', label: 'Marca & Configurações', path: '/superadmin/settings' },
          { id: 'domains', label: 'Domínio & SSL', path: '/superadmin/domains' },
          { id: 'team', label: 'Equipe da Revenda', path: '/superadmin/team' },
          { id: 'connections', label: 'Conexões & Canais', path: '/superadmin/connection-credits' },
          { id: 'features', label: 'Feature Flags', path: '/superadmin/feature-flags' },
        ],
      },
    ];
  }

  // 4. Corretor (broker)
  if (normalizedRole === 'broker') {
    return [
      {
        id: 'my-panel',
        label: 'Meu painel',
        path: prefix,
        iconName: 'Home',
        exact: true,
      },
      {
        id: 'attendances',
        label: 'Atendimentos',
        path: `${prefix}/whatsapp`,
        iconName: 'MessageSquare',
      },
      {
        id: 'my-funnel',
        label: 'Meu funil',
        path: `${prefix}/kanban`,
        iconName: 'Briefcase',
      },
      {
        id: 'properties',
        label: propLabel,
        path: `${prefix}/properties`,
        iconName: propIcon,
      },
      {
        id: 'my-calendar',
        label: 'Minha agenda',
        path: `${prefix}/agenda`,
        iconName: 'Calendar',
      },
    ];
  }

  // 5. Atendente (assistente)
  if (normalizedRole === 'assistente') {
    return [
      {
        id: 'today',
        label: 'Hoje',
        path: prefix,
        iconName: 'Calendar',
        exact: true,
      },
      {
        id: 'inbox',
        label: 'Caixa de entrada',
        path: `${prefix}/whatsapp`,
        iconName: 'MessageSquare',
      },
      {
        id: 'waitlist',
        label: 'Fila',
        path: `${prefix}/waitlist`,
        iconName: 'Clock',
      },
      {
        id: 'registrations',
        label: 'Cadastros',
        path: `${prefix}/crm`,
        iconName: 'Users',
      },
      {
        id: 'properties',
        label: propLabel,
        path: `${prefix}/properties`,
        iconName: propIcon,
      },
    ];
  }

  // 6. Gerente comercial (gerente)
  if (normalizedRole === 'gerente') {
    return [
      {
        id: 'overview',
        label: 'Visão geral',
        path: prefix,
        iconName: 'LayoutDashboard',
        exact: true,
      },
      {
        id: 'attendance',
        label: 'Atendimento',
        path: `${prefix}/whatsapp`,
        iconName: 'MessageSquare',
      },
      {
        id: 'commercial',
        label: 'Comercial',
        path: `${prefix}/crm`,
        iconName: 'Briefcase',
        children: [
          { id: 'funnel', label: 'Funil da Equipe', path: `${prefix}/kanban` },
          { id: 'leads', label: 'Leads & Clientes', path: `${prefix}/crm` },
          { id: 'agenda', label: 'Agenda Geral', path: `${prefix}/agenda` },
        ],
      },
      {
        id: 'properties',
        label: propLabel,
        path: `${prefix}/properties`,
        iconName: propIcon,
      },
      {
        id: 'reports',
        label: 'Relatórios',
        path: `${prefix}/reports`,
        iconName: 'PieChart',
      },
    ];
  }

  // 7. Usuário genérico autenticado (user / customer_user) - Acesso aos portais ou tela pendente
  if (normalizedRole === 'user' || normalizedRole === 'customer_user') {
    return [
      {
        id: 'account-access',
        label: 'Acesso à conta',
        path: '/acesso-pendente',
        iconName: 'User',
        exact: true,
      },
    ];
  }

  // 8. Admin Urbano (/urban)
  if (context === 'urban') {
    return [
      {
        id: 'overview',
        label: 'Visão geral',
        path: '/urban',
        iconName: 'LayoutDashboard',
        exact: true,
        children: [
          { id: 'dashboard', label: 'Dashboard', path: '/urban', exact: true },
          { id: '360', label: 'Visão 360°', path: '/urban/360' },
          { id: 'reports', label: 'Relatórios & BI', path: '/urban/reports' },
        ],
      },
      {
        id: 'attendance',
        label: 'Atendimento',
        path: '/urban/whatsapp',
        iconName: 'MessageSquare',
        children: [
          { id: 'whatsapp', label: 'WhatsApp', path: '/urban/whatsapp' },
          { id: 'instagram', label: 'Instagram Direct', path: '/urban/instagram' },
          { id: 'email', label: 'Central de E-mail', path: '/urban/email' },
          { id: 'waitlist', label: 'Fila de Espera', path: '/urban/waitlist' },
        ],
      },
      {
        id: 'commercial',
        label: 'Comercial',
        path: '/urban/crm',
        iconName: 'Briefcase',
        children: [
          { id: 'leads', label: 'Leads CRM', path: '/urban/crm' },
          { id: 'kanban', label: 'Funil / Kanban', path: '/urban/kanban' },
          { id: 'clients', label: 'Clientes & Proprietários', path: '/urban/clients' },
          { id: 'captacao', label: 'Funil de Captação', path: '/urban/captacao' },
          { id: 'agenda', label: 'Agenda', path: '/urban/agenda' },
          { id: 'matchmaking', label: 'Matchmaking 360°', path: '/urban/matchmaking' },
        ],
      },
      {
        id: 'properties',
        label: 'Imóveis',
        path: '/urban/properties',
        iconName: 'Building2',
        children: [
          { id: 'catalog', label: 'Catálogo de Imóveis', path: '/urban/properties' },
          { id: 'loteamentos', label: 'Empreendimentos & Lotes', path: '/urban/loteamentos' },
          { id: 'chaves', label: 'Controle de Chaves', path: '/urban/chaves' },
          { id: 'exportador', label: 'Exportador de Portais', path: '/urban/exportador' },
        ],
      },
      {
        id: 'rental',
        label: 'Locação',
        path: '/urban/locacao',
        iconName: 'Key',
        children: [
          { id: 'rental-management', label: 'Gestão de Contratos', path: '/urban/locacao', exact: true },
          { id: 'contract-editor', label: 'Editor de Contratos', path: '/urban/locacao/contrato' },
          { id: 'bordero', label: 'Repasses & Borderô', path: '/urban/locacao/bordero' },
          { id: 'condominios', label: 'Adm. Condomínios', path: '/urban/condominios' },
        ],
      },
      {
        id: 'marketing',
        label: 'Marketing',
        path: '/urban/site',
        iconName: 'Globe',
        children: [
          { id: 'site', label: 'Sites e Páginas', path: '/urban/site' },
          { id: 'landing-pages', label: 'Criador de Páginas (LP)', path: '/urban/landing-pages' },
          { id: 'quiz', label: 'Quiz Interativo', path: '/urban/quiz' },
          { id: 'campaigns', label: 'Campanhas & Disparos', path: '/urban/whatsapp/campaigns' },
          { id: 'ai', label: 'Central de IA', path: '/urban/ai' },
        ],
      },
      {
        id: 'finance-legal',
        label: 'Financeiro e Jurídico',
        path: '/urban/financeiro',
        iconName: 'DollarSign',
        children: [
          { id: 'finance', label: 'Financeiro Urbano', path: '/urban/financeiro' },
          { id: 'cobranca', label: 'Cobranças & Boletos', path: '/urban/cobranca' },
          { id: 'contracts', label: 'Contratos & Jurídico', path: '/urban/contracts' },
          { id: 'dataroom', label: 'Data Room', path: '/urban/dataroom' },
          { id: 'documents', label: 'Gestão de Documentos', path: '/urban/documentos' },
          { id: 'compliance', label: 'Compliance', path: '/urban/compliance' },
          { id: 'fintech', label: 'Fintech Hub', path: '/urban/fintech' },
          { id: 'clube', label: 'Clube Imobzy', path: '/urban/clube' },
        ],
      },
      {
        id: 'settings',
        label: 'Configurações',
        path: '/urban/settings',
        iconName: 'Settings',
        children: [
          { id: 'system-settings', label: 'Geral da Imobiliária', path: '/urban/settings' },
          { id: 'team', label: 'Equipe & Corretores', path: '/urban/users' },
          { id: 'connections', label: 'Conexões & Canais', path: '/urban/connections' },
        ],
      },
    ];
  }

  // 9. Admin Rural (/rural)
  return [
    {
      id: 'overview',
      label: 'Visão geral',
      path: '/rural',
      iconName: 'LayoutDashboard',
      exact: true,
      children: [
        { id: 'dashboard', label: 'Dashboard Rural', path: '/rural', exact: true },
        { id: '360', label: 'Visão 360° Agro', path: '/rural/360' },
        { id: 'reports', label: 'Relatórios & BI Rural', path: '/rural/reports' },
      ],
    },
    {
      id: 'attendance',
      label: 'Atendimento',
      path: '/rural/whatsapp',
      iconName: 'MessageSquare',
      children: [
        { id: 'whatsapp', label: 'WhatsApp', path: '/rural/whatsapp' },
        { id: 'instagram', label: 'Instagram Direct', path: '/rural/instagram' },
        { id: 'email', label: 'Central de E-mail', path: '/rural/email' },
        { id: 'waitlist', label: 'Fila de Espera', path: '/rural/waitlist' },
      ],
    },
    {
      id: 'commercial',
      label: 'Comercial',
      path: '/rural/crm',
      iconName: 'Briefcase',
      children: [
        { id: 'investors', label: 'Investidores & Leads', path: '/rural/crm' },
        { id: 'kanban', label: 'Funil / CRM Agro', path: '/rural/kanban' },
        { id: 'clients', label: 'Clientes & Proprietários', path: '/rural/clients' },
        { id: 'agenda', label: 'Agenda de Vistorias', path: '/rural/agenda' },
        { id: 'matchmaking', label: 'Matchmaking 360°', path: '/rural/matchmaking' },
      ],
    },
    {
      id: 'properties',
      label: 'Propriedades',
      path: '/rural/properties',
      iconName: 'Trees',
      children: [
        { id: 'catalog', label: 'Fazendas & Imóveis', path: '/rural/properties' },
        { id: 'cad-tecnico', label: 'Cadastro Técnico Rural', path: '/rural/cadastro-tecnico' },
        { id: 'maps', label: 'Inteligência Territorial (GIS)', path: '/rural/territorio/maps' },
        { id: 'car', label: 'Localizar CAR / SIGEF', path: '/rural/territorio/localizar-car' },
        { id: 'valuation', label: 'Valuation Rural', path: '/rural/territorio/valuation' },
        { id: 'due-diligence', label: 'Due Diligence Fundiária', path: '/rural/territorio/due-diligence' },
        { id: 'dossie', label: 'Dossiê Inteligente', path: '/rural/territorio/dossie' },
        { id: 'exportador', label: 'Exportador de Portais', path: '/rural/exportador' },
      ],
    },
    {
      id: 'leasing',
      label: 'Arrendamento',
      path: '/rural/financeiro-advanced',
      iconName: 'Key',
      children: [
        { id: 'arrendamento', label: 'Contratos & Parcelas', path: '/rural/financeiro-advanced' },
      ],
    },
    {
      id: 'marketing',
      label: 'Marketing',
      path: '/rural/site',
      iconName: 'Globe',
      children: [
        { id: 'site', label: 'Sites e Páginas', path: '/rural/site' },
        { id: 'landing-pages', label: 'Criador de Páginas (LP)', path: '/rural/landing-pages' },
        { id: 'quiz', label: 'Quiz Qualificação Agro', path: '/rural/quiz' },
        { id: 'campaigns', label: 'Campanhas & Disparos', path: '/rural/whatsapp/campaigns' },
        { id: 'ai', label: 'Central de IA Agro', path: '/rural/ai' },
      ],
    },
    {
      id: 'finance-legal',
      label: 'Financeiro e Jurídico',
      path: '/rural/financial',
      iconName: 'DollarSign',
      children: [
        { id: 'financial', label: 'Metas & Financeiro', path: '/rural/financial' },
        { id: 'contracts', label: 'Contratos Agrários', path: '/rural/contracts' },
        { id: 'dataroom', label: 'Data Room Fundiário', path: '/rural/dataroom' },
        { id: 'documents', label: 'Gestão de Documentos', path: '/rural/documentos' },
      ],
    },
    {
      id: 'settings',
      label: 'Configurações',
      path: '/rural/settings',
      iconName: 'Settings',
      children: [
        { id: 'settings-agro', label: 'Geral da Imobiliária', path: '/rural/settings' },
        { id: 'team', label: 'Equipe & Corretores', path: '/rural/users' },
        { id: 'connections', label: 'Conexões & Canais', path: '/rural/connections' },
      ],
    },
  ];
}

/**
 * Navegação simplificada para Portais Externos
 */
export function getPortalNavigation(portalType: 'proprietario' | 'comprador' | 'locatario'): NavigationItem[] {
  switch (portalType) {
    case 'proprietario':
      return [
        { id: 'properties', label: 'Meus imóveis', path: '/portal-proprietario', iconName: 'Home', exact: true },
        { id: 'docs', label: 'Documentos e contratos', path: '/portal-proprietario?tab=docs', iconName: 'FileText' },
        { id: 'repasses', label: 'Repasses', path: '/portal-proprietario?tab=financeiro', iconName: 'DollarSign' },
      ];
    case 'comprador':
      return [
        { id: 'explore', label: 'Explorar imóveis', path: '/portal-comprador', iconName: 'Home', exact: true },
        { id: 'favorites', label: 'Favoritos', path: '/portal-comprador?tab=favoritos', iconName: 'Heart' },
        { id: 'proposals', label: 'Propostas', path: '/portal-comprador?tab=propostas', iconName: 'FileText' },
      ];
    case 'locatario':
      return [
        { id: 'contracts', label: 'Meus contratos', path: '/portal-locatario', iconName: 'FileText', exact: true },
        { id: 'boletos', label: 'Boletos e PIX', path: '/portal-locatario?tab=boletos', iconName: 'CreditCard' },
        { id: 'history', label: 'Histórico de pagamentos', path: '/portal-locatario?tab=historico', iconName: 'Clock' },
      ];
  }
}

