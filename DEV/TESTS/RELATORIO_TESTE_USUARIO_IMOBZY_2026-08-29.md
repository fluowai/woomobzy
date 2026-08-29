# Relatório de Teste de Usuário - Imobzy

Data: 2026-08-29  
Ambiente testado: https://imob.wootech.com.br  
Conta de teste: imob@wootech.com.br  
Organização criada: WooTech Imob QA (`35b3e026-5209-436e-a73a-1fb0fcf7627a`)  
Evidências locais: `C:\dev\IMOBZY\test-results\imobzy-user-audit`

## Resumo executivo

O sistema permite completar boa parte do fluxo operacional principal: criação da conta pelo onboarding, acesso ao painel, cadastro e edição de imóveis, criação/edição/movimentação de lead no funil, criação de conexão WhatsApp com QR Code e criação/publicação de operação de IA.

Os pontos mais críticos encontrados estão no onboarding e na Central de IA. O onboarding não persistiu corretamente dados importantes coletados na tela, especialmente plano, chaves de LLM, template, equipe e WhatsApp. A organização ficou inicialmente bloqueada por assinatura/plano ausente, exigindo correção manual no banco para continuar o teste. Na IA, a arquitetura de agentes foi criada e publicada, mas o chat sandbox falhou com erro 500 causado por chave Gemini inválida ou resolução incorreta da chave.

## Massa de teste criada

- Imóvel de venda: `Apartamento QA Vista Parque - Venda Editado`, valor R$ 699.000, status `Disponível`.
- Imóvel de aluguel: `Casa QA Jardim Norte - Aluguel`, valor R$ 3.200, status `Disponível`.
- Lead: `Lead QA Marina Compradora Editado`, origem WhatsApp, orçamento R$ 720.000, estágio `Qualificação`.
- Operação de IA: `Operação QA IA 1788006371834`, status `PUBLISHED`, id `407e875b-2269-4e65-9e5c-8fb389e2979f`.
- Agentes criados: `Orquestrador de Atendimento`, `Especialista Comercial`, `Agenda e Handoff`.
- Conexão WhatsApp: `Atendimento QA`, status pendente com QR Code disponível para escaneamento posterior.

## O que funcionou

- Onboarding permitiu criar a organização e finalizar o fluxo visualmente.
- Login funcionou após correção manual do plano da organização.
- Dashboard urbano carregou e refletiu dados operacionais criados durante o teste.
- Cadastro de imóvel de venda funcionou.
- Cadastro de imóvel de aluguel funcionou.
- Listagem e edição de imóvel funcionaram.
- Kanban carregou colunas e cards.
- Cadastro de lead pelo Kanban funcionou.
- Busca de lead funcionou.
- Movimentação de lead entre etapas funcionou e persistiu no banco.
- Edição de lead funcionou, incluindo nome, orçamento, tags e observações.
- Configurações de integrações salvaram chaves Gemini e Groq em `site_settings.integrations`.
- Central de IA criou operação, gerou arquitetura com agentes, executou validação automática visual e permitiu ativar/publicar.
- Tela de conexões criou conexão WhatsApp e abriu modal com QR Code.
- Rotas principais carregadas com sucesso no smoke test: Dashboard, Email, Funil Captação, Kanban/CRM, Imóveis Urbanos, Loteamentos, Simulador/Financial Hub, Contratos, Meu Site, Central de IA, Landing Pages, Quiz, Relatórios, Conexões e Configurações.

## O que não funcionou ou ficou inconsistente

### Crítico

1. Organização criada sem plano no onboarding

Após finalizar o onboarding, o login levava ao painel, mas o app bloqueava o acesso com mensagem de teste gratuito encerrado. No banco, a organização estava com `subscription_status = trial` e `trial_ends_at = 2026-09-05`, mas `plan_id = null`. O bloqueio vinha de `SubscriptionGuard`, que trata ausência de plano como bloqueio mesmo durante trial.

Impacto: usuário novo pode concluir onboarding e ficar impedido de usar o sistema imediatamente.

2. Onboarding coleta dados que não são persistidos

O frontend exibe seleção de LLM/template/WhatsApp/equipe, mas a chamada `/api/onboarding` envia apenas dados básicos da organização e usuário. O backend também ignora esses campos. A chave Gemini digitada no onboarding não foi salva ali; foi necessário salvar depois em Configurações. Groq nem aparece como opção no passo de IA do onboarding.

Impacto: quebra expectativa do usuário e torna a ativação inicial incompleta.

3. Chat sandbox da IA falha com erro 500

Após criar e publicar a operação de IA, o envio de mensagem no sandbox retornou 500 em `/api/ai/agents/conversations/.../message`. A tela mostrou erro do Google Generative AI: chave de API inválida (`API_KEY_INVALID`). Mesmo após salvar as chaves em Configurações, o sandbox continuou falhando.

Impacto: não foi possível validar conversa real com os agentes de IA.

### Alto

4. Operação publicada com agentes ainda em `DRAFT`

A operação ficou com status `PUBLISHED`, mas os três registros em `ai_agents` permaneceram com status `DRAFT`.

Impacto: estado de publicação inconsistente; pode afetar execução real, dashboards e roteamento.

