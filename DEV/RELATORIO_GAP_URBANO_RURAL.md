# Relatório — Gaps Urbano × Rural (o que foi aplicado no urbano e não no rural)

> Data: 2026-07-30
> Objetivo: identificar mudanças de UI/UX aplicadas no painel **Urbano** que ainda **não** foram refletidas no painel **Rural**, a partir do pedido do usuário sobre o menu esquerdo "sanfona".

## Resumo executivo

O item principal pedido — **menu lateral esquerdo colapsável (mini-sidebar/sanfona)** — existe **somente no Urbano** (`components/UrbanLayout.tsx`). O `components/RuralLayout.tsx` nunca foi tocado pelos commits de sidebar, então o Rural permanece com menu fixo de 272px sem colapso.

As demais alterações dos mesmos commits foram feitas em **views compartilhadas** (WhatsAppDashboard, LegalContracts, PropertyManagement, RentalsManagement, IADashboardSummary, blocos de landing page) — essas já valem para os dois painéis e **não precisam de port** (ver seção "Sem gap").

## Método

1. Histórico git dos commits de sidebar: `32354f3`, `080601a`, `3270e68` (mini-sidebar "sanfona"), `92a577d` (lint).
2. Comparação direta `components/UrbanLayout.tsx` × `components/RuralLayout.tsx`.
3. Conferência de rotas em `App.tsx` para saber quais views são compartilhadas e quais são específicas por nicho.
4. Varredura de marcadores de UX (toast, sonner, modais, tabs) nos pares paralelos (`ConexoesUrbano/Rural`, `FinanceiroUrbano/Rural`, `PortalProprietario*`, `PortalComprador*`) e nos dashboards.

## Gaps confirmados — URBANO tem, RURAL não tem

### 1. Menu lateral esquerdo colapsável (mini-sidebar "sanfona") — PRIORIDADE ALTA

- **Urbano** (`components/UrbanLayout.tsx:58`, `241-247`, `340-347`): estado `isDesktopSidebarOpen` + botão toggle (`PanelLeftClose`/`PanelLeftOpen`). Sidebar alterna `w-[280px]` ↔ `w-[72px]` com `transition-all duration-300`.
- **Rural** (`components/RuralLayout.tsx:295-299`): `aside` sem largura dinâmica, sem botão toggle, sem estado de colapso.

Comportamentos do modo colapsado (todas ausentes no Rural):
| Recurso | Urbano | Rural |
|---|---|---|
| Botão recolher/expandir no topo da sidebar | Sim (linhas 241-247) | Não |
| Largura `280px` ↔ `72px` animada | Sim (linhas 341-343) | Não |
| Esconde labels dos itens de menu | Sim (linha 204) | Não |
| Esconde chevron `>` dos itens | Sim (linha 206) | Não |
| Título de seção vira divisor | Sim (linhas 253-257) | Não |
| Logo escondido (só ícone centralizado) | Sim (linhas 224-240) | Não |
| Card de perfil vira só avatar | Sim (linhas 277-302) | Não |
| "Sair" vira só ícone | Sim (linhas 304-310) | Não |
| Botão "Suporte" vira só ícone | Sim (linhas 262-274) | Não |
| Auto-colapsa ao navegar | Sim (linhas 179-182) | Não |

### 2. Menu "Integrações" ausente no Rural — PRIORIDADE BAIXA

- **Urbano** (`UrbanLayout.tsx:150`): menu Sistema exibe `Conexões`, `Integrações` e `Configurações`.
- **Rural** (`RuralLayout.tsx:103-106`): exibe apenas `Conexões` e `Configurações`. A rota `/rural/integrations` **existe** em `App.tsx:338` (aponta para `SystemSettings`), só falta o item no menu.

### 3. "Clientes Unificado" só no Urbano — INFORMATIVO

- Urbano tem o item `Clientes Unificado → /urban/clients` (`UrbanLayout.tsx:93`), com rota para `ClientsManager` (`App.tsx:377`).
- Rural não tem rota `/rural/clients` nem item de menu. Se o Clientes Unificado for um módulo transversal, criar a rota `App.tsx` + item no `RuralLayout`.

