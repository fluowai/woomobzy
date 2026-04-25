# Relatório de Análise - Sistema WhatsApp (Baileys)

## 📋 Sumário Executivo

O sistema WhatsApp do IMOBZY apresenta **3 problemas críticos** identificados após análise detalhada do código:

| #   | Problema                                | Severidade  | Causa Raiz                                               |
| --- | --------------------------------------- | ----------- | -------------------------------------------------------- |
| 1   | Não envia mensagens pelo painel         | **CRÍTICA** | Socket não está sendo mantido em memória após boot       |
| 2   | Desconexão intermitente ao fazer logout | **ALTA**    | Lógica de reconexão não persiste após servidor reiniciar |
| 3   | Demora na reconexão automática          | **MÉDIA**   | Retry delay fixo de 5s sem backoff                       |

---

## 🔍 Análise Detalhada

### Problema 1: Não Envia Mensagens pelo Painel

**Sintoma**: Usuário consegue receber mensagens, mas ao tentar enviar pelo painel, recebe erro "Instância offline".

**Causa Raiz Identificada**:

O SessionManager não mantém automaticamente todas as instâncias conectadas após o boot do servidor:

```javascript
// SessionManager.js:49-55 - Apenas reconecta as que estavam "connected" no DB
const { data: instances } = await supabase
  .from('whatsapp_instances')
  .select('id, name, organization_id')
  .eq('status', 'connected');

for (const instance of instances || []) {
  await this.startSession(instance.id, instance.organization_id);
}
```

**Problema**: As credenciais podem estar salvas corretamente (o que explica receber mensagens), mas o socket em memória (`session.sock`) pode estar `null` ou desconectado mesmo com status "connected" no banco.

O método `sendMessage` verifica o socket em memória:

```javascript
// SessionManager.js:180-188
async sendMessage(instanceId, jid, text) {
  const session = this.sessions.get(instanceId);
  if (!session || !session.sock) {
    throw new Error("Instância não inicializada ou sem conexão ativa.");
  }
  // ...envia mensagem
}
```

**Fluxo Problema**:

1. Usuário faz login → instância "connected" no DB
2. Servidor reinicia → boot() reconecta apenas instâncias "connected"
3. Credenciais carregadas OK → recebe mensagens funcionam
4. Mas socket pode estar em estado inválido em memória
5. Ao enviar → `session.sock` é null → erro

---

### Problema 2: Desconexão Intermitente ao Fazer Logout

**Sintoma**: Ao fazer logout do sistema (não do WhatsApp), a instância WhatsApp se desconecta.

**Causa Raiz Identificada**:

O SessionManager trata todo `connection === 'close'` da mesma forma, sem distinguir logout do usuário de desconexão técnica:

```javascript
// SessionManager.js:126-148
if (connection === 'close') {
  const statusCode = lastDisconnect?.error?.output?.statusCode;
  const shouldReconnect = statusCode !== DisconnectReason?.loggedOut && ...;

  session.status = 'desconectado';
  await this.persistence.updateStatus(instanceId, 'disconnected', { qr_code: null });

  if (shouldReconnect && !session.isShuttingDown) {
    // Tentativa de reconexão automática
    setTimeout(async () => {
      await this.startSession(instanceId, organizationId);
    }, 5000);
  }
}
```

**Problema**: O código não diferencia:
-Logout do painel (usuário sai do sistema)
-Desconexão técnica do WhatsApp (sessão expirada, rede, etc)
-Desconexão forçada pelo servidor

Além disso, o `isShuttingDown` só é configurado quando chamamos `logout()` diretamente no SessionManager, mas não quando o servidor é reiniciado ou o usuário desloga do painel administrativo.

---

### Problema 3: Demora na Reconexão Automática

**Sintoma**: Quando a conexão cai, leva muito tempo para reconectar automaticamente.

**Causa Raiz Identificada**:

O delay de reconexão é fixo em 5 segundos sembackoff exponencial:

```javascript
// SessionManager.js:138-142
if (shouldReconnect && !session.isShuttingDown) {
  setTimeout(async () => {
    if (this.sessions.get(instanceId) === session) {
      await this.startSession(instanceId, organizationId);
    }
  }, 5000); // 5 segundos fixos
}
```

