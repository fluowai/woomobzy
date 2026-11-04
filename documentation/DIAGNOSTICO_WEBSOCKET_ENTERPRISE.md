# 🚀 Guia Corporativo DevOps & Backend: Diagnóstico e Resolução de WebSockets em Produção (Docker + Portainer)

Este guia foi elaborado para diagnosticar, corrigir e evitar falhas de conexão de WebSockets (`wss://app.imobfluow.com.br/api/whatsapp/ws`) em ambientes de produção sob arquitetura de microsserviços rodando em containers Docker.

---

## 🔍 1. Análise de Causas Raiz e Diagnóstico Técnico

Em uma arquitetura de microsserviços baseada em Docker, a conexão WebSocket passa por várias camadas. A falha de handshake (`WebSocket connection failed`) geralmente ocorre devido a um dos seguintes gargalos:

### A. Ausência de Headers de Upgrade no Proxy Reverso (Nginx/Traefik/NPM)
Diferente de conexões HTTP comuns, o WebSocket inicia com um handshake HTTP que solicita o upgrade da conexão através dos cabeçalhos `Upgrade: websocket` e `Connection: Upgrade`.
* **Sintoma**: O cliente tenta conectar e recebe `HTTP 400 Bad Request` ou `HTTP 502 Bad Gateway` logo após o handshake.
* **Causa**: O proxy reverso de borda (ex.: Nginx Proxy Manager, Cloudflare, Traefik) não está explicitamente configurado para repassar os cabeçalhos de upgrade.

### B. Mapeamento de Portas e Redes Isoladas no Docker
Se o container do backend (`api`) ou do proxy reverso de borda não estiver na mesma rede interna do Docker (`bridge` compartilhada ou `overlay`), os pacotes não chegarão ao destino.
* **Sintoma**: Erro `502 Bad Gateway` ou `504 Gateway Timeout`.

### C. Validação de JWT e Token Expirado no Handshake
Em conexões WebSocket, o token (`ws_token`) é comumente passado na query string (`?ws_token=...`) porque os clientes WebSocket do navegador não suportam cabeçalhos `Authorization` nativos.
* **Sintoma**: O WebSocket conecta por milissegundos e fecha com código `1008` (Policy Violation) ou `401 Unauthorized`.
* **Causa**: O backend falha ao decodificar a query string ou o token expira antes do processamento.

---

## 🛡️ 2. Configurações Prontas para Produção (Enterprise-Level)

### A. Configuração do Nginx (Proxy Reverso de Borda)

Se você utiliza o **Nginx puro**, salve esta configuração em `/etc/nginx/conf.d/imobzy.conf`. Ela garante o repasse correto do upgrade e previne timeouts por inatividade:

```nginx
# /etc/nginx/conf.d/imobzy.conf
map $http_upgrade $connection_upgrade {
    default upgrade;
    ''      close;
}

server {
    listen 80;
    listen [::]:80;
    server_name app.imobfluow.com.br;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name app.imobfluow.com.br;

    # SSL Configs (Let's Encrypt / Cloudflare)
    ssl_certificate /etc/letsencrypt/live/app.imobfluow.com.br/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/app.imobfluow.com.br/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # Frontend
    location / {
        proxy_pass http://frontend:80;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # API Standard REST
    location /api/ {
        proxy_pass http://api:3002;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # API WhatsApp WebSocket Upgrade
    location /api/whatsapp/ws {
        proxy_pass http://api:3002;

        # Protocol Upgrade
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection $connection_upgrade;

        # Standard Headers
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Timeouts estendidos para conexões persistentes (evita desconexões a cada 60s)
        proxy_read_timeout 86400; # 24 horas
        proxy_send_timeout 86400;
        
        # Buffer desabilitado para WebSockets em tempo real
        proxy_buffering off;
    }
}
```

---

### B. Docker Compose Completo para Produção (Enterprise Stack)

Este arquivo descreve uma arquitetura estável com Nginx integrado, verificação de saúde (`healthcheck`), e rede isolada.

