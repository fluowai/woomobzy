# Plano de auditoria funcional e prevenção de regressões — IMOBZY

**Status:** EM EXECUÇÃO — ONDA 0  
**Data:** 2026-07-28  
**Objetivo:** reduzir regressões, retrabalho e perdas financeiras por meio de uma validação funcional rastreável, seguida da automação dos fluxos críticos.

## 1. Decisão

Executar a auditoria completa por ondas, começando pelos controles transversais e seguindo por Urbano, Rural, Super Admin e Mega Admin. Cada função deverá ter evidência de execução, defeitos classificados por impacto, reteste e um teste de regressão para todo problema crítico corrigido.

Não será considerado suficiente validar apenas se a tela abre ou se o projeto compila. A auditoria deverá comprovar permissões, persistência, isolamento entre organizações, integrações, falhas esperadas e resultado no banco ou na API.

## 2. Evidências da linha de base

- O inventário existente descreve 24 grupos urbanos, 20 grupos rurais, módulos compartilhados, integrações e perfis em `ANALISE_FUNCOES_IMOBZY.md`.
- As rotas reais estão centralizadas em `App.tsx`: Rural a partir da linha 248, Urbano a partir da linha 338, Mega Admin a partir da linha 417 e Super Admin a partir da linha 445.
- Contagem estrutural atual no roteador: 48 tags de rota no bloco Rural, 47 no Urbano, 13 no Mega Admin e 12 no Super Admin.
- A suíte Vitest possui 18 arquivos executados, com 90 testes aprovados.
- A suíte Playwright possui apenas 5 cenários lógicos em 2 arquivos, repetidos em desktop e mobile. Eles cobrem superfícies públicas e verificações básicas de roteamento, mas não exercitam os fluxos autenticados dos quatro painéis.
- Em 2026-07-28, `npm run type-check`, `npm run build`, `npm run test -- --run` e `npm run lint` terminaram com código zero. O lint apresentou muitos avisos.

Conclusão da linha de base: os gates técnicos atuais detectam falhas de compilação e algumas regressões isoladas, mas não protegem a maior parte das operações que geram receita ou alteram dados.

### Progresso da execução em 2026-07-28

- matriz automatizada criada com 143 rotas: 49 Urbanas, 48 Rurais, 13 de Super Admin, 13 de Mega Admin e 20 públicas/compartilhadas;
- infraestrutura E2E autenticada criada para os quatro perfis, com falha explícita quando faltam credenciais;
- bloqueio anônimo dos quatro painéis aprovado em desktop e mobile;
- superfícies públicas aprovadas em 10 execuções Playwright;
- regressões de rotas urbanas, bootstrap de tenant, privilégio, assinatura e impersonação receberam testes automatizados;
- a aprovação integral da Onda 0 continua condicionada às contas de homologação, ao teste multi-tenant/RLS e à rotação externa dos segredos anteriormente expostos.

## 3. Princípios da auditoria

1. Priorizar risco financeiro, perda de dados, segurança e interrupção operacional.
2. Testar o comportamento pelo perfil correto e também pelo perfil que não pode acessar.
3. Validar interface, API e persistência; sucesso visual sem efeito real não é aprovação.
4. Toda correção P0 ou P1 deverá criar um teste de regressão automatizado.
5. Não misturar auditoria e grandes refatorações; primeiro reproduzir, registrar e estabilizar.
6. Usar dados de teste controlados e nunca executar testes destrutivos em produção.

## 4. Preparação obrigatória

Antes da primeira onda:

- definir um ambiente de homologação equivalente à produção;
- criar organizações Urbana A, Urbana B, Rural A e Rural B;
- criar usuários de corretor, admin urbano, admin rural, Super Admin e Mega Admin;
- preparar dados descartáveis: leads, clientes, imóveis, contratos, cobranças, documentos e integrações simuladas;
- registrar quais serviços externos estarão reais, simulados ou indisponíveis;
- congelar a matriz de funções confrontando documentação, menus, rotas, APIs e banco;
- abrir um quadro único de defeitos com severidade, responsável, evidência, causa raiz, correção e reteste.

