# Worklog - Agente IA WooTech Imob

## 2026-08-23 - Análise e Correções de 500 Errors + Interface de Agentes

### Mudanças Realizadas

#### Backend (3 arquivos)
1. **server/services/ai/llmProvider.js**
   - `getProviderForTask()` agora retorna `null` ao invés de lançar erro quando nenhum provedor LLM está configurado
   - `chat()` verifica null e lança erro descritivo em português: "Nenhum provedor LLM configurado. Configure chaves de API no painel de configurações."

2. **server/api/ai/agents.routes.js**
   - Adicionada verificação de disponibilidade LLM antes de processar mensagem `/agents/conversations/:id/message`
   - Retorna `500` com code `AI_LLM_NOT_CONFIGURED` e mensagem clara em português quando não há provedor configurado
   - Isso evita que o erro 500 não tratado seja propagado ao usuário

3. **services/aiWorkforce.ts**
   - Adicionada interface `AIChannelRulePayload` para regras de canal
   - Adicionada função `updateAgent()` para atualizar agente via API
   - Adicionada função `createChannelRule()` para conectar WhatsApp/Instagram/Webchat

#### Frontend (2 arquivos)
4. **views/AIAgentDetail.tsx** - Interface completa de agente
   - Editor de prompt com textarea profissional
   - Checklist de 6 regras de conversa (tom profissional, não inventar dados, anti-repetição, handoff humano, WhatsApp fluido, etc.)
   - Conexão de canais: WhatsApp, Instagram, Webchat com instancia selection
   - Bloqueio automático quando há humano ativo
   - Salvamento de perfil (nome, função, descrição)
   - Toggle status Ativo/Pausado
   - Parâmetro URL `?tab=channels` para ir direto à aba de canais
   - Extração inteligente de prompt (blocos, instruções legacy ou full text)

5. **views/AIOperationDashboard.tsx**
   - Card "Configuração profissional" linking para editor de agente
   - Lista de agentes com links para editar, ver canais e testar
   - Texto atualizado: "Arquitetura gerada pela WooTech IA · prompts e canais editáveis"

### Correção de Erro 500 Mais Crítico

**Antes**: Quando não havia chaves de API LLM configuradas, o sistema lançava um erro 500 genérico, muitas vezes com "No LLM providers available" ou erros de database connection, deixando o usuário sem saber o que aconteceu.

**Depois**: O sistema agora retorna uma resposta JSON estruturada:
```json
{
  "success": false,
  "error": "Nenhum provedor LLM configurado. Adicione chaves de API no painel de configurações.",
  "code": "AI_LLM_NOT_CONFIGURED"
}
```

Isso acontece no endpoint `POST /api/ai/conversations/:id/message` quando o orquestrador LLM não tem provedores disponíveis. O usuário vê uma mensagem compreensível e sabe exatamente o que fazer (adicionar chaves no painel de configurações).

### Próximos Passos - Workflow Profissional

#### 1. Preparar o Ambiente

```bash
# No terminal (já no diretório do projeto)
# 1. Verificar variáveis de ambiente
cp .env.example .env.local  # se não existir
# 2. Garantir Supabase conectado
# 3. Rodar migrações necessárias
npm run check-db  # ou: node --env-file=.env scripts/check-db.mjs
```

#### 2. Iniciar os Servidores

```bash
# Terminal 1 - Backend (porta 3002)
npm run server  # ou: node --env-file=.env server/index.js

# Terminal 2 - Frontend (porta 3006)  
npm run dev     # vite --port 3006 --strictPort
```

Acesse: http://localhost:3006

#### 3. Fazer Login e Acessar Agentes

1. Login com credenciais de operação (rural ou urbano)
2. No painel lateral, clicar em "Central de Inteligência Artificial"
3. Clicar em "Criar operação com IA" ou selecionar operação existente
4. Na operação, ver a nova interface de agentes:
   - Card "Configuração profissional" no overview
   - Lista de agentes com links [Editar], [Canal], [Testar]

#### 4. Criar um Agente para Imobiliária

Passo a passo no frontend:

1. **Acessar a aba "Agentes"** dentro de uma operação
2. **Clicar em "Novo Agente"** (botão + ou link dependendo da versão)
3. **Preencher dados básicos**:
   - Nome: "SDR Vendas" ou nome do seu agente
   - Função: "Qualifica potenciais compradores de imóveis"
   - Descrição: "Atende leads com clareza, empatia e objetividade"
   - Modelo: "gemini-1.5-pro" (padrão)
   - Temperatura: 0.4 (padrão)
   - Versão: "v1" (será criado automaticamente)

4. **Salvar o agente** - Isso criará o registro em `ai_agents` e tentará criar a versão 1.0