```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  # Nginx como Entrypoint de Borda com SSL automático via volume
  nginx:
    image: nginx:1.25-alpine
    container_name: imobzy-nginx
    restart: always
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./docker/nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./docker/nginx/conf.d:/etc/nginx/conf.d:ro
      - /etc/letsencrypt:/etc/letsencrypt:ro
    networks:
      - imobzy-network
    depends_on:
      api:
        condition: service_healthy
      frontend:
        condition: service_started

  # Backend em Node.js com Validação JWT & Websocket Proxy
  api:
    image: woomobzy-backend:latest
    container_name: imobzy-api
    build:
      context: .
      dockerfile: Dockerfile.api
    restart: always
    env_file:
      - .env.production
    environment:
      NODE_ENV: production
      PORT: 3002
      WHATSAPP_API_URL: http://whatsapp-service:3100
      WHATSMEOW_URL: http://whatsapp-service:3100
      REDIS_URL: redis://redis-pubsub:6379
    expose:
      - "3002"
    networks:
      - imobzy-network
    depends_on:
      - redis-pubsub
      - whatsapp-service
    healthcheck:
      test: ["CMD", "wget", "--spider", "-q", "http://localhost:3002/health"]
      interval: 15s
      timeout: 5s
      retries: 3
      start_period: 10s

  # Microsserviço de Integração WhatsApp em Go (WhatsMeow)
  whatsapp-service:
    image: woomobzy-whatsapp:latest
    container_name: imobzy-whatsapp
    build:
      context: .
      dockerfile: Dockerfile.whatsapp
    restart: always
    env_file:
      - .env.production
    environment:
      NODE_ENV: production
      PORT: 3100
      NODE_URL: http://api:3002
    volumes:
      - whatsapp_sessions:/app/.sessions
    expose:
      - "3100"
    networks:
      - imobzy-network

  # Redis para Pub/Sub e Clusterização do WebSocket (Horizontal Scaling)
  redis-pubsub:
    image: redis:7.2-alpine
    container_name: imobzy-redis
    restart: always
    expose:
      - "6379"
    volumes:
      - redis_data:/data
    networks:
      - imobzy-network
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 3

  # Aplicativo Frontend (Static Server Nginx)
  frontend:
    image: woomobzy-frontend:latest
    container_name: imobzy-frontend
    build:
      context: .
      dockerfile: Dockerfile.frontend
    restart: always
    networks:
      - imobzy-network

networks:
  imobzy-network:
    driver: bridge

volumes:
  whatsapp_sessions:
    driver: local
  redis_data:
    driver: local
```

---

### C. Backend Node.js WebSocket Altamente Robusto (ws com JWT e Heartbeat)

Este script fornece a lógica para implementar no seu servidor Express para receber, validar e gerenciar a escuta WebSocket ativa do WhatsApp:

