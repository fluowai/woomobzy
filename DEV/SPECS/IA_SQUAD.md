# Planejamento: Imobzy AI Squad

**Status**: EM IMPLEMENTACAO
**Data**: 2026-08-04
**Autor**: Orquestrador + Maestro

---

## 1. Visão Geral

Inspirado nas melhores práticas do mercado, o IMOBZY empacotará suas funcionalidades de automação e Inteligência Artificial em **Personas (Agentes Digitais)**. Em vez de vender "ferramentas de IA genéricas", o IMOBZY oferecerá um "Squad de IA", que funciona como uma equipe de funcionários digitais operando 24/7.

Esta estratégia será o núcleo da comunicação de marketing nas landing pages e uma funcionalidade contratável dentro do CRM para Corretores, Imobiliárias e Incorporadoras.

---

## 2. A "Imobzy Squad" (Os Nossos Produtos)

Abaixo estão os 6 agentes de IA do ecossistema IMOBZY e suas funções mapeadas:

| Imobzy Agent | Papel no Mercado            | Função no IMOBZY                                                                                                                              | Correspondente (BrokerIA) |
| ------------ | --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------- |
| **Zya**      | Atendente 24/7 (WhatsApp)   | Qualifica leads no topo do funil, simula financiamentos básicos e agenda visitas direto no Kanban do corretor. A porta de entrada do funil.   | _BIA_                     |
| **Otto**     | Copiloto do Corretor        | Fica dentro do CRM. Lê o histórico do cliente, sugere a próxima mensagem de follow-up e ajuda o corretor a não esquecer de retornar.          | _DONNA_                   |
| **Nexus**    | Especialista em Integrações | O "Hub" invisível que conecta e importa automaticamente os leads de portais (ZAP, VivaReal, OLX) e Meta Ads direto para o CRM.                | _LINK_                    |
| **Max**      | Gestor de Tráfego           | Ferramenta que otimiza campanhas de Meta Ads baseado na conversão real capturada no CRM (Storage Intelligence).                               | _PIXEL_                   |
| **Íris**     | Analista de Dados           | Dashboard inteligente. Calcula o ROI das campanhas, custo por lead (CPL) e compila relatórios gerenciais visualmente atrativos em tempo real. | _JOTA_                    |
| **Eco**      | Especialista em Retenção    | Dispara cadências de e-mail e mensagens automáticas para a base de "leads frios" para tentar reativá-los continuamente.                       | _CARTA_                   |

---

## 3. Implementação: Zya (Agente WhatsApp) — Fase 1

**Arquivos alterados/criados:**
- `server/services/ai/agentOrchestrator.js` — tools `buscar_imoveis`, `agendar_visita`, `consultar_agenda_disponibilidade`
- `server/lib/AIAutomation.js` — integração de guardrails no fluxo WhatsApp
- `server/services/ai/agentPrompt.js` — regras de segurança no system prompt
- `server/services/ai/agentGuardrails.js` — módulo de guardrails (novo)
- `migrations/20260804_agent_guardrails_config.sql` — tabela de configuração de guardrails (novo)

### 3.1 Tools disponíveis

| Tool | Função | Status |
|---|---|---|
| `buscar_imoveis` | Busca imóveis por tipo, cidade, orçamento, quartos | ✅ Aprimorada — retorna título, preço, cidade, estado, tipo, finalidade, área, imagem |
| `agendar_visita` | Agenda visita criando `lead_followups` + `lead_appointments` | ✅ Corrigida — agora cria appointment no banco |
| `consultar_agenda_disponibilidade` | Consulta disponibilidade de data/horário | ✅ Nova |
| `simular_financiamento` | Simula parcelas (Tabela Price) | ✅ Existente |
| `atualizar_etapa_crm` | Move lead no Kanban | ✅ Existente |
| `qualificar_lead` | Classifica temperatura do lead | ✅ Existente |
| `enviar_audio_whatsapp` | Gera áudio TTS | ✅ Existente |

