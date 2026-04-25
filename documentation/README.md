# IMOBZY - Real Estate CRM & Portal

Aplicação full-stack para CRM e portal imobiliário com suporte a multi-tenancy, nichos rural e urbano, integração com Supabase, React/TypeScript no frontend e Node.js/Express no backend.

## Funcionalidades

- **Multi-tenancy**: Suporte a organizações com domínios customizados.
- **Nichos**: Rural (com GIS/PostGIS) e Urbano.
- **CRM**: Kanban, leads, contratos.
- **Editor Visual**: Landing pages customizáveis.
- **Integrações**: IA (Google GenAI, Groq), WhatsApp, mapas (Leaflet).
- **Segurança**: Autenticação Supabase, RLS.

## Pré-requisitos

- Node.js (versão 18+)
- Supabase account
- API keys para Gemini e Groq

## Instalação

1. Clone o repositório:
   ```bash
   git clone <repo-url>
   cd imobzy
   ```

2. Instale dependências:
   ```bash
   npm install
   ```

3. Configure variáveis de ambiente:
   - Copie `.env.local` de `.env.production.template`
   - Adicione `GEMINI_API_KEY` e outras chaves necessárias.

4. Configure o banco:
   - Execute os scripts SQL em `migrations/` no Supabase.

## Scripts Disponíveis

- `npm run dev`: Inicia o servidor de desenvolvimento (porta 3005)
- `npm run server`: Inicia o backend (porta 3002)
- `npm run build`: Build para produção
- `npm run preview`: Preview do build
- `npm run lint`: Verifica linting
- `npm run lint:fix`: Corrige problemas de linting
- `npm run format`: Formata código com Prettier
- `npm run test`: Executa testes
- `npm run type-check`: Verifica tipos TypeScript

## Estrutura do Projeto

- `src/`: Código fonte React/TypeScript
- `server/`: Backend Node.js/Express
- `migrations/`: Scripts SQL para banco
- `scripts/`: Utilitários de manutenção

## Deploy

- Frontend: Vercel
- Backend: Supabase Functions ou servidor próprio

## Contribuição

1. Fork o projeto
2. Crie uma branch: `git checkout -b feature/nova-funcionalidade`
3. Commit: `git commit -m 'Adiciona nova funcionalidade'`
4. Push: `git push origin feature/nova-funcionalidade`
5. Abra um Pull Request

## Licença

[Licença]
