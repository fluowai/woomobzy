# Configuração de Domínios SaaS na Vercel

Para que o sistema de domínios automáticos (`subdominio.consultio.com.br`) e domínios personalizados (`cliente.com.br`) funcione, você precisa configurar as variáveis no arquivo `.env` do seu servidor:

## 1. Variáveis de Ambiente (.env)

```env
# Vercel Integration
VERCEL_API_TOKEN=seu_token_aqui
VERCEL_PROJECT_ID=id_do_projeto_na_vercel
VERCEL_TEAM_ID=id_do_seu_time_se_houver
WHM_MAIN_DOMAIN=consultio.com.br
```

### Como obter:
- **API Token**: Vá em [Vercel Account Settings > Tokens](https://vercel.com/account/tokens).
- **Project ID**: Vá nas configurações do seu projeto na Vercel > General > Project ID.

---

## 2. Configuração de DNS (Consultio.com.br)

Para que os subdomínios funcionem **instantaneamente** sem você precisar configurar o DNS para cada cliente, você deve criar um registro **Wildcard**:

- **Tipo**: `A` ou `CNAME`
- **Nome/Host**: `*`
- **Valor**: `76.76.21.21` (ou o CNAME `cname.vercel-dns.com`)

---

## 3. O que foi implementado hoje:
- [x] **Subdomínios Automáticos**: No Onboarding, o sistema agora envia o comando para a Vercel registrar o subdomínio.
- [x] **Gestão de Domínios Customizados**: No painel de Super Admin, você pode cadastrar o domínio próprio do cliente. O sistema vai registrá-lo na Vercel e o cliente só precisará apontar o CNAME dele para o seu subdomínio.
- [x] **Verificador de Status**: Uma ferramenta para conferir se o DNS do cliente já propagou corretamente.
