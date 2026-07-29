# Relatório de Arquitetura e Padronização: IMOBZY Multi-Nicho

Este documento serve como a **Bíblia Arquitetural do IMOBZY**. O objetivo central desta padronização é garantir que o sistema cresça de forma rápida e sustentável, atendendo aos nichos **Rural** e **Urbano** (e futuros) **sem duplicar o código-fonte** e sem transformar a plataforma num "Frankenstein" insustentável.

---

## 1. O Padrão Ouro: "Single Codebase, Dynamic Context"

O IMOBZY adota o padrão de **Código Único**. Isso significa que existe apenas uma pasta src/, um único servidor Node/Express (server/) e um único banco de dados Supabase. 

**A Regra de Ouro:**
> 🚫 **NUNCA** duplique rotas, tabelas ou projetos inteiros para atender a um novo nicho.
> ✅ **SEMPRE** utilize a variável de controle 
iche para ligar, desligar ou renomear partes da interface sob demanda.

---

## 2. Como O Sistema Reconhece o Nicho Ativo?

A mágica do IMOBZY acontece no momento do Login / Acesso via Domínio.

1. **A Fonte da Verdade (Banco de Dados):**
   A tabela organizations possui uma coluna 
iche (ex: 'rural', 'urbano', 'ambos').
   
2. **O Roteador de Domínio (DomainRouter.tsx):**
   Quando um cliente acessa ural.imobzy.com ou seu domínio customizado, o sistema lê no banco qual é a organização vinculada àquele domínio e puxa a variável 
iche.

3. **O Cérebro do Frontend (AuthContext.tsx e ModuleContext.tsx):**
   O AuthContext salva o profile.organization.niche em memória. A partir daí, **toda a plataforma sabe em qual modo ela está operando**.

---

## 3. Padronização para Desenvolvedores (Como Programar no IMOBZY)

Toda vez que uma nova funcionalidade for criada (por você ou por uma IA), este é o roteiro exato que deve ser seguido:

### A. Criando Bancos de Dados (Supabase)
**Não crie tabelas separadas!** (Ex: Não crie ural_properties e urban_properties).
- Use sempre tabelas unificadas (ex: properties).
- Colunas exclusivas do rural (ex: hectares, has_cattle) devem ser opcionais (NULL) para o urbano.
- Colunas exclusivas do urbano (ex: condominium_fee, garage_spaces) devem ser opcionais para o rural.
- O campo property_type e 
iche na tabela ajuda a filtrar.

### B. Escrevendo o Frontend (Componentes React)
Sempre importe o contexto ou passe a variável 
iche como Prop para os componentes.

**Exemplo Prático (Formulário de Imóveis):**
`	sx
import { useAuth } from '@/context/AuthContext';

export function FormularioImovel() {
  const { organization } = useAuth();
  const isRural = organization?.niche === 'rural';

  return (
    <form>
      <input name="price" placeholder="Preço" />
      
      {/* Exclusivo Urbano */}
      {!isRural && <input name="condo_fee" placeholder="Valor do Condomínio" />}
      
      {/* Exclusivo Rural */}
      {isRural && <input name="hectares" placeholder="Total de Hectares" />}
    </form>
  )
}
`

### C. Telas Inteiras Exclusivas (Guards)
Se uma tela inteira não faz sentido para um nicho (ex: "Mapa de Culturas Agrícolas" não faz sentido para o Urbano), utilize o componente PanelGuard ou NicheRedirect para bloquear o acesso via URL.
*Você pode ver exemplos reais disso hoje nos arquivos components/SuperAdminGuard.tsx e components/PanelGuard.tsx.*

### D. Textos e Nomenclaturas (Dicionários)
O corretor rural odeia ser chamado de "corretor de imóveis" (ele vende fazendas). O urbano odeia vender "hectares". 
- Nunca digite textos fixos que segmentem o cliente no código.
- Crie funções utilitárias ou lógicas simples para adaptar a linguagem:
`	sx
const titulo = isRural ? 'Nova Fazenda' : 'Novo Imóvel';
`

---

## 4. Estratégia de Hospedagem e Performance (Lazy Loading)

Para que o código urbano não deixe o site do rural lento (e vice-versa):
O Vite (empacotador do IMOBZY) automaticamente usa **Code Splitting / Lazy Loading** nas rotas do React Router v7. Isso significa que as bibliotecas pesadas de mapa rural, por exemplo, só são baixadas (via internet) se o usuário realmente entrar numa tela rural. O tamanho total do projeto não afeta a velocidade do cliente!
