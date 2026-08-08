# Spec — Onboarding Rápido + WhatsApp QR no Fluxo

Status: EM PROGRESSO (Wave 1)
Data: 2026-08-05

## Objetivo

Tornar o onboarding de novas contas rápido e conectar o WhatsApp nele, sem
passos opcionais que atrasam a criação.

## Problemas atuais

1. O passo "Conexão WhatsApp" (Etapa 3) é só um placeholder — nunca gera QR.
2. O onboarding tem 4 passos, 2 totalmente opcionais (IA e Equipe), o que
   torna o fluxo mais longo do que o necessário.
3. `POST /api/onboarding` cria conta + organização, mas não autentica o
   usuário no cliente e não cria instância do WhatsApp.

## Mudanças (Wave 1)

### Fluxo novo (3 passos)

1. **Crie sua conta** (essencial): nome, email, senha, nome da imobiliária,
   nicho (urbano/rural), tema do site.
   Ao concluir: `POST /api/onboarding` → **auto-login**
   (`supabase.auth.signInWithPassword`) + `setActiveOrganizationId`.
2. **Conecte o WhatsApp**: cria instância (`instanceApi.create`) e exibe o
   `QRCodeModal` real reutilizado do painel. Permite "pular" (vira `disconnected`).
   Passo cancelado sem organização (ex.: 1º usuário superadmin).
3. **Concluído**: mostra o site + "Acessar meu painel".

Passos de IA e Equipe viram opcionais pós-onboarding (painel), fora o valor
de saudação da IA mantido como texto padrão na instância.

### Integração WhatsApp (frontend)

- Reutilizar `views/WhatsApp/QRCodeModal.tsx` (polling/WS já prontos).
- Criar instância com `instanceApi.create('WhatsApp')` ao entrar na etapa de WhatsApp.
- Tratativa de limite de registro do plano e de serviço indisponível: mostra
  erro + botão "Acessar painel" (continua).

## Fora de escopo nesta Wave (Wave 2 proposto)

- **Domínio personalizado obrigatório** no onboarding (capturar e validar
  domínio próprio do cliente). A base já existe
  (`server/routes/domains.js`, RPC `get_tenant_by_any_domain`, `DomainRouter`),
  falta capturar/validar no onboarding e provisionar.

## Critérios de aceite

1. Criar conta conclui com auto-login e navega para a etapa WhatsApp.
2. Na etapa WhatsApp o QR real aparece e atualiza (polling + WS);
   conexão fechada ao conectar.
3. "Pular" segue para concluído sem instância conectada.
4. Existe "Acessar meu painel" levando a `/urban` ou `/rural`.
5. `npm run type-check` e `npm run lint` passam.