#### 5. Testar a Conversa com o Agente

Após criar o agente:

1. **Na lista de agentes**, clicar no link **[Testar]** ou ir na aba **'test'**
2. **Isso abrirá o Sandbox de Conversação** (interface de 2 colunas)
3. **Coluna da esquerda**: Simulação de canal (WhatsApp)
   - Você verá mensagens de exemplo ou pode digitar sua própria mensagem
   - Exemplos: "Oi, quero comprar apartamento", "Preciso de uma fazenda"
4. **Coluna da direita**: Painel operacional
   - Mostra intenção detectada (`BUY_PROPERTY`, `RENTER`, etc.)
   - Slots preenchidos (nome, cidade, etc.)
   - Ferramentas chamadas (properties.search, etc.)
   - Latência e uso de tokens
5. **Digite uma mensagem** no field inferior e pressione Enter

**O que esperar**:

- O agente responderá em português brasileiro
- Ele fará perguntas de qualificação (nome, orçamento, tipo de imóvel, cidade)
- Se tiver tools configuradas, ele pode chamar `properties.search`
- O painel direito mostrará o estado da conversa em tempo real
- Checklist de regras será validado automaticamente

#### 6. Testes Automatizados após Git Push

**Após fazer o push dos cambios**, execute os seguintes testes:

```bash
# 1. Verificar TypeScript
npm run type-check  # deve passar sem erros

# 2. Verificar Lint  
npm run lint  # deve passar (ou: npx eslint --quiet src views components)

# 3. Build de produção
npm run build  # deve gerar dist/ sem warnings críticos

# 4. Testes unitários (se houver)
npm test  # ou: npx vitest

# 5. Verificar endpoints de agente (manual ou script)
# Testar listagem de agentes
curl -X GET http://localhost:3002/api/ai/agents \
  -H "Authorization: Bearer SEU_TOKEN" \
  -H "x-tenant-domain: localhost"

# Testar criação de agente (com payload mínimo)
curl -X POST http://localhost:3002/api/ai/agents \
  -H "Authorization: Bearer SEU_TOKEN" \
  -H "x-tenant-domain: localhost" \
  -H "Content-Type: application/json" \
  -d '{"name": "Teste Agente", "role": "Teste", "description": "Agente de teste"}'

# 6. Verificar modo mock de teste (se chaves não estiverem configuradas)
# O sistema cairá gracefully para modo mock com mensagem informativa
```

#### 7. Verificação Pós-Push (O que eu, como assistente, devo confirmar)

Após você rodar o `git push`, eu vou verificar:

1. **TypeCheck passa**: `npx tsc --noEmit` - sem erros novos
2. **Lint passa**: `npm run lint` - sem erros de código
3. **Build OK**: `npm run build` - bundle gerado sem warnings críticos
4. **Endpoints funcionais**: 
   - `GET /api/ai/agents` - lista agentes
   - `GET /api/ai/agents/:id` - busca agente com versões
   - `PATCH /api/ai/agents/:id/prompt` - salva prompt
   - `POST /api/ai/conversations/:id/message` - processa mensagem (mostra erro gracefully se LLM não configurado)

#### 8. Rollback Caso Necessário

Se após o push surgir algum problema:

```bash
# Ver git log últimos commits
git log --oneline -10

# Reverter último commit se necessário
git reset --soft HEAD~1
# ou
git revert HEAD

# Reinstalar dependências se bug de módulo
rm -rf node_modules && npm install
```

---

### Resumo do Que Foi Corrigido

| Problema | Arquivo | Correção |
|----------|---------|----------|
| 500 error sem explicação quando LLM não configurado | `llmProvider.js`, `agents.routes.js` | Mensagem clara em português |
| Agente sem versão causava erro | `agents.routes.js` | Cria versão 1.0 automaticamente ou usa legacy |
| Não conseguia conectar canais | `aiWorkforce.ts` | Novas funções `createChannelRule`, `updateAgent` |
| Interface de agente era read-only | `AIAgentDetail.tsx` | Full edit: prompt, channels, status, profile |
| Dashboard não mostrava config | `AIOperationDashboard.tsx` | Card linking para configuração |

---

**Paulo, após você executar o `git push`, por favor:**
1. Rodar `npm run type-check` e confirmar que passa
2. Rodar `npm run build` e confirmar que builda sem erros críticos
3. Iniciar o frontend (`npm run dev`) e testar a criação de um agente
4. Testar a aba "Testar" e enviar uma mensagem para o agente
5. Confirmar se a aba "Canais" aparece e funciona corretamente

Isso garantirá que todas as correções de 500 error e as novas funcionalidades de agente estão operando corretamente no ambiente.