Sem essas contas e massas de dados, não será possível comprovar autorização e isolamento multi-tenant.

## 5. Roteiro obrigatório por função

Cada função inventariada deverá executar, quando aplicável:

1. acesso pelo perfil autorizado;
2. bloqueio pelo perfil não autorizado;
3. isolamento entre duas organizações;
4. carregamento sem erro de console ou resposta HTTP inesperada;
5. criação com dados válidos;
6. validação de dados obrigatórios e formatos inválidos;
7. leitura após atualizar a página e após novo login;
8. edição e confirmação da persistência;
9. exclusão, cancelamento ou arquivamento com confirmação e regra de negócio;
10. busca, filtro, paginação, ordenação e estado vazio;
11. tentativa duplicada e comportamento idempotente;
12. falha de rede, timeout ou indisponibilidade da integração;
13. uso em desktop e no viewport móvel definido pelo Playwright;
14. registro em log ou trilha de auditoria quando a operação for sensível;
15. confirmação do resultado na API e no banco para operações críticas.

## 6. Ordem de execução

### Onda 0 — Fundação transversal

Validar antes dos painéis:

- login, logout, expiração e restauração de sessão;
- cadastro, onboarding e redirecionamento por nicho;
- `ProtectedRoute`, `PanelGuard`, `SuperAdminGuard` e `MegaAdminGuard`;
- matriz de perfil, organização, revenda e impersonação;
- isolamento de dados entre organizações e políticas RLS;
- planos, limites, feature flags e estados bloqueados;
- upload, download, storage e URLs persistidas;
- tratamento de erro, logs e respostas de API;
- migrações pendentes e compatibilidade entre código e schema de homologação.

**Gate:** nenhum acesso cruzado; nenhum perfil acessa painel indevido; sessões e redirecionamentos são previsíveis; schema de homologação é compatível.

### Onda 1 — Urbano

1. Dashboard e indicadores.
2. CRM, clientes, Kanban e ciclo completo de lead.
3. Imóveis, empreendimentos, loteamentos e publicação.
4. Locação: contrato, cobrança, repasse, reajuste e borderô.
5. Financeiro, cobrança e simulador.
6. WhatsApp, e-mail, campanhas e Instagram.
7. Documentos, compliance, chaves e condomínios.
8. Portais de proprietário, comprador e locatário.
9. Site, landing pages, quiz, exportador e relatórios.
10. IA, conexões, integrações e configurações.

**Gate:** todos os fluxos de receita e alteração de dados aprovados; zero P0/P1 aberto; testes automatizados cobrindo os caminhos críticos.

### Onda 2 — Rural

1. Dashboard, CRM, Kanban e ciclo de lead.
2. Imóveis e cadastro técnico rural.
3. Território, mapas, importação geográfica e Localizar CAR.
4. Valuation, due diligence, dossiê e data room.
5. Financeiro, contratos e metas.
6. WhatsApp, e-mail, campanhas e Instagram.
7. Matchmaking e portais de proprietário e comprador.
8. Site, landing pages, quiz e relatórios.
9. IA, conexões, integrações e configurações.

**Gate:** dados geográficos e documentos permanecem íntegros; cálculos críticos têm casos conhecidos; zero P0/P1 aberto; regressões críticas automatizadas.

### Onda 3 — Super Admin

Validar dashboard, organizações/tenants, impersonação, suporte, equipe, domínios, consultoria, planos, billing, audit log, templates, marketing e configurações.

**Gate:** administração de tenants não vaza nem altera outra organização; mudanças de plano e domínio são auditáveis; zero P0/P1 aberto.

### Onda 4 — Mega Admin

Validar dashboard, revendas, clientes diretos, analytics, monitoramento, billing global, feature flags, audit log, importador, migração FluowAI, Storage Intelligence e configurações globais.

**Gate:** separação entre Mega Admin e Super Admin comprovada; importações e migrações possuem simulação, validação e rollback; zero P0/P1 aberto.

### Onda 5 — Superfícies públicas e integrações