## Divergências de layout (informativas — decidir se alinhar)

| Item                                                                            | Urbano                         | Rural                                                        |
| ------------------------------------------------------------------------------- | ------------------------------ | ------------------------------------------------------------ |
| Conteúdo do `<Outlet/>`                                                         | sem wrapper de largura         | wrapper `max-w-[1600px] mx-auto` (`RuralLayout.tsx:318-324`) |
| Scroll-to-top ao trocar rota                                                    | sem                            | `useEffect` presente (`RuralLayout.tsx:124-127`)             |
| Tamanho do ícone LogOut                                                         | 20                             | 14 (menor)                                                   |
| Itens de menu dinâmicos por subtipo (`imobiliaria`/`loteadora`/`incorporadora`) | Sim (`UrbanLayout.tsx:96-120`) | Não                                                          |

Observação: os dashboards Urbano e Rural **já estão com o mesmo design premium** (cards, charts, toasts). O RuralDashboard tem toasts funcionais em "Ações Estratégicas" (`RuralDashboard.tsx:314`), e os pares `Financeiro*`, `PortalProprietario*`, `PortalComprador*` já usam `sonner` — **sem gap de toasts/UX detectado nesses pares** (o que há são diferenças de nicho, não atraso de mudança).

## Sem gap (já aplicado nos dois painéis)

Os commits de sidebar também alteraram views **compartilhadas** usadas pelos dois painéis:

- `views/WhatsApp/WhatsAppDashboard.tsx` (colapso do painel de mensagens)
- `views/LegalContracts.tsx`, `views/PropertyManagement.tsx`, `views/RentalsManagement.tsx`, `views/urban/CondominiumEditor.tsx` (rural não usa esse, é urbano)
- `views/BIUrbano.tsx` (específico urbano)
- `components/IADashboardSummary.tsx` (compartilhado), `components/LandingPageBlocks/*` (compartilhados)

Como são os mesmos arquivos carregados por `/urban/*` e `/rural/*` (`App.tsx`), o Rural já recebe esses ajustes automaticamente.

## Recomendação de port (escopo de implementação futura)

Portar o item 1 para `components/RuralLayout.tsx`, seguindo o padrão do `UrbanLayout`:

1. Adicionar estado `isDesktopSidebarOpen` (default `false`) + botão toggle `PanelLeftClose`/`PanelLeftOpen` no cabeçalho da sidebar.
2. Aplicar largura condicional no `<aside>` desktop: `w-[280px]` ↔ `w-[72px]` + `transition-all duration-300 ease-in-out`.
3. Condicionar labels/chevrons dos itens de menu, títulos de seção, logo, card de perfil, "Sair" e "Suporte" ao estado.
4. Auto-colapsar ao navegar (fechar sidebar no `onClick` do `NavLink`).
5. Importar os ícones `PanelLeftClose`, `PanelLeftOpen` de `lucide-react` no RuralLayout.

**Cuidado (melhoria ao portar):** no `UrbanLayout` o overlay **mobile** usa o mesmo `renderSidebarContent()` e herda o estado colapsado do desktop, o que esconde os labels no menu móvel (possível bug urbano). No port do Rural, renderizar o modo expandido dentro do overlay mobile (ex.: forçar `isDesktopSidebarOpen` como `true` no menu móvel) para não regredir a acessibilidade móvel.

**Opcional:** persistir o estado colapsado em `localStorage` para o usuário não precisar reabrir o menu a cada login.

## Verificação

Após implementar, rodar:

- `npm run type-check`
- `npm run lint`
- `npm run build`
- Testar manualmente: `/urban` e `/rural` no desktop (expandir/recolher), mobile (menu hambúrguer com labels visíveis), navegação com sidebar recolhida, e telas com `isLandingPageEditor`/`isWorkspaceRoute` (WhatsApp/Email).
