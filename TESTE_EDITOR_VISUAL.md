# Guia de Teste do Editor Visual

## ✅ Pré-requisitos

1. **Migração do Banco de Dados**

   ```sql
   -- Execute no Supabase SQL Editor:
   -- Copie e cole o conteúdo de add_layout_editor_columns.sql
   ```

2. **Servidor Rodando**
   ```bash
   npm run dev
   ```

## 🧪 Roteiro de Testes

### 1. Acesso ao Editor

- [ ] Login no sistema
- [ ] Navegar para **Configurações**
- [ ] Clicar na aba **"Editor Visual"**
- [ ] Verificar se o editor carrega corretamente

### 2. Interface do Editor

- [ ] Verificar painel esquerdo (Widgets)
- [ ] Verificar canvas central (vazio inicialmente)
- [ ] Verificar toolbar superior (Undo/Redo, Device Selector, Save)
- [ ] Verificar que painel direito mostra "Nenhum bloco selecionado"

### 3. Adicionar Blocos (Drag & Drop)

- [ ] Arrastar **Hero** para o canvas
- [ ] Arrastar **Text** para o canvas
- [ ] Arrastar **Image** para o canvas
- [ ] Verificar que blocos aparecem no canvas

### 4. Adicionar Blocos (Click)

- [ ] Clicar em **Stats** no painel
- [ ] Clicar em **PropertyGrid** no painel
- [ ] Verificar que blocos são adicionados ao final

### 5. Selecionar e Configurar Blocos

**Hero Block:**

- [ ] Clicar no bloco Hero
- [ ] Verificar painel de propriedades à direita
- [ ] Alterar título
- [ ] Alterar URL da imagem de fundo
- [ ] Ajustar opacidade do overlay
- [ ] Adicionar texto do botão CTA
- [ ] Verificar mudanças em tempo real

**Text Block:**

- [ ] Selecionar bloco de texto
- [ ] Alterar conteúdo
- [ ] Mudar tamanho da fonte
- [ ] Mudar cor do texto
- [ ] Verificar preview

**PropertyGrid Block:**

- [ ] Selecionar bloco PropertyGrid
- [ ] Alterar número de colunas (1-4)
- [ ] Ajustar espaçamento
- [ ] Ativar/desativar filtros

### 6. Reordenar Blocos

- [ ] Arrastar bloco para cima
- [ ] Arrastar bloco para baixo
- [ ] Verificar que ordem muda

### 7. Toolbar do Bloco

- [ ] Hover sobre um bloco
- [ ] Verificar toolbar aparece
- [ ] Clicar em **Duplicar** (ícone de cópia)
- [ ] Clicar em **Ocultar** (ícone de olho)
- [ ] Clicar em **Remover** (ícone de lixeira)

### 8. Undo/Redo

- [ ] Fazer várias alterações
- [ ] Clicar em **Undo** (ou Ctrl+Z)
- [ ] Verificar que última ação foi desfeita
- [ ] Clicar em **Redo** (ou Ctrl+Shift+Z)
- [ ] Verificar que ação foi refeita

### 9. Device Preview

- [ ] Clicar em ícone **Mobile** (📱)
- [ ] Verificar canvas redimensiona
- [ ] Clicar em ícone **Tablet** (📱)
- [ ] Clicar em ícone **Desktop** (🖥️)

### 10. Espaçamento

- [ ] Selecionar qualquer bloco
- [ ] No painel de propriedades, rolar até "Espaçamento"
- [ ] Alterar **Padding Top**
- [ ] Alterar **Padding Bottom**
- [ ] Verificar mudanças visuais

### 11. Salvar Layout

- [ ] Clicar em **"Salvar Layout"** na toolbar
- [ ] Aguardar mensagem de sucesso
- [ ] Recarregar página
- [ ] Verificar que layout foi mantido

### 12. Testar Todos os Blocos

**Básicos:**

- [ ] Hero - configurar título, imagem, CTA
- [ ] Text - editar conteúdo, fonte, cor
- [ ] Image - URL, alt text, largura
- [ ] Spacer - altura do espaço
- [ ] Divider - cor, espessura

**Conteúdo:**

- [ ] PropertyGrid - colunas, gap
- [ ] Stats - valores, labels
- [ ] Testimonials - depoimentos, rating
- [ ] Gallery - layout grid/carousel
- [ ] BrokerCard - layout card/inline

**Interação:**

- [ ] Form - campos, labels
- [ ] CTA - título, botão, cores

**Avançado:**

- [ ] Map - coordenadas, endereço
- [ ] Footer - colunas, social, newsletter
- [ ] CustomHTML - código HTML

### 13. Modo Preview

- [ ] Clicar em **"Preview"** na toolbar
- [ ] Verificar que painéis laterais somem
- [ ] Verificar layout sem controles de edição
- [ ] Clicar em **"Editar"** para voltar

### 14. Persistência

- [ ] Criar layout completo
- [ ] Salvar
- [ ] Fechar navegador
- [ ] Reabrir e fazer login
- [ ] Ir para Editor Visual
- [ ] Verificar que layout foi carregado

## 🐛 Problemas Conhecidos

- MapBlock requer API key do Google Maps
- CustomHTML pode ter restrições de segurança
- Preview mobile é simulado (não é dispositivo real)

## ✅ Critérios de Sucesso

- [ ] Todos os 15 blocos carregam sem erros
- [ ] Drag-and-drop funciona suavemente
- [ ] Propriedades atualizam em tempo real
- [ ] Undo/Redo funciona corretamente
- [ ] Layout persiste após salvar
- [ ] Sem erros no console do navegador