5. Dashboard de IA mistura dados reais e dados demonstrativos

A tela indica `AI ATIVA`, mostra score visual de publicação 97/100, mas no banco a operação está com `health_score = 0`. Também aparecem nomes e handoffs demonstrativos que não pertencem ao tenant testado.

Impacto: usuário pode confiar em métricas que não representam o estado real da operação.

6. Configuração Namo Bana ficou preenchida indevidamente durante teste

Na primeira tentativa de preenchimento da tela de integrações, a chave Groq foi colocada no campo Namo Bana por posição de campo. Depois Groq foi salvo no campo correto, mas Namo Bana permaneceu marcado como configurado.

Impacto: a tela não deixa claro o estado e facilita erro operacional; recomenda-se limpar a chave Namo Bana deste tenant de teste.

### Médio

7. Clube Imobzy retorna erros 400

A rota `/urban/clube` carregou, mas gerou erros 400 em consultas Supabase de `gamification_profiles` com join em `profiles(full_name)`. O schema aparenta usar `profiles.name`, não `full_name`.

Impacto: ranking/perfil de gamificação pode não carregar corretamente.

8. WhatsApp/Mensagens gera erro interno em conversas Instagram

Durante teste de WhatsApp, houve 500 em `/api/instagram/conversations?` com log de erro ao carregar conversas Instagram.

Impacto: módulo de mensagens omnichannel pode mostrar falhas mesmo quando o foco é WhatsApp.

9. Algumas URLs diretas redirecionam para o dashboard

No smoke test, URLs diretas manuais como `/urban/messages`, `/urban/calendar`, `/urban/clientes`, `/urban/rentals`, `/urban/condominiums`, `/urban/keys`, `/urban/financial`, `/urban/documents`, `/urban/team` e `/urban/support` redirecionaram para `/urban`. Pode ser rota inexistente, nome diferente do link do menu ou fallback de rota.

Impacto: navegação profunda/bookmarks podem falhar; precisa cruzar com os hrefs reais do menu.

10. Carregamento inicial do dashboard pode demorar

Em uma tentativa, o painel ficou em `Carregando...` por cerca de 20 segundos e só abriu após aguardar mais tempo.

Impacto: percepção de travamento no primeiro acesso.

## WhatsApp

A conexão WhatsApp foi criada com sucesso e o modal exibiu QR Code. O escaneamento não foi realizado porque ficou combinado que o usuário faria essa etapa depois.

Pendente: validar conexão após pareamento, recebimento/envio de mensagens, criação automática de lead por conversa e vínculo com agentes.

## IA

Fluxo validado:

- Criar operação.
- Selecionar segmento imobiliário urbano.
- Escolher objetivos.
- Gerar arquitetura com agentes.
- Executar validação automática visual.
- Publicar operação.
- Abrir sandbox de teste.

Bloqueio encontrado:

- Envio de mensagem no sandbox falha com 500 por chave Gemini inválida ou não resolvida corretamente pelo backend.

Recomendação:

- Validar a chave configurada fora do app.
- Confirmar se o backend prioriza `site_settings.integrations.gemini.apiKey` e `site_settings.integrations.groq.apiKey` para a organização correta.
- Invalidar cache de provider/configuração após salvar chaves.
- Ajustar publicação para sincronizar status de operação e agentes.

## Evidências técnicas

Arquivos gerados:

- `test-results/imobzy-user-audit/route-smoke.json`
- `test-results/imobzy-user-audit/connections-after-create.png`
- `test-results/imobzy-user-audit/settings-groq-after-save.png`
- Scripts Playwright em `test-results/imobzy-*.cjs`

Consultas finais confirmaram no banco:

- Organização em trial com plano vinculado manualmente.
- Dois imóveis cadastrados.
- Lead editado e movido para `Qualificação`.
- Operação de IA publicada.
- Agentes ainda em `DRAFT`.
- Chaves Gemini e Groq salvas em `site_settings.integrations` no formato aninhado.

## Recomendações prioritárias

1. Corrigir onboarding para vincular plano padrão/trial e não bloquear usuário recém-criado.
2. Persistir no onboarding todos os campos coletados ou remover campos que ainda não têm efeito.
3. Adicionar Groq ao onboarding quando ele for suportado nas configurações.
4. Corrigir resolução/cache de chaves LLM no sandbox de IA e mostrar erro tratável quando a chave for inválida.
5. Sincronizar status de publicação entre `ai_operations` e `ai_agents`.
6. Remover dados mockados dos dashboards operacionais ou sinalizar explicitamente como demonstração.
7. Corrigir join de `gamification_profiles` para usar coluna existente em `profiles`.
8. Investigar 500 de Instagram conversations no módulo de mensagens.
9. Revisar rotas diretas do menu para garantir deep links funcionais.

## Pendências não testadas

- Pareamento real do WhatsApp, por depender do escaneamento do QR Code pelo usuário.
- Conversas reais de IA, bloqueadas pelo erro de chave Gemini.
- Envio real de e-mail, integrações financeiras, ZapSign, portais e automações externas, para evitar ações reais em produção.
- Fluxos rurais, porque o onboarding e a massa deste teste foram feitos no perfil urbano.