Validar página comercial, autenticação pública, sites, landing pages, quiz, captura de lead, domínio personalizado, roteamento do tenant, portais, webhooks, WhatsApp, e-mail, Instagram, IA, storage e provedores de dados.

**Gate:** captação pública não perde leads; domínio não mistura tenants; segredos e erros internos não aparecem para o usuário.

### Onda 6 — Barreira permanente contra regressões

- converter a matriz crítica em Playwright autenticado;
- criar fixtures determinísticas por perfil e organização;
- cobrir APIs e regras de negócio com testes de integração;
- adicionar testes unitários para cálculos e transformações puras;
- executar smoke tests em cada pull request;
- executar regressão crítica antes de release;
- executar regressão completa de forma agendada e antes de mudanças de alto risco;
- bloquear release quando houver P0/P1, falha de isolamento, build, tipos, testes ou migração incompatível;
- acompanhar taxa de regressão, reabertura, tempo de correção e cobertura dos fluxos críticos.

## 7. Registro de evidências

Cada caso deverá conter ID, módulo, função, perfil, pré-condição, massa de dados, passos, resultado esperado e obtido, evidências, ambiente, versão, severidade, impacto, causa raiz, teste criado e resultado do reteste.

## 8. Severidade e tratamento

| Nível | Definição | Regra |
| --- | --- | --- |
| P0 | vazamento entre tenants, perda/corrupção de dados, indisponibilidade geral ou falha financeira grave | interromper a onda e corrigir imediatamente |
| P1 | função central de venda, locação, cobrança, acesso ou comunicação indisponível sem contorno seguro | corrigir antes de avançar o gate |
| P2 | função relevante degradada com contorno conhecido | planejar na própria onda |
| P3 | problema visual, textual ou secundário sem perda operacional | agrupar para correção controlada |

## 9. Critérios globais de aceite

- 100% das funções inventariadas possuem status: aprovada, reprovada, bloqueada ou não aplicável.
- 100% dos casos P0/P1 possuem evidência, causa raiz, reteste aprovado e teste automatizado.
- Zero P0 ou P1 permanece aberto ao encerrar uma onda.
- Zero acesso indevido entre perfis, painéis ou organizações.
- 100% dos fluxos críticos de receita validam interface, API e persistência.
- Build, type-check, lint sem erros e testes automatizados passam no gate final.
- Nenhuma correção será declarada concluída apenas por inspeção visual.
- A próxima release terá checklist, responsável, evidência e plano de rollback.

## 10. Métricas

- percentual de funções auditadas por painel;
- percentual de fluxos críticos automatizados;
- defeitos P0/P1/P2/P3 encontrados por onda;
- regressões reabertas;
- tempo entre detecção, correção e reteste;
- falhas escapadas para produção;
- perda financeira ou horas de retrabalho atribuídas a regressões.

## 11. Riscos e mitigação

| Risco | Mitigação |
| --- | --- |
| tentar validar tudo ao mesmo tempo e perder rastreabilidade | executar ondas com gates e matriz única |
| homologação diferente de produção | comparar schema, variáveis, serviços e versão antes da auditoria |
| teste manual não reproduzível | exigir dados, passos, versão e evidências |
| correção gerar nova regressão | adicionar teste antes de fechar P0/P1 |
| testes alterarem dados reais | usar organizações e dados descartáveis fora de produção |
| excesso de automação frágil | automatizar primeiro fluxos críticos e usar seletores semânticos |
| documentação divergir do produto | confrontar documentação, rota, menu, API e banco na Onda 0 |

## 12. Primeiro marco

O primeiro marco não é “testar o Urbano inteiro”. É concluir a matriz mestra e a Onda 0. Depois disso, a auditoria do Urbano pode começar sem confundir defeito do módulo com falha de autenticação, perfil, plano, tenant ou schema.

Ao final desse marco deverão existir:

- inventário único de funções;
- contas e dados de homologação;
- matriz de acesso;
- lista priorizada de fluxos críticos;
- smoke autenticado mínimo para os quatro painéis;
- backlog de defeitos conhecido e classificado.
