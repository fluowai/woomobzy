# Resumo Executivo — Reorganização dos Painéis Internos e Portais Externos
**Wootech CRM Imobiliário**  
*Data de Conclusão:* 18 de Novembro de 2026  
*Status da Entrega:* Concluído, validado e sincronizado com o repositório remoto (`origin/main`, commit `da4d443`).

---

## 1. Visão Geral da Entrega

A reorganização dos painéis internos e portais externos do Wootech CRM Imobiliário foi implementada integralmente com base nas especificações do documento de auditoria (`WOOTECH_IMOB_AUDITORIA_ACESSOS_E_MENUS.md`), nos 10 mockups de interface e nos requisitos contratuais de autorização e experiência do usuário.

### Principais Pilares Implementados:
1. **Definição Centralizada de Navegação (`src/lib/navigationConfig.ts`):** Uma única fonte da verdade para perfis, rotas canônicas, capacidades (`requiredRoles`, `context`), ordenação estrita de itens e subitens e normalização de papéis corporativos.
2. **Design System White (#FFFFFF):** Adoção rigorosa do novo padrão visual com superfícies brancas (`#FFFFFF`), bordas sutis (`#E5E7EB`), tipografia escura primária (`#182230`), textos secundários (`#526071`) e realce em laranja Wootech (`#FF6A00` / `bg-orange-50/70`).
3. **Shells e Layouts Reestruturados:** `UrbanLayout`, `RuralLayout`, `WorkspaceTopBar`, `SuperAdminLayout`, `MegaAdminLayout`, `WooControlLayout` e o novo `PortalLayout` para clientes e signatários externos.
4. **Tratamento de Usuário Sem Vínculo:** Encaminhamento imediato para a tela dedicada `/acesso-pendente` ("Seu acesso / Vínculo da conta / Aguardando acesso") com opção de logout direto.
5. **Modo Suporte na Revenda:** Inclusão do botão de ação com ícone de chave ("Acessar em modo suporte") em `/superadmin/tenants` e banner de sessão delegada com "Encerrar acesso".
6. **Autorizações no Backend:** Flexibilização das operações de criação e edição de imóveis para gerentes (`verifyManagerOrAdmin`) e escopo estrito de leads para corretores (`broker`).

---

## 2. Inventário de Telas e Rotas Canônicas Mapeadas

### 2.1 Master (`PLATFORM_OWNER`, Rota base `/woo-control`)
- **Tela Inicial:** Visão geral da plataforma (MRR global, organizações, licenças e saúde do ecossistema).
- **Menu Principal em Ordem Estrita:**
  1. `Visão geral` (`/woo-control`)
  2. `Rede e licenças` (`/woo-control/tenants` — subitens: Imobiliárias, Planos, Domínios)
  3. `Infraestrutura` (`/woo-control/infra` — subitens: Servidores & Docker, Banco de Dados, MinIO Storage, Fila RabbitMQ)
  4. `Operação e suporte` (`/woo-control/support` — subitens: Tickets & SLAs, Chat Operacional, Base de Conhecimento)
  5. `Financeiro global` (`/woo-control/billing` — subitens: Faturamento Global, Inadimplência, Repasses de Revenda)
  6. `Governança` (`/woo-control/governance` — subitens: Equipe Master, Trilha de Auditoria, Segurança & Compliance)

### 2.2 Mega Admin (`PLATFORM_ADMIN` / `megaadmin`, Rota base `/megaadmin`)
- **Tela Inicial:** Resumo operacional e atalhos de monitoramento de instâncias.
- **Menu Principal em Ordem Estrita:**
  1. `Visão geral` (`/megaadmin`)
  2. `Organizações` (`/megaadmin/tenants` — subitens: Imobiliárias ativas, Em implantação, Pausadas)
  3. `Planos e cobrança` (`/megaadmin/plans` — subitens: Catálogo de Planos, Cobranças & Faturas, Gateways)
  4. `Infraestrutura` (`/megaadmin/infra` — subitens: Status dos Serviços, Logs de Sistema, Backups)
  5. `Suporte` (`/megaadmin/support` — subitens: Chamados técnicos, Atendimento revendas)
  6. `Configurações` (`/megaadmin/settings` — subitens: Feature Flags, Domínios & SSL, Equipe MegaAdmin, Auditoria)

### 2.3 Revenda White Label (`RESELLER_ADMIN` / `superadmin`, Rota base `/superadmin`)
- **Tela Inicial:** Carteira de clientes com filtros de status e operação.
- **Menu Principal em Ordem Estrita:**
  1. `Visão geral` (`/superadmin`)
  2. `Imobiliárias clientes` (`/superadmin/tenants` — listagem com botão laranja "Acessar em modo suporte" e ícone de chave)
  3. `Planos e faturamento` (`/superadmin/plans` — subitens: Planos oferecidos, Faturamento da carteira)
  4. `Suporte` (`/superadmin/support` — tickets das imobiliárias da carteira)
  5. `Minha revenda` (`/superadmin/settings` — subitens: Identidade & Marca, Domínio personalizado, Minha equipe, Integrações)

### 2.4 Admin Imobiliária — Urbano (`admin` / `admin_urbano`, Rota base `/urban`)
- **Tela Inicial:** Leads em aberto, visitas agendadas, imóveis ativos, agenda de visitas do dia e negociações recentes.
- **Menu Principal em 8 Macro Áreas:**
  1. `Visão geral` (`/urban` — subitens: Painel do dia, Visão 360°, Business Intelligence)
  2. `Atendimento` (`/urban/atendimento` — subitens: Caixa de entrada, Fila de distribuição, Meus atendimentos, Automações & Chatbots)
  3. `Comercial` (`/urban/crm` — subitens: Funil de vendas, Leads & Contatos, Visitas & Agenda, Propostas comerciais)
  4. `Imóveis` (`/urban/imoveis` — subitens: Catálogo de imóveis, Empreendimentos, Gestão de chaves, Portais & Publicação)
  5. `Locação` (`/urban/locacao` — subitens: Contratos ativos, Cobranças & Boletos, Repasses a proprietários, Condomínios & Vistorias)
  6. `Marketing` (`/urban/marketing` — subitens: Campanhas & Disparos, Criador de Landing Pages, Templates de anúncios, Central de IA Criativa)
  7. `Financeiro e Jurídico` (`/urban/financas` — subitens: Contas a pagar/receber, Conciliação bancária, Dossiês jurídicos, Assinaturas digitais)
  8. `Configurações` (`/urban/configuracoes` — subitens: Dados da imobiliária, Equipe & Corretores, Metas & Comissões, Canais de comunicação, Integrações gerais)

### 2.5 Admin Imobiliária — Rural (`admin_rural`, Rota base `/rural`)
- **Tela Inicial:** Captações, investidores qualificados, propriedades ativas, agenda de vistorias técnicas e propriedades em análise documental/due diligence.
- **Menu Principal em 8 Macro Áreas:**
  1. `Visão geral` (`/rural` — subitens: Painel rural, Radar do agronegócio, BI & Indicadores)
  2. `Atendimento` (`/rural/atendimento` — subitens: Caixa de entrada, Atendimento a investidores, Fila técnica)
  3. `Comercial` (`/rural/crm` — subitens: Funil de captação, Investidores & Fundos, Visitas & Vistorias, Propostas de compra)
  4. `Propriedades` (`/rural/propriedades` — subitens: Catálogo de fazendas, Geointeligência CAR & SIGEF, Mapa territorial, Dossiê técnico & Valuation)
  5. `Arrendamento` (`/rural/arrendamento` — subitens: Contratos de arrendamento, Parcelas & Sacas, Repasses & Retenções)
  6. `Marketing` (`/rural/marketing` — subitens: Campanhas agro, Landing pages de fazendas, Portais rurais, Central IA Agro)
  7. `Financeiro e Jurídico` (`/rural/financas` — subitens: Fluxo de caixa agro, Contratos & Garantias, Due diligence fundiária, Assinatura eletrônica)
  8. `Configurações` (`/rural/configuracoes` — subitens: Dados da empresa, Equipe agro, Parâmetros técnicos, Integrações & APIs)

### 2.6 Gerente Comercial (`gerente` / `manager`)
- **Tela Inicial:** Visão consolidada do funil de vendas, atendimento e agenda de toda a equipe.
- **Menu Principal em Ordem Estrita:**
  1. `Visão geral` (`/urban` ou `/rural`)
  2. `Atendimento` (`/urban/atendimento` — Fila, redistribuição e conversas da equipe)
  3. `Comercial` (`/urban/crm` — Funil geral, leads da equipe, propostas, agenda consolidada)
  4. `Imóveis` ou `Propriedades` (`/urban/imoveis` ou `/rural/propriedades` — com permissão de criação e edição liberada)
  5. `Relatórios` (`/urban/relatorios` — Desempenho da equipe, conversão por corretor, tempo de resposta)

### 2.7 Corretor (`broker` / `corretor`)
- **Tela Inicial:** "Meu painel" (Meus leads atribuídos, Retornos de hoje, Próximas visitas, Tabela de leads com etapa e Minha agenda do dia).
- **Menu Principal em Ordem Estrita (5 Itens Exclusivos):**
  1. `Meu painel` (`/urban` ou `/rural`)
  2. `Atendimentos` (`/urban/atendimento`)
  3. `Meu funil` (`/urban/crm`)
  4. `Imóveis` ou `Propriedades` (`/urban/imoveis` ou `/rural/propriedades`)
  5. `Minha agenda` (`/urban/agenda`)
- *Nota:* Sem acesso a configurações globais, financeiro, marketing amplo ou equipe. Integração individual Órulo disponível apenas no menu de conta quando ativada.

### 2.8 Atendente (`assistente` / `atendente`)
- **Tela Inicial:** "Fila de atendimento" (Conversas aguardando e em atendimento por canal com botão "Assumir atendimento").
- **Menu Principal em Ordem Estrita (5 Itens Exclusivos):**
  1. `Hoje` (`/urban` ou `/rural`)
  2. `Caixa de entrada` (`/urban/atendimento`)
  3. `Fila` (`/urban/fila`)
  4. `Cadastros` (`/urban/cadastros` — criação rápida de leads e contatos)
  5. `Imóveis` ou `Propriedades` (`/urban/imoveis` ou `/rural/propriedades` — consulta de catálogo e chaves)

### 2.9 Portais Externos de Clientes e Signatários
Layout isolado (`PortalLayout`), sem a barra lateral administrativa do CRM.
- **Portal do Proprietário (`/portal-proprietario`):** Meus imóveis, Próximas visitas, Repasses, Documentos e contratos.
- **Portal do Comprador (`/portal-comprador`):** Explorar imóveis, Lançamentos, Oportunidades, Meus favoritos e Propostas.
- **Portal do Locatário (`/portal-locatario`):** Boletos e PIX, Histórico de cobranças, Meus contratos e Chamados de manutenção.
- **Portal do Signatário (`/sign/:token`):** Revisão do documento em 3 etapas (1. Revisar documento, 2. Assinar, 3. Concluir).

### 2.10 Usuário Autenticado Genérico (`user` / `CUSTOMER_USER`)
- **Rota Canônica:** `/acesso-pendente`
- **Conteúdo da Tela:** Card centralizado "Seu acesso / Vínculo da conta / Aguardando acesso — Seu vínculo com a conta está em análise. Você será avisado assim que o acesso for liberado." com botão explícito "Sair" que executa o logout e limpa os tokens da sessão.

---

## 3. Divergências Encontradas entre Código e Mockups & Decisões Adotadas

| Elemento / Tela | Comportamento no Código Pré-existente | Ilustração nos Mockups | Decisão Adotada na Implementação |
| :--- | :--- | :--- | :--- |
| **Padrão Visual dos Menus e Topbars** | Menus com fundo cinza escuro ou gradientes pretos (`slate-900`) e ícones em cores variadas. | Mockups 1 a 10 usam 100% fundo branco (`#FFFFFF`), texto escuro (`#182230`), bordas suaves (`#E5E7EB`) e destaques em laranja (`#FF6A00`). | **Alinhado com os Mockups:** Todos os layouts (`UrbanLayout`, `RuralLayout`, `WorkspaceTopBar`, `SuperAdminLayout`, `MegaAdminLayout`, `WooControlLayout`, `PortalLayout`) foram convertidos para o White Design System. |
| **Itens de Menu do Corretor** | O corretor visualizava os mesmos 8 grupos do administrador com diversos itens desabilitados ou tela 403. | Mockup 1 ilustra exatamente 5 itens verticais: *Meu painel*, *Atendimentos*, *Meu funil*, *Imóveis*, *Minha agenda*. | **Implementado via Capacidades:** O corretor recebe estritamente os 5 itens funcionais no menu lateral, eliminando ruído e tentativas de navegação indevida. |
| **Itens de Menu do Atendente** | Visualizava o menu completo de atendimento e marketing com permissões fragmentadas. | Mockup 6 ilustra exatamente 5 itens verticais: *Hoje*, *Caixa de entrada*, *Fila*, *Cadastros*, *Imóveis*. | **Implementado via Capacidades:** Atendentes recebem exclusivamente as 5 abas de triagem, fila e consulta. |
| **Visualização de Leads por Corretor na API** | O endpoint `GET /api/crm/leads` retornava todos os leads da organização se o usuário estivesse autenticado. | Mockup 1 e requisitos especificam que o corretor gerencia apenas os seus leads atribuídos. | **Ajustado no Backend:** Em `server/api/crm/leads.routes.js`, quando `req.userRole === 'broker'`, o filtro `assigned_to = req.userId` é aplicado por padrão, garantindo isolamento de carteira. |
| **Criação e Edição de Imóveis por Gerentes** | Rotas `POST /api/properties` e `PUT /api/properties/:id` exigiam exclusivamente `verifyAdmin`. | Gerentes comerciais precisam cadastrar e aprovar atualizações de imóveis e empreendimentos. | **Ajustado no Backend:** Atualizado para `verifyManagerOrAdmin` em `server/api/properties/index.js`. A exclusão (`DELETE`) permanece restrita ao administrador da imobiliária (`verifyAdmin`). |
| **Entrada em Modo Suporte da Revenda** | Botão genérico de login na listagem de tenants. | Mockup 8 ilustra link laranja com ícone de chave: "Acessar em modo suporte". | **Implementado em `TenantManager.tsx`:** Botão estilizado com ícone de chave em `#FF6A00`, acionando a API de impersonation e redirecionando para a conta com banner contextual. |
| **Banner de Impersonation** | Banner dizia "Encerrar Sessão", podendo ser confundido com logout da conta. | Requisitos solicitavam clareza da organização e ação explícita de encerramento da sessão delegada. | **Implementado em `ImpersonationBanner.tsx`:** Botão com texto "Encerrar acesso", restaurando os tokens da revenda original e a listagem de clientes. |
| **Portais Externos Dentro do Layout CRM** | Rotas de portais (`/portal-proprietario`, etc.) abriam com a sidebar administrativa visível se o usuário tivesse qualquer sessão ativa. | Mockups 2, 4 e 9 mostram portais externos sem barra lateral do CRM, com topbar própria do cliente e abas de navegação direta. | **Criado `PortalLayout.tsx`:** Todas as rotas de portais externos foram encapsuladas em layout limpo sem sidebar administrativa. |
| **Usuário Sem Vínculo Organizacional** | Usuários cadastrados sem imobiliária caíam em tela em branco ou erro de permissão. | Mockup 3 ilustra card limpo "Seu acesso / Vínculo da conta / Aguardando acesso" com botão "Sair". | **Criada View `PendingAccess.tsx`:** Roteamento central em `panelNavigation.ts` e `App.tsx` direciona `role === 'user'` ou `CUSTOMER_USER` diretamente para esta tela. |

---

## 4. Rotas Canônicas e Redirecionamentos Mantidos

Para assegurar total retrocompatibilidade e integridade de links externos salvos por usuários, nenhuma funcionalidade foi perdida ou descontinuada:

| Rota Antiga / Legada | Rota Canônica Nova | Comportamento Implementado |
| :--- | :--- | :--- |
| `/urban/portal-proprietario` | `/portal-proprietario` | Redirecionamento permanente preservando query params (`?tab=...`) |
| `/urban/portal-comprador` | `/portal-comprador` | Redirecionamento permanente preservando query params |
| `/urban/portal-locatario` | `/portal-locatario` | Redirecionamento permanente preservando query params |
| `/rural/investidores` | `/rural/crm?tab=investidores` | Redirecionamento com tab ativa selecionada |
| `/rural/geo` | `/rural/propriedades?view=map` | Redirecionamento com abertura do mapa CAR/SIGEF |
| `/superadmin/whitelabel` | `/superadmin/settings?tab=branding` | Redirecionamento para aba de personalização da revenda |
| `/woo-control/audit` | `/woo-control/governance?tab=audit` | Redirecionamento para trilha de governança |
| Rotas diretas com token (`/sign/:token`) | `/sign/:token` | Mantida rota pública no `PortalLayout` |

---

## 5. Testes e Verificações Realizadas

### 5.1 Verificação Estática de Tipagem (TypeScript)
- **Comando:** `node --max-old-space-size=4096 ./node_modules/typescript/bin/tsc --noEmit`
- **Resultado:** **0 erros.** Todos os 4.200+ arquivos do projeto compilam com sucesso sem nenhuma quebra de tipagem nas novas interfaces de navegação.

### 5.2 Testes Automatizados (Vitest)
- **Comando:** `npx vitest run`
- **Resultado:** **31 arquivos de teste aprovados, 152/152 testes passando (100% de sucesso).**
- Destaque para `src/test/urbanMenuRoutes.test.ts`, validando a consistência do registro central `navigationConfig.ts` com as rotas canônicas registradas no `App.tsx`.

### 5.3 Compilação de Produção (Vite Build)
- **Comando:** `npm run build`
- **Resultado:** Compilação finalizada em 1m 9s. Todos os 4.225 módulos transformados, chunks otimizados gerados em `dist/`, Service Worker PWA gerado com 282 ativos em precache.

### 5.4 Testes de Perfis e Permissões
- **Master (`PLATFORM_OWNER`):** Menu lateral validado com 6 blocos canônicos em fundo branco e sem dependência de organização específica.
- **Mega Admin (`PLATFORM_ADMIN`):** Menu lateral validado com 6 blocos canônicos.
- **Revenda (`RESELLER_ADMIN`):** Acesso a `/superadmin/tenants` exibe o botão "Acessar em modo suporte" com ícone de chave em laranja.
- **Admin Urbano e Rural:** Navegação em 8 macro áreas agrupadas, com abertura sincronizada sem loop de re-renderização (`Maximum update depth exceeded` resolvido com `useMemo`).
- **Gerente Comercial:** Permissão de acesso a imóveis e relatórios sem expor configurações globais da imobiliária.
- **Corretor (`broker`):** Menu reduzido aos 5 itens de trabalho individual, visualização de Órulo no menu de conta, escopo de leads filtrado para `assigned_to = corretor`.
- **Atendente (`assistente`):** Menu reduzido aos 5 itens de triagem e fila com botão "Assumir atendimento".
- **Portais Externos:** Telas de Proprietário, Comprador, Locatário e Signatário carregadas em layout limpo sem barra lateral de CRM.
- **Usuário Sem Vínculo:** Rota `/acesso-pendente` validada com botão de logout funcional.

---

## 6. Sincronização e Repositório

- **Branch Atual:** `main`
- **Commit Local & Remoto:** `da4d443f736be7d805f0a0de7345ec467c610cdd`
- **Mensagem do Commit:** `feat: reorganizacao de paineis internos, portais externos e autorizacoes por perfil`
- **Alterações Totais:** 32 arquivos alterados, +5.718 inserções, -1.216 deleções.
- **Status do Repositório:** `Your branch is up to date with 'origin/main'. Nothing to commit, working tree clean.`
