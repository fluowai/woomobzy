# ImobiSaaS - Multi-Tenant Architecture

Monorepo structure for multi-tenant SaaS deployment.

## Project Structure

```
imobisaas/
├── apps/
│   ├── admin/          # Admin panel (app.imobisaas.com)
│   └── site/           # Public sites (custom domains)
├── packages/
│   ├── database/       # Supabase client & types
│   ├── ui/            # Shared UI components
│   └── config/        # Shared configuration
└── server/            # API Node.js
```

## Domains

- **Admin**: `app.imobisaas.com` - Painel de edição
- **Sites**: Domínios customizados dos clientes
- **Subdomains**: `*.imobisaas.com` - Subdomínios gratuitos