```javascript
// server/lib/WebSocketServer.js
import { WebSocketServer } from 'ws';
import jwt from 'jsonwebtoken';
import { createClient } from 'redis'; // Opcional: Escalar horizontalmente

export class EnterpriseWebSocketServer {
  constructor(server, config = {}) {
    this.wss = new WebSocketServer({ noServer: true });
    this.secret = config.jwtSecret || process.env.SUPABASE_JWT_SECRET;
    this.logger = config.logger || console;
    
    this.init(server);
  }

  init(server) {
    // Escuta requisições de Upgrade do Servidor HTTP
    server.on('upgrade', (request, socket, head) => {
      const url = new URL(request.url, `http://${request.headers.host}`);
      const wsToken = url.searchParams.get('ws_token');

      if (!request.url.startsWith('/api/whatsapp/ws')) {
        return; // Ignora rotas não relacionadas
      }

      this.logger.info(`[WS Handshake] Recebendo conexão de: ${request.socket.remoteAddress}`);

      // Validação do JWT Token no Handshake
      try {
        if (!wsToken) {
          throw new Error('Token ausente');
        }

        const decoded = jwt.verify(wsToken, this.secret);
        
        if (decoded.purpose !== 'whatsapp_ws') {
          throw new Error('Propósito do token inválido');
        }

        // Validação bem-sucedida, realiza o upgrade
        this.wss.handleUpgrade(request, socket, head, (ws) => {
          ws.userId = decoded.sub;
          ws.orgId = decoded.org_id;
          ws.isAlive = true;

          this.wss.emit('connection', ws, request);
        });

      } catch (err) {
        this.logger.error(`[WS Handshake Reject] ❌ Falha na autenticação: ${err.message}`);
        socket.write('HTTP/1.1 401 Unauthorized\r\nConnection: close\r\n\r\n');
        socket.destroy();
      }
    });

    // Eventos de Conexão Ativa
    this.wss.on('connection', (ws) => {
      this.logger.info(`[WS Connection] ✅ Conectado! User: ${ws.userId} | Org: ${ws.orgId}`);

      // Configuração de Ping-Pong Heartbeat para evitar desconexão silenciosa
      ws.on('pong', () => {
        ws.isAlive = true;
      });

      ws.on('message', (message) => {
        try {
          const payload = JSON.parse(message.toString());
          this.logger.info(`[WS Received] Mensagem de ${ws.userId}:`, payload);
          
          // Trate mensagens recebidas do cliente se necessário
        } catch (e) {
          this.logger.error('[WS Message Error] Payload inválido recebido:', message);
        }
      });

      ws.on('close', (code, reason) => {
        this.logger.warn(`[WS Closed] Conexão encerrada pelo cliente. Código: ${code} | Motivo: ${reason}`);
      });

      ws.on('error', (error) => {
        this.logger.error('[WS Client Error] Erro detectado no cliente:', error);
      });
    });

    // Intervalo de verificação de conexão morta (Heartbeat a cada 30 segundos)
    const interval = setInterval(() => {
      this.wss.clients.forEach((ws) => {
        if (ws.isAlive === false) {
          this.logger.warn(`[WS Heartbeat] 👻 Cliente inativo detectado (User: ${ws.userId}). Terminando.`);
          return ws.terminate();
        }

        ws.isAlive = false;
        ws.ping(); // Envia um Ping para o cliente. Se ele responder, define isAlive = true no evento pong
      });
    }, 30000);

    this.wss.on('close', () => {
      clearInterval(interval);
    });
  }

  // Função para transmitir atualizações do WhatsApp em tempo real apenas para o cliente daquela Organização (Isolation)
  broadcastToOrg(orgId, eventName, data) {
    const payload = JSON.stringify({ event: eventName, data });
    let count = 0;

    this.wss.clients.forEach((client) => {
      if (client.readyState === 1 && client.orgId === orgId) {
        client.send(payload);
        count++;
      }
    });

    this.logger.info(`[WS Broadcast] Transmitido ${eventName} para ${count} clientes da Org: ${orgId}`);
  }
}
```

---

### D. Frontend: Reconexão Automática e Exponential Backoff

Implemente esta lógica robusta no frontend (`App.tsx` ou hook `useWebSocket.ts`) para lidar com instabilidades temporárias de rede:

```javascript
// frontend/src/hooks/useWebSocket.ts
export class RobustWebSocketClient {
  constructor(urlGenerator, options = {}) {
    this.urlGenerator = urlGenerator; // Função que retorna a URL com o token atualizado
    this.options = {
      maxReconnectAttempts: 10,
      initialReconnectDelay: 1000,
      maxReconnectDelay: 30000,
      pingInterval: 25000,
      ...options
    };
    
    this.reconnectAttempts = 0;
    this.ws = null;
    this.pingTimer = null;
    this.connect();
  }

  connect() {
    const url = this.urlGenerator();
    console.log(`[WS Client] 🔌 Conectando a ${url.split('?')[0]}...`);
    
    this.ws = new WebSocket(url);

    this.ws.onopen = () => {
      console.log('[WS Client] ✅ Conexão estabelecida com sucesso!');
      this.reconnectAttempts = 0;
      this.startHeartbeat();
    };

    this.ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        if (this.options.onMessage) {
          this.options.onMessage(message);
        }
      } catch (err) {
        console.warn('[WS Client] Mensagem não parseável recebida:', event.data);
      }
    };

    this.ws.onclose = (event) => {
      console.warn(`[WS Client] ❌ Conexão perdida. Código: ${event.code}.`);
      this.stopHeartbeat();
      this.handleReconnect();
    };

    this.ws.onerror = (error) => {
      console.error('[WS Client Error] Erro detectado na conexão:', error);
    };
  }

  handleReconnect() {
    if (this.reconnectAttempts >= this.options.maxReconnectAttempts) {
      console.error('[WS Client] Max tentativas de reconexão atingidas. Por favor, recarregue a página.');
      if (this.options.onMaxReconnectReached) {
        this.options.onMaxReconnectReached();
      }
      return;
    }

    // Exponential Backoff com jitter aleatório para evitar sobrecarga (thundering herd)
    const delay = Math.min(
      this.options.initialReconnectDelay * Math.pow(2, this.reconnectAttempts) + Math.random() * 1000,
      this.options.maxReconnectDelay
    );

    this.reconnectAttempts++;
    console.log(`[WS Client] Tentativa de reconexão ${this.reconnectAttempts} em ${Math.round(delay)}ms...`);
    
    setTimeout(() => {
      this.connect();
    }, delay);
  }

  startHeartbeat() {
    // Evita desconexão automática do navegador por inatividade de canais HTTP/2
    this.pingTimer = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'ping' }));
      }
    }, this.options.pingInterval);
  }

  stopHeartbeat() {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
  }

  close() {
    this.stopHeartbeat();
    if (this.ws) {
      this.ws.onclose = null; // Evita loop de reconexão manual
      this.ws.close();
    }
  }
}
```

---

## 🛠️ 3. Comandos de Diagnóstico e Depuração (Terminal SSH/Docker)

Ao enfrentar o erro em ambiente Docker sob Portainer ou Nginx Proxy Manager, execute estes comandos no servidor de produção:

### A. Monitoramento de Logs em Tempo Real
```bash
# Monitora os logs do container da API buscando erros de WebSocket
docker logs -f imobzy-api --tail 100 | grep -iE 'ws|websocket|upgrade'

