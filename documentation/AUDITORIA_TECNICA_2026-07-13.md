# Auditoria técnica — WooTech Imob

Data: 13/07/2026  
Escopo: frontend React/TypeScript, backend Express, integrações, persistência, testes e dados artificiais.

## Resumo executivo

O sistema compila, gera build de produção, passa no lint e possui uma suíte automatizada funcional. O banco configurado está acessível e contém as tabelas centrais. Entretanto, antes desta auditoria, diversas telas misturavam dados reais com entidades, métricas e respostas fictícias. Isso criava uma falsa percepção de operação normal em caso de falha de API ou ausência de dados.

Os mocks operacionais identificados foram removidos ou substituídos por estados vazios/erro explícitos. Capacidades sem backend real foram desativadas ou identificadas na interface. O arquivo global `mocks.ts` foi eliminado.

Não é tecnicamente correto afirmar que “todas as funções” foram exercitadas ponta a ponta: existem 539 arquivos de código e apenas 13 arquivos de teste. Fluxos que dependem de login, permissões específicas, WhatsApp, IA, serviços agro, APIs governamentais, e-mail, MinIO e assinatura digital exigem credenciais e ambientes externos ativos para validação E2E.

## Evidências executadas

| Verificação | Resultado |
| --- | --- |
| `npm run type-check` | Aprovado |
| `npm run lint` | Aprovado, zero warnings |
| `npm run test` | 13 arquivos e 80 testes aprovados |
| `npm run build` | Aprovado, 3.893 módulos transformados |
| `npm run check-db` | Aprovado; 7 tabelas centrais encontradas |
| `npm run check-deploy-config` | Aprovado |
| Backend `GET /health` | Aprovado; resposta `status: ok` |
| `git diff --check` | Aprovado |

## Correções realizadas

### Dados operacionais

- AI Studio passou a carregar imóveis e leads das APIs reais, sem `MOCK_PROPERTIES` ou `MOCK_LEADS`.
- Corrigida a renderização do resultado de matching da IA, que podia entregar um objeto diretamente ao React.
- Contratos não iniciam mais com registros fictícios e usam dados reais do imóvel ao preencher cláusulas.
- A vitrine Fazendas Brasil não injeta mais quatro fazendas inventadas quando o banco falha ou está vazio.
- Blocos de imóveis dos editores não exibem propriedades fictícias.
- O arquivo `mocks.ts` e suas exportações foram removidos.

### Indicadores e integrações

- O widget agro agora chama o backend autenticado (`/api/rural/market/prices`) e não o `localhost:8000` do navegador.
- Cotações e alertas ambientais falsos foram removidos. Falhas agora aparecem como indisponibilidade da fonte.
- Analytics passou a montar séries e nichos com registros reais do Supabase.
- MRR, crescimento percentual e uso de features inventados foram removidos.
- Receita estimada e status de servidor hardcoded foram removidos do dashboard do superadmin.
- Páginas SEO fictícias foram removidas; a UI informa que a persistência ainda não existe.
- Modos de importação visual/feed que não possuíam implementação real deixaram de ser oferecidos no fluxo principal.
- A rota de zoneamento deixou de retornar índices urbanísticos fixos como se fossem oficiais; responde `501` até existir provedor real.
- Defaults de IPTU como “REGULAR”, “Médio” e “Zona Residencial” foram removidos quando não existem no cadastro.

## O que funciona com evidência

- Compilação TypeScript e empacotamento Vite/PWA.
- Testes unitários existentes de schemas, utilidades, hooks, isolamento administrativo, segurança de webhook, tratamento de erros e matching.
- Inicialização do Express e health check.
- Conectividade com Supabase e presença das tabelas centrais.
- Configuração básica de deploy Supabase.
- Fluxos centrais de propriedades/leads possuem services e rotas reais, protegidas por autenticação/tenant onde aplicável.

## Problemas e riscos remanescentes

### Prioridade crítica

1. Segredos de integrações podem chegar ao navegador. `LegalContracts.tsx` e `TemplateCustomizer.tsx` usam token/apikey de WhatsApp diretamente no frontend. Chamadas com segredo devem ocorrer exclusivamente no backend.
2. `services/openaiService.ts` e `services/groqService.ts` aceitam chaves no cliente e fazem chamadas diretas aos provedores. Mesmo que usadas apenas em telas administrativas, as chaves ficam observáveis no navegador. O proxy `/api/ai` deve ser a única via.
3. A cobertura automatizada é muito pequena em relação ao produto: 13 arquivos de teste para 539 arquivos de código. Um build verde não valida os fluxos de negócio.

### Prioridade alta

1. O ESLint desativa regras importantes: `react-hooks/rules-of-hooks`, `react-hooks/exhaustive-deps`, imutabilidade e variáveis não usadas. Isso reduz muito o valor do lint como gate de qualidade.
2. Existem consultas Supabase diretas em telas administrativas. A segurança real depende integralmente de RLS corretamente configurada e testada; recomenda-se concentrar operações sensíveis no backend.
3. O Template Manager mantém alterações apenas em memória. Duplicar/excluir parece funcionar visualmente, mas não persiste após recarregar.
4. O módulo de Marketing SEO não possui backend de criação/publicação/analytics.
5. Analytics consulta linhas para montar séries; em bases grandes deve migrar para agregações SQL/RPC paginadas para evitar limites de resposta e números incompletos.

### Prioridade média

1. Há uso de `console.*` fora dos testes, contrariando a convenção de usar `logger`.
2. Alguns módulos são muito grandes (Kanban, páginas públicas, locação, configurações), elevando risco de regressão e dificultando testes isolados.
3. O bundle principal ainda é grande (aproximadamente 689 kB antes de gzip) e o chunk de gráficos passa de 435 kB.
4. Placeholders visuais e textos padrão continuam existindo em templates e formulários. Eles são configuração de design, não registros operacionais, mas devem ser diferenciados de conteúdo publicado.

## Matriz de validação externa pendente

| Integração | Estado nesta auditoria | Próximo teste necessário |
| --- | --- | --- |
| Supabase | Conectividade/tabelas confirmadas | CRUD autenticado por papel e teste de RLS multi-tenant |
| WhatsApp/WAHA | Código presente | Instância real conectada, envio/recebimento/mídia/websocket |
| IA | Proxy presente | Chaves de servidor, timeout, JSON inválido e limites |
| Agro Intelligence | Fallback fictício removido | Microserviço online e fonte CEPEA real |
| E-mail/IMAP/SMTP | Não exercitado E2E | Conta de teste e ciclo enviar/receber/anexos |
| MinIO/storage | Não exercitado E2E | Upload, download, autorização e reconciliação |
| Orulo/portais | Não exercitado E2E | Credenciais sandbox e publicação/retorno de erros |
| Assinatura/locação | Testes parciais | Jornada completa com template, signatários e webhook |
| APIs legais/governo | Parcial | Provedores oficiais e tratamento de indisponibilidade |

## Recomendação de sequência

1. Remover todos os segredos do frontend e criar proxies backend para WhatsApp/OpenAI/Groq.
2. Criar testes E2E autenticados para login, imóvel, lead, Kanban, contrato e locação.
3. Criar suíte de isolamento multi-tenant/RLS com dois tenants reais de teste.
4. Persistir Template Manager e implementar backend do Marketing SEO.
5. Reativar gradualmente as regras de React Hooks/unused variables e corrigir violações.
6. Instrumentar eventos reais antes de voltar a exibir MRR, uso de features ou tendências.

