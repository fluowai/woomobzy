# Runbook — Plano B WhatsApp (Cloud API)

## Cenário

Provedor primário (Twilio/360dialog/etc.) indisponível ou
com custo elevado. Fallback para **WhatsApp Cloud API** (Meta).

## Variáveis

```
WHATSAPP_PROVIDER=cloud            # primary | cloud
WHATSAPP_FALLBACK_ENABLED=true
WHATSAPP_CLOUD_TOKEN=EAAG...
WHATSAPP_CLOUD_PHONE_ID=1234567890
WHATSAPP_CLOUD_VERIFY_TOKEN=<random>
```

## Chaveamento

1. Health check periódico bate em `/health/whatsapp` no provedor
   primário. 3 falhas consecutivas → seta `WHATSAPP_PROVIDER=cloud`
   via feature flag (LaunchDarkly / env reload).
2. Endpoint `POST /api/whatsapp/send` lê a flag e roteia:
   - `primary` → SDK atual
   - `cloud` → `https://graph.facebook.com/v20.0/{phone_id}/messages`

## Configuração Meta

1. Meta for Developers → *Create App* → Business.
2. Adicionar produto **WhatsApp** → *Getting Started*.
3. Copiar `Phone number ID` e gerar token permanente via
   *System Users* (Business Manager → Users → System Users →
   Generate New Token → escopo `whatsapp_business_messaging`).
4. Webhook: URL `https://<domain>/api/whatsapp/webhook`, verify
   token = `WHATSAPP_CLOUD_VERIFY_TOKEN`.

## Custo

Cloud API cobra por conversa (24h window). Ver
https://developers.facebook.com/docs/whatsapp/pricing.

## Rollback

Set `WHATSAPP_PROVIDER=primary` — sem redeploy necessário se a flag
for lida a cada request.