# Verifica os logs de tráfego do Nginx (ou Caddy/Traefik) buscando handshakes recusados
docker logs -f imobzy-nginx --tail 100 | grep -i 'ws'
```

### B. Depuração Direta no Servidor via `wscat`
Instale o utilitário `wscat` localmente no servidor ou em sua máquina para testar a conexão diretamente ignorando o navegador:
```bash
# Instalação rápida do utilitário
npm install -g wscat

# Testa a conexão segura informando o token de teste (Substitua o token completo)
wscat -c "wss://app.imobfluow.com.br/api/whatsapp/ws?ws_token=SUA_JWT_TOKEN"
```
*Se conectar e exibir `Connected (press CTRL+C to quit)`, a infraestrutura e o token estão perfeitos.*

### C. Verificação de portas e escuta ativa no container
Verifique se a API de fato está ouvindo a porta interna `3002`:
```bash
# Entra no container do backend e executa verificação de conexões abertas
docker exec -it imobzy-api netstat -tulpn | grep 3002
```

### D. Depuração de Resolução DNS e SSL Handshake
```bash
# Verifica se o endpoint está retornando os cabeçalhos de upgrade esperados
curl -i -N \
  -H "Connection: Upgrade" \
  -H "Upgrade: websocket" \
  -H "Host: app.imobfluow.com.br" \
  -H "Origin: https://app.imobfluow.com.br" \
  "https://app.imobfluow.com.br/api/whatsapp/ws?ws_token=SEU_TOKEN"
```

---

## 📁 4. Compatibilidade com Painéis de Gerenciamento

Se você está rodando o ecossistema sob um destes gerenciadores, aplique estes passos específicos:

### A. Nginx Proxy Manager (NPM)
1. Vá até a aba **Proxy Hosts** e edite a entrada `app.imobfluow.com.br`.
2. Localize o botão seletor **Websockets Support** e ative-o (coloque em `ON`).
3. Clique em **Save**.
   * *Nota*: O NPM gerencia os blocos de upgrade automaticamente em segundo plano ao ativar esta opção.

### B. Portainer
* Certifique-se de que o container do Caddy/Nginx e o container do backend estão compartilhando a **mesma rede** (ex: `imobzy-network` criada como `bridge`).
* No painel do Portainer, selecione os containers, clique em **Network** na parte inferior e ative a conexão deles à rede de tráfego interno caso estejam isolados.

### C. Coolify
Se estiver implantando via Coolify:
1. Acesse as configurações da aplicação.
2. Nas configurações do domínio ou no painel de rotas de destino, certifique-se de desmarcar qualquer compressão agressiva que interfira na resposta HTTP/1.1 de upgrade.
3. Garanta que a variável `PORT` está exposta corretamente no arquivo Dockerfile.

---

## 📋 5. Checklist Completo de Validação para Produção

- [ ] **Toggles do Proxy Reverso**: A opção de suporte WebSocket está habilitada no gerenciador (Nginx Proxy Manager / Traefik)?
- [ ] **Configuração do Nginx**: O bloco `location` repassa `$http_upgrade` e define `Connection: "Upgrade"`?
- [ ] **Validade do Token**: A expiração (`exp`) do token de WebSocket não está curta demais? (Recomenda-se de 2 a 5 minutos apenas para realizar o handshake inicial).
- [ ] **Certificado SSL**: O domínio possui certificado SSL/TLS ativo e válido? (Websockets seguros `wss` são rejeitados se o certificado do domínio estiver expirado ou autoassinado).
- [ ] **Heartbeat Configurado**: O Ping-Pong interno no Node.js está limpando conexões zumbis a cada 30 segundos?
- [ ] **Timeouts do Gateway**: O timeout de leitura e envio do proxy reverso de borda é maior do que 60 segundos (preferencialmente 86400s) para impedir desconexão periódica automática?
- [ ] **CORS**: O backend aceita handshakes WebSocket com origem (`Origin`) vinda do domínio do frontend?
