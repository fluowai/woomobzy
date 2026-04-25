# Relatório de Análise Profunda: Identidade e Formatação WhatsApp (Baileys)

## 1. Diagnóstico do Problema de Nomes (pushName)

Após análise minuciosa dos arquivos `SessionManager.js`, `ContactStore.js` e `Chat.tsx`, identificamos o motivo exato pelo qual os nomes não estão sendo exibidos corretamente via `pushName`:

### A. O "Gap" de Persistência (Causa Principal)

No `SessionManager.js`, o sistema captura o `pushName` do remetente toda vez que uma mensagem chega (`messages.upsert`). No entanto, esse nome é salvo **apenas no cache de memória** do `ContactStore`.

- **Consequência:** Sempre que o servidor reinicia (o que acontece em deploys ou crashes), o cache é limpo. Como o Baileys não reenvia os metadados do contato em todas as mensagens, o sistema perde o nome e volta a exibir o número bruto ou o LID.
- **Falha:** O código atual só persiste contatos no banco de dados durante os eventos `contacts.upsert` e `contacts.update`, que são disparados raramente pelo WhatsApp.

### B. Fragmentação do LID (WhatsApp Moderno)

O WhatsApp agora usa identificadores internos chamados LIDs (15+ dígitos).

- O sistema atual tenta mapear LIDs para Números Reais (PN), mas não está persistindo esse mapeamento de forma agressiva o suficiente no banco de dados. Sem o mapeamento `LID -> PN`, a resolução do nome falha e exibe o ID técnico.

### C. Fallback Incompleto na API

A rota `/api/whatsapp/instances/:id/chats/:chatId/messages` possui uma lógica de resolução de nomes que tenta combinar dados do `ContactStore` e do `CRM (Leads)`. Se o vínculo entre o número no WhatsApp e o número no CRM falhar por causa de **formatação diferente**, o nome do Lead não é aplicado.

---

## 2. Diagnóstico da Formatação de Telefone

O usuário mencionou que o formato "já informado diversas vezes" não está sendo seguido. Analisando o código atual:

1. **Inconsistência de Normalização:**
   - No servidor (`SessionManager.js`), o número é tratado adicionando `+55` e mantendo o restante.
   - No frontend (`Chat.tsx`), existe uma função `formatDisplayJid` que tenta aplicar uma máscara.
   - **Problema do 9º Dígito:** O código não trata a inconsistência brasileira do 9º dígito (números antigos vêm sem o 9 do WhatsApp, mas no CRM são salvos com o 9). Isso quebra o vínculo entre Chat e Lead.

2. **Formato Esperado (Conforme Padrão IMOBZY):**
   - O formato padrão para banco de dados e integração de leads deve ser **E.164 Clean**: `55DD9XXXXXXXX` (apenas dígitos, com 55, com DDD e com o 9º dígito obrigatório para celulares).

---

## 3. Plano de Solução

### Passo 1: Persistência Agressiva no `SessionManager.js`

Atualizar o evento `messages.upsert` para que, ao detectar um `pushName` novo ou uma mudança de mapeamento LID, o sistema force um `upsert` no banco de dados `whatsapp_contacts` imediatamente.

### Passo 2: Unificação da Normalização no `ContactStore.js`

Criar uma função centralizada `normalizeBrazilianNumber` que:

- Remove símbolos.
- Garante o prefixo `55`.
- **Insere o 9º dígito automaticamente** para DDDs brasileiros de celular onde ele esteja ausente.

### Passo 3: Sincronização de Identidade (LID -> PN -> Nome)

Garantir que quando o WhatsApp enviar um LID, o sistema busque o Telefone Real vinculado e salve essa ponte no banco.

---

## 4. Implementação Sugerida (Próximos Passos)

1. **`ContactStore.js`**: Implementar `normalizeNumber(jid)` robusto.
2. **`SessionManager.js`**: Persistir `pushName` em tempo real durante o recebimento de mensagens.
3. **`Chat.tsx`**: Ajustar máscaras visuais para respeitar o formato normalizado.

---

**Analista:** Antigravity AI
**Data:** 24/04/2026
