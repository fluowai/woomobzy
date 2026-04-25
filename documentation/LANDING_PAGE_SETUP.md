# 🚀 Guia de Instalação - Sistema de Landing Pages

## 📦 Passo 1: Instalar Dependências

Execute o comando abaixo para instalar as bibliotecas necessárias para o drag-and-drop:

```bash
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

## 🗄️ Passo 2: Executar SQL no Supabase

1. Acesse o **Supabase Dashboard**
2. Vá em **SQL Editor**
3. Copie todo o conteúdo do arquivo `setup_landing_pages.sql`
4. Cole no editor e execute

Isso criará:

- 3 tabelas (landing_pages, landing_page_blocks, landing_page_analytics)
- Índices de performance
- RLS Policies
- Funções auxiliares
- Templates iniciais

## 🎨 Passo 3: Testar o Sistema

### Acessar o Gerenciador

```
http://localhost:5173/admin/landing-pages
```

### Criar Nova Landing Page

1. Clique em "Nova Landing Page"
2. Digite um nome (ex: "Fazendas Premium 2026")
3. O slug será gerado automaticamente
4. Clique em "Criar e Editar"

### Usar o Editor

1. **Adicionar Blocos**: Arraste blocos da sidebar esquerda
2. **Configurar**: Clique em um bloco e edite no painel direito
3. **Reordenar**: Arraste blocos para cima/baixo
4. **Estilizar**: Use a aba "Estilo" para customizar CSS
5. **Tema**: Clique em "Tema" para mudar cores e fontes
6. **SEO**: Clique em "SEO" para meta tags
7. **Salvar**: Clique em "Salvar" (ou aguarde auto-save)
8. **Preview**: Clique em "Preview" para visualizar
9. **Publicar**: Clique em "Publicar" quando estiver pronto

## 🔧 Troubleshooting

### Erro: "Module not found: @dnd-kit/core"

**Solução**: Execute `npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities`

### Erro: "relation landing_pages does not exist"

**Solução**: Execute o SQL `setup_landing_pages.sql` no Supabase

### Erro: "Cannot read property 'organizationId'"

**Solução**: Verifique se está logado no sistema

### Landing pages não aparecem

**Solução**: Verifique se as RLS policies foram criadas corretamente

## 📝 Arquivos Criados

### SQL

- `setup_landing_pages.sql` - Schema completo

### Tipos

- `types/landingPage.ts` - Tipos TypeScript

### Serviços

- `services/landingPages.ts` - API Service

### Views

- `views/LandingPageManager.tsx` - Gerenciador
- `views/LandingPageEditor.tsx` - Editor

### Componentes do Editor

- `components/LandingPageEditor/BlocksSidebar.tsx`
- `components/LandingPageEditor/CanvasArea.tsx`
- `components/LandingPageEditor/PropertiesSidebar.tsx`
- `components/LandingPageEditor/BlockStylesEditor.tsx`
- `components/LandingPageEditor/ThemeCustomizer.tsx`
- `components/LandingPageEditor/SEOSettings.tsx`

### Blocos

- `components/LandingPageBlocks/HeroBlock.tsx`
- `components/LandingPageBlocks/PropertyGridBlock.tsx`
- `components/LandingPageBlocks/TextBlock.tsx`
- `components/LandingPageBlocks/FormBlock.tsx`
- `components/LandingPageBlocks/CTABlock.tsx`
- `components/LandingPageBlocks/SpacerBlock.tsx`

### Configurações de Blocos

- `components/LandingPageBlocks/Settings/HeroBlockSettings.tsx`
- `components/LandingPageBlocks/Settings/PropertyGridBlockSettings.tsx`
- `components/LandingPageBlocks/Settings/TextBlockSettings.tsx`
- `components/LandingPageBlocks/Settings/FormBlockSettings.tsx`
- `components/LandingPageBlocks/Settings/CTABlockSettings.tsx`
- `components/LandingPageBlocks/Settings/SpacerBlockSettings.tsx`

## ✅ Checklist de Verificação

- [ ] Dependências instaladas (`npm install`)
- [ ] SQL executado no Supabase
- [ ] Rotas adicionadas no App.tsx (✅ Feito automaticamente)
- [ ] Servidor rodando (`npm run dev`)
- [ ] Acesso a `/admin/landing-pages` funcionando
- [ ] Criação de landing page funcionando
- [ ] Editor abrindo corretamente
- [ ] Blocos sendo adicionados
- [ ] Configurações sendo salvas

## 🎯 Próximas Funcionalidades

### Curto Prazo

- [ ] Página pública de visualização (`/lp/:slug`)
- [ ] Seletor visual de imóveis
- [ ] Mais blocos (Image, Video, Testimonials, etc)
- [ ] Templates prontos

### Médio Prazo

- [ ] Analytics dashboard
- [ ] A/B Testing
- [ ] Integração com formulários (criar leads)
- [ ] Export/Import de páginas

### Longo Prazo

- [ ] Marketplace de templates
- [ ] Colaboração em tempo real
- [ ] Versionamento de páginas
- [ ] Agendamento de publicação

## 📞 Suporte

Em caso de dúvidas ou problemas:

1. Verifique o console do navegador (F12)
2. Verifique o terminal do servidor
3. Revise o arquivo `LANDING_PAGE_IMPLEMENTATION.md`
4. Consulte a documentação do Supabase

---

**Status**: Sistema funcional e pronto para uso! 🎉
**Versão**: 1.0.0
**Data**: 2026-01-14
