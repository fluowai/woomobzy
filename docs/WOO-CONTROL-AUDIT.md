# WOO CONTROL AUDIT REPORT

## 1. Arquitetura encontrada
- **Frontend**: React 19, Vite, Tailwind CSS v4, React Router v7.
- **Backend**: Express (Node.js) com APIs REST e WebSocket.
- **Banco de Dados**: PostgreSQL através do Supabase.
- **ORM / Acesso a Dados**: @supabase/supabase-js, prisma (menções nos arquivos de fix).
- **Autenticação**: Supabase Auth (JWT).
- **Storage**: MinIO (S3 compatible) para media e WhatsApp, Supabase Storage para outras coisas.
- **Serviços Adicionais**: RabbitMQ, Traefik, WhatsApp Service (whatsmeow via API Node), Agro Intelligence Service.

## 2. Estrutura atual do Mega Admin
- Atualmente centrado no papel `superadmin` na tabela `profiles`.
- A interface Mega Admin (encontrada no layout ativo) e as policies RLS dão controle global aos usuários `superadmin`.
- Este perfil possui acesso a todas as organizações, planos e configurações.

## 3. Modelo multi-tenant
- Realizado através da tabela `organizations`. Todas as tabelas dependentes (profiles, properties, leads, etc.) possuem `organization_id`.
- Tenant isolation é implementado com RLS no PostgreSQL (Supabase), checando se o usuário pertence à organização logada, exceto para `superadmin` que tem by-pass.
- Organizações não possuem hierarquia (falta `parent_id` e `type`).

## 4. RBAC atual
- Papéis na tabela `profiles`: `superadmin`, `admin`, `gerente`, `broker`, `assistente`, `user`.
- O RLS é amplamente implementado baseado neste `role`. Não existe controle granular de permissões (tabela de permissões customizadas).

## 5. Tabelas existentes (Principais)
- `organizations` (tenants)
- `profiles` (usuários)
- `domains` (domínios customizados)
- `properties`, `property_polygons` (imóveis e polígonos rurais)
- `leads`, `crm_leads` (gestão de clientes)
- Tabelas de integração (WhatsApp, storage, portal)

## 6. Infraestrutura Docker
- `docker-compose.yml` usa Traefik como reverse proxy com Let's Encrypt.
- Serviços: `frontend` (ghcr.io), `api`, `whatsapp-service`, `rabbitmq`, `agro-intelligence`.
- Rede overlay Swarm / Docker interna.

## 7. CI/CD
- Repositório contém diretório `.github` (deduzido), scripts de migração (`auto-migrate.mjs`), Playwright para E2E tests, vitest para unitários.
- Builds multi-stage para containers (`Dockerfile.frontend`, `Dockerfile.api`, `Dockerfile.whatsapp`, etc.).

## 8. Componentes reutilizáveis
- Componentes UI padrão de mercado (`lucide-react`, `framer-motion`, `dnd-kit`, `recharts`).
- Estrutura clara no React (`/components`, `/views`, `/services`, `/context`).

## 9. Problemas encontrados
- **Falta de Hierarquia**: A tabela `organizations` é "flat", inviabilizando o modelo `MASTER_RESELLER -> RESELLER -> CUSTOMER`.
- **Falta de Role `PLATFORM_OWNER`**: A plataforma limita-se ao `superadmin` global.
- **RBAC Limitado**: Permissões são hardcoded em policies baseadas na role (ex: `role = 'admin'`).
- **Inexistência de Licensing/Snapshots**: Não há tabelas para licenças (Grace, Suspensions, Leases) nem sistema para Snapshots e Deployments.

## 10. Mudanças necessárias
1. Adicionar `parent_id` e `type` à tabela `organizations`.
2. Expandir RBAC: Criar tabelas `roles` e `role_permissions`, ou ao menos adicionar `PLATFORM_OWNER`, `MASTER_RESELLER`, `RESELLER`.
3. Criar a tabela e APIs para licenciamento, snapshots, produtos, releases, deployments, suporte e assinaturas (`billing`).
4. Desenvolver o painel **Woo Control** como interface premium acima do Mega Admin existente.
5. Implementar heartbeats e validação criptográfica de licenças.

## 11. Plano de migração
1. Migrar schema do BD para adicionar hierarquia. Transformar `superadmin` atual logicamente em `MASTER_RESELLER` onde aplicável e criar um `PLATFORM_OWNER` root.
2. Criar tabela de permissões granulares e atualizar RLS.
3. Desenvolver o novo painel `Woo Control` mantendo a interface `Mega Admin` intacta, para não quebrar revendas existentes.

## 12. Riscos
- **Performance de RLS**: Queries recursivas em policies RLS (para checar a árvore da organização) podem causar latência significativa e loops infinitos. Caching na sessão (claims do JWT) ou materialized paths/Ltree são altamente recomendados.
- **Quebra de Tenants Ativos**: Modificações no `superadmin` podem tirar o acesso da operação atual. Migração cuidadosa é necessária.
- **Vazamento Cross-tenant**: Mudança no RBAC pode introduzir falhas na view das revendas.