### 3.2 Guardrails implementadas

| Trava | Finalidade | Status |
|---|---|---|
| **Contexto imobiliário** | Bloqueia respostas fora do domínio | ✅ |
| **Filtro de tópicos sensíveis** | Bloqueia política, religião, futebol, etc. | ✅ |
| **Detecção de desvio de tópico** | Redireciona após 2 mensagens off-topic | ✅ |
| **Rate limit** | Limita a 10 msgs/min por telefone | ✅ |
| **Detecção de spam** | Ignora mensagens repetitivas/garbled | ✅ |
| **Handoff humano** | Escala para corretor quando necessário | ✅ |
| **Saudação obrigatória** | Zya se apresenta na primeira mensagem | ✅ Existente |

### 3.3 Integração Agenda

- `agendar_visita` agora cria registros em `lead_appointments` além de `lead_followups`
- Nova tool `consultar_agenda_disponibilidade` verifica conflitos antes de agendar
- Formato ISO 8601 obrigatório para data/hora

---

## 4. Ofertas e Segmentação (Landing Pages)

### 4.1. IMOBZY para Corretores (`/para-corretor`)

- **Dores Resolvidas**: Falta de tempo, leads esfriando de madrugada, esquecimento de fazer follow-up.
- **Foco da Venda**: **Zya** (atendimento instantâneo) e **Otto** (assistente pessoal do CRM).
- **Pitch**: "Você foca em visitar imóveis e fechar contratos. A Zya e o Otto cuidam do trabalho burocrático de responder e organizar a sua base."

### 4.2. IMOBZY para Imobiliárias (`/para-imobiliaria`)

- **Dores Resolvidas**: Desorganização na distribuição de leads, perda de conversão por corretores lentos, dificuldade de integrar múltiplos canais (ZAP, Meta).
- **Foco da Venda**: **Nexus** (integração perfeita e unificada), **Íris** (análise de produtividade da equipe) e Roleta de Leads Inteligente da Zya.
- **Pitch**: "Centralize a sua operação, elimine perdas de leads e saiba exatamente qual corretor e qual campanha estão trazendo retorno real."

### 4.3. IMOBZY para Incorporadoras (`/incorporador`)

- **Dores Resolvidas**: Volume massivo de leads não qualificados em lançamentos, gestão de tráfego complexa, cálculo de ROI impossível de rastrear.
- **Foco da Venda**: **Max** (otimização de Ads para escalar captação), **Eco** (nutrição de milhares de leads simultâneos) e **Íris** (dashboard definitivo de ROI e CAC do lançamento).
- **Pitch**: "Escale o lançamento do seu empreendimento com menor Custo de Aquisição (CAC) e nutra 100% da sua base de contatos frios automaticamente."

---

## 5. Estratégia Whitelabel Exclusiva

Diferente do mercado que vende de forma centralizada (B2C direto para a imobiliária), o IMOBZY opera com uma potente arquitetura `Mega Admin -> Super Admin (Reseller) -> Imobiliária`.

**A Vantagem Desleal**:
Os nossos _Resellers_ (Agências de Marketing Imobiliário, Assessorias, Plataformas Regionais) poderão revender a "Zya" e o "Otto" de forma empacotada com suas próprias marcas (Whitelabel).
Eles poderão customizar os nomes, os prompts e os comportamentos dos agentes para seus clientes específicos, criando uma poderosa máquina de receita recorrente (MRR) de IA que o concorrente não possui.

---

## 6. Próximos Passos de Execução

1. **Aprovação da Identidade**: Validar os nomes dos agentes (_Zya, Otto, Nexus, Max, Íris e Eco_).
2. **Estrutura no Código**:
    - Modelar no banco de dados a ativação de _Features/Agents_ por _Tenant_ (permitindo cobrar add-ons por agente).
    - Criar interface de contratação no Painel Urban/Rural: Uma "loja de funcionários digitais".
3. **Landing Pages**: Integrar esse discurso no Construtor de Landing Pages que está sendo desenhado.