**Problema**:

- Sem backoff: tentativas successive esperam todas 5s
- Sem limite: pode tentar reconectar indefinidamente
- Sem log: difícil diagnosticar quanats tentativas ocorreram

---

## 🛠️ Recomendações de Correção

### Correção 1: Verificação de Socket Antes de Enviar

Adicionar health check no momento do envio:

```javascript
// No método sendMessage do SessionManager.js
async sendMessage(instanceId, jid, text) {
  const session = this.sessions.get(instanceId);

  // Se socket não existe ou não está connected, tenta reconectar
  if (!session?.sock) {
    console.log(`[WhatsApp] Socket não encontrado. Reconectando...`);
    await this.startSession(instanceId, session.organizationId);
    // Recarrega sessão
    session = this.sessions.get(instanceId);
  }

  if (!session || !session.sock) {
    throw new Error("Instância não inicializada ou sem conexão ativa.");
  }

  const result = await session.sock.sendMessage(jid, { text });
  return result;
}
```

### Correção 2: Diferenciar Logout de Desconexão

Adicionar flag para logout voluntário:

```javascript
// Adicionar no banco de dados:
ALTER TABLE whatsapp_instances ADD COLUMN logout_requested BOOLEAN DEFAULT false;

// No logout da API, marcar como logout_requested = true

// No SessionManager, verificar antes de reconectar:
if (shouldReconnect && !session.isShuttingDown && !logoutRequested) {
  // apenas reconecta se não foi logout voluntário
}
```

### Correção 3: Backoff Exponencial

Implementar retry com backoff:

```javascript
const RECONNECT_DELAYS = [1000, 2000, 4000, 8000, 16000, 30000]; // ms

async scheduleReconnect(instanceId, attempt = 0) {
  if (attempt >= RECONNECT_DELAYS.length) {
    console.log(`[WhatsApp] Max tentativas atingidas para ${instanceId}`);
    return;
  }

  const delay = RECONNECT_DELAYS[attempt];
  setTimeout(async () => {
    const session = this.sessions.get(instanceId);
    if (session && !session.isShuttingDown) {
      console.log(`[WhatsApp] Tentativa ${attempt + 1} para ${instanceId}`);
      await this.startSession(instanceId, session.organizationId);
    }
  }, delay);
}
```

### Correção 4: Health Check no Boot

Melhorar o boot para verificar socket:

```javascript
async boot() {
  const supabase = await this.persistence.getSupabaseClient();

  const { data: instances } = await supabase
    .from('whatsapp_instances')
    .select('*')
    .eq('status', 'connected');

  for (const instance of instances || []) {
    try {
      // Verifica se socket está vivo antes de usar
      const session = await this.startSession(instance.id, instance.organization_id);

      // Testa sending uma mensagem vazia para verificar conexão
      // Se falhar, marca como disconnected
    } catch (err) {
      console.error(`[WhatsApp] Boot falhou para ${instance.id}:`, err);
    }
  }
}
```

---

## 📊 Logs Relevantes para Monitoramento

Adicionar logs mais detalhados para diagnóstico:

```javascript
// Em sendMessage:
console.log(`[WhatsApp] 📤 Enviando para ${jid} via ${instanceId}`);

// Em connection.update:
console.log(
  `[WhatsApp] 🔌 Estado: ${connection}, LastDisconnect: ${lastDisconnect?.error?.output?.statusCode}`
);
```

---

## ✅ Próximos Passos

| Prioridade | Ação                                                 |
| ---------- | ---------------------------------------------------- |
| **1**      | Implementar health check antes de enviar mensagem    |
| **2**      | Adicionar flag de logout_requested no banco          |
| **3**      | Implementar backoff exponencial                      |
| **4**      | Adicionar logs de diagnóstico                        |
| **5**      | Criar endpoint de healthcheck `/api/whatsapp/health` |

---

_Relatório gerado em: ${new Date().toISOString()}_
_Analista: IMOBZY Code Analysis_
