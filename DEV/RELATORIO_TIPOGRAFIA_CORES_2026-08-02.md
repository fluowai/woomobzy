# Relatório de letras, tipografia e cores — WooTech Imob

Data da auditoria: 2 de agosto de 2026  
Escopo: interface principal, painéis Urbano e Rural, administração, componentes compartilhados, WhatsApp e superfícies públicas com identidade própria.  
Método: inspeção estática dos tokens CSS, classes Tailwind, estilos inline, configurações de marca e componentes. Não houve validação visual autenticada em navegador nesta rodada.

## 1. Resumo executivo

O sistema possui uma direção visual reconhecível: produto SaaS claro, tipografia geométrica, superfícies brancas, cinzas frios e verde como cor de marca. A base atual é adequada para uma linguagem “Calm Enterprise”, mas sua aplicação ainda está fragmentada.

Os principais achados são:

1. **A fonte oficial é Plus Jakarta Sans**, carregada corretamente no HTML e declarada como token global. Porém, partes importantes do produto forçam Inter, Poppins ou Playfair Display sem que essas fontes sejam carregadas globalmente.
2. **A interface é excessivamente pequena e pesada**: `text-sm` e `text-xs` dominam; há 539 ocorrências de `text-[10px]`, 72 de `text-[11px]`, 36 de `text-[9px]` e 7 de `text-[8px]`. Ao mesmo tempo, `font-bold` aparece 2.598 vezes.
3. **A paleta oficial existe, mas tem baixa adoção real**. Foram encontradas 14.094 ocorrências de utilitários de cor direta e apenas 437 ocorrências de utilitários semânticos. Aproximadamente 3% do uso rastreado passa pelos tokens de marca.
4. **Há falhas objetivas de contraste** em botões e textos auxiliares. O caso mais grave é `.btn-accent`: texto preto sobre verde-escuro, contraste de apenas 1,41:1.
5. **A personalização white-label é incompleta**. A cor primária, a secundária e a fonte podem ser injetadas, mas estados derivados, componentes legados e milhares de classes diretas permanecem fixos.
6. **A identidade textual está dividida** entre WooTech Imob, Imobzy e ImobFluow. Parte é legado técnico aceitável, mas há ocorrências visíveis ao usuário que enfraquecem a marca atual.

## 2. Sistema tipográfico atual

### 2.1 Fonte principal

A fonte oficial do produto é **Plus Jakarta Sans**:

- carregada pelo Google Fonts nos pesos variáveis de 200 a 800;
- declarada em `--font-primary`;
- aplicada ao `body` por `--font-sans`;
- usada como família padrão do Tailwind.

Pontos positivos:

- boa legibilidade em interfaces densas;
- aparência contemporânea e coerente com SaaS;
- família variável reduz a necessidade de múltiplos arquivos;
- suporte adequado para português.

### 2.2 Fontes paralelas e inconsistências

| Área                        | Fonte declarada                                                                                                                                 | Situação                                                        |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| Produto global              | Plus Jakarta Sans                                                                                                                               | Correta e carregada                                             |
| `components/Layout.tsx`     | Inter                                                                                                                                           | Forçada inline; Inter não é carregada globalmente               |
| WhatsApp                    | Inter                                                                                                                                           | Forçada no CSS; pode cair em fonte de sistema                   |
| Detalhe de imóvel           | Poppins                                                                                                                                         | Declarada inline; não carregada globalmente                     |
| Landing page legada         | Poppins + Playfair Display                                                                                                                      | Declarações locais; carregamento não garantido nessa superfície |
| Sites/templates de clientes | Inter, Lora, Montserrat, Raleway, Merriweather, Space Grotesk, Nunito, IBM Plex Sans, DM Sans, Outfit, Playfair Display, Manrope, Syne e outras | Variação intencional do construtor de sites                     |
| Logos SVG                   | Inter ou Outfit                                                                                                                                 | Dependem de fallback quando a fonte não está disponível         |

Conclusão: **o painel interno deveria usar uma única família**. As variações tipográficas fazem sentido nos sites dos clientes, mas não na aplicação operacional.

### 2.3 Escala real

Os tokens globais redefinem a escala Tailwind:

| Token       | Tamanho efetivo |
| ----------- | --------------: |
| `text-xs`   |           12 px |
| `text-sm`   |           13 px |
| `text-base` |           14 px |
| `text-lg`   |           16 px |
| `text-xl`   |           18 px |
| `text-2xl`  |           20 px |
| `text-3xl`  |           24 px |
| `text-4xl`  |           32 px |
| `text-5xl`  |           40 px |
| `text-6xl`  |           48 px |

Na amostra do produto:

- `text-sm`: 1.936 ocorrências;
- `text-xs`: 1.213;
- `text-[10px]`: 539;
- `text-lg`: 198;
- `text-2xl`: 181;
- `text-xl`: 127;
- `text-3xl`: 92;
- `text-base`: somente 47.

O corpo visual do sistema está concentrado entre 10 e 13 px. Isso produz densidade, mas reduz conforto de leitura, especialmente em telas de baixa qualidade, notebooks em escala de 125%, usuários acima de 40 anos e dispositivos móveis.

### 2.4 Pesos e hierarquia

Uso estático encontrado:

- `font-bold`: 2.598 ocorrências;
- `font-medium`: 734;
- `font-semibold`: 406;
- `font-black`: 34;
- `font-normal`: 14.

Os tokens foram suavizados: `semibold` vale 500, `bold` vale 600 e `extrabold` vale 700. Isso evita aparência muito pesada, mas a quantidade de elementos marcados como bold continua alta. Quando quase tudo recebe 600, o peso deixa de criar hierarquia.

Também foram encontradas 1.129 ocorrências de `uppercase` e 785 usos de tracking largo ou customizado. O padrão é útil para rótulos e seções, mas está superutilizado em textos de 9–10 px, tornando a leitura mais lenta.

### 2.5 Problemas estruturais da tipografia

1. Os estilos globais aplicam margem inferior a todos os `h1`, `h2`, `h3` e `p`. Isso interfere em componentes que já controlam espaçamento por `gap`, `space-y` ou layout de grid.
2. A configuração de organização altera `--font-sans`, mas inputs unificados usam `--font-primary`. Assim, uma fonte white-label não alcança todo o produto.
3. A tela de aparência mantém `fontFamily` no estado e no payload, porém não apresenta um controle visível de fonte no formulário atual.
4. Inter, Poppins e Playfair Display são usadas por nome sem garantia de carregamento; o resultado pode variar entre Windows, macOS e navegador.

## 3. Paleta de cores atual

### 3.1 Tokens oficiais

| Papel            | Cor       | Uso pretendido           |
| ---------------- | --------- | ------------------------ |
| Primária         | `#16A34A` | ações, marca, seleção    |
| Primária hover   | `#15803D` | interação                |
| Primária clara   | `#22C55E` | estados leves e destaque |
| Accent           | `#052E1A` | verde profundo           |
| Accent hover     | `#021A0F` | interação escura         |
| Fundo principal  | `#F8FAFC` | canvas da aplicação      |
| Cartão/input     | `#FFFFFF` | superfícies              |
| Hover            | `#F1F5F9` | estados neutros          |
| Texto principal  | `#111111` | conteúdo prioritário     |
| Texto secundário | `#475569` | descrições               |
| Texto terciário  | `#94A3B8` | metadados                |
| Borda            | `#E2E8F0` | separação                |

A direção cromática é correta: verde comunica crescimento, território, confiança e mercado imobiliário; os neutros frios mantêm aparência corporativa.

### 3.2 Distribuição real das cores

Em 14.094 ocorrências de classes cromáticas diretas do núcleo analisado:

| Família | Ocorrências | Participação aproximada |
| ------- | ----------: | ----------------------: |
| Slate   |       4.981 |                   35,3% |
| Gray    |       2.222 |                   15,8% |
| White   |       1.752 |                   12,4% |
| Emerald |       1.050 |                    7,4% |
| Indigo  |         906 |                    6,4% |
| Blue    |         829 |                    5,9% |
| Red     |         559 |                    4,0% |
| Amber   |         369 |                    2,6% |
| Green   |         321 |                    2,3% |
| Purple  |         191 |                    1,4% |

Classes mais frequentes:

- `bg-white`: 963;
- `text-white`: 764;
- `border-slate-200`: 708;
- `text-slate-400`: 701;
- `text-slate-500`: 642;
- `bg-slate-50`: 557;
- `text-indigo-600`: 162;
- `text-blue-600`: 159;
- `bg-indigo-600`: 101.

O uso simultâneo de Slate e Gray gera pequenas diferenças de temperatura e contraste entre módulos. Azul e índigo ainda aparecem como ações primárias ou foco em muitas telas, apesar de o verde ser a identidade vigente.

### 3.3 Sistema WooTech de referência

Existe uma camada recente em `views/wootech-reference.css`, aplicada a 13 telas. Ela normaliza azul/índigo para verde dentro de `.wootech-reference-screen` e define:

- ink: `#10221D`;
- muted: `#64706C`;
- line: `#E2E8E5`;
- soft: `#F5F8F6`;
- green: `#079455`;
- green dark: `#063F31`;
- green soft: `#EAF7F0`.

Essa camada melhora a coerência das telas reconstruídas, mas funciona como correção de compatibilidade com `!important`, não como fonte única de tokens. O produto passa a ter pelo menos três verdes de ação: `#16A34A`, `#079455` e `#059669`, além do `#00855C` do workspace.

### 3.4 WhatsApp

O módulo WhatsApp usa duas camadas próprias:

- tokens globais inspirados no WhatsApp Web (`#25D366`, `#D9FDD3`, `#EFEAE2` etc.);
- `messages-center.css`, com `#059669`, `#047857` e `#ECFDF5`.

É aceitável preservar verde reconhecível do canal nas mensagens e estados de conexão. A navegação, botões genéricos, cabeçalhos e inputs do módulo, contudo, deveriam herdar os tokens do produto.

## 4. Contraste e acessibilidade

Referência: WCAG AA exige 4,5:1 para texto normal e 3:1 para texto grande.

| Combinação                | Contraste | Avaliação                                                |
| ------------------------- | --------: | -------------------------------------------------------- |
| Branco sobre `#16A34A`    |    3,30:1 | Falha para texto normal; passa somente para texto grande |
| Branco sobre `#15803D`    |    5,02:1 | Passa AA                                                 |
| Branco sobre `#079455`    |    3,91:1 | Falha para texto normal                                  |
| Branco sobre `#087747`    |    5,61:1 | Passa AA                                                 |
| Branco sobre `#052E1A`    |   14,87:1 | Passa AAA                                                |
| Preto sobre `#052E1A`     |    1,41:1 | Falha crítica                                            |
| `#94A3B8` sobre branco    |    2,56:1 | Falha                                                    |
| `#64748B` sobre branco    |    4,76:1 | Passa AA                                                 |
| `#475569` sobre branco    |    7,58:1 | Passa AAA                                                |
| `#079455` sobre `#EAF7F0` |    3,55:1 | Falha para texto normal                                  |
| `#00855C` sobre branco    |    4,66:1 | Passa AA                                                 |
| Branco sobre `#3B82F6`    |    3,68:1 | Falha para texto normal                                  |
| Branco sobre `#6366F1`    |    4,47:1 | Limítrofe; abaixo de 4,5                                 |
| Branco sobre `#10B981`    |    2,54:1 | Falha                                                    |

Riscos práticos:

1. `.btn-accent` usa `color: #000` sobre o accent verde-escuro. É o erro mais urgente.
2. Botões primários verdes com texto branco e fonte de 13 px não atingem AA no estado normal.
3. `text-tertiary` e `text-slate-400` aparecem com frequência em 9–12 px. Muitos desses conteúdos são labels, cabeçalhos de tabela, datas e metadados essenciais, não meramente decorativos.
4. Vários botões `bg-emerald-500`, `bg-blue-500/600` e `bg-indigo-500` com texto branco também não atingem 4,5:1.

## 5. Identidade textual e “letras” da marca

A marca comercial atual está centralizada como **WooTech Imob**, mas o repositório ainda contém identidades anteriores:

- WooTech aparece amplamente e é a direção atual;
- Imobzy permanece em nomes visíveis como “Clube Imobzy” e no placeholder “Buscar no Imobzy...”;
- ImobFluow aparece em logos, descrições SVG, hosts legados e fontes de leads;
- vários nomes técnicos (`imobzyimg`, URLs, chaves de storage e rotas) devem permanecer por compatibilidade.

Recomendação editorial:

- usar “WooTech Imob” em títulos, cabeçalhos, login, ajuda e mensagens ao usuário;
- manter “Imobzy” somente onde for nome oficial de uma funcionalidade ainda vigente;
- manter Imobzy/ImobFluow em identificadores técnicos sem exibi-los na interface;
- padronizar capitalização: “WooTech Imob”, nunca alternar com “WOOTECH IMOB” em texto corrido;
- corrigir textos públicos sem acentos, como “CRM imobiliario”, “operacao” e “captacao” na meta description.

## 6. Diagnóstico por qualidade

| Critério                   | Estado       | Diagnóstico                                                 |
| -------------------------- | ------------ | ----------------------------------------------------------- |
| Direção visual             | Boa          | Verde + neutros forma uma base coerente                     |
| Fonte principal            | Boa          | Plus Jakarta Sans é adequada e está carregada               |
| Escala tipográfica         | Atenção alta | Excesso de 8–13 px e pouco uso do corpo base                |
| Hierarquia por peso        | Atenção      | Bold e uppercase usados em excesso                          |
| Tokens semânticos          | Crítico      | Cerca de 3% do uso cromático rastreado passa por tokens     |
| Contraste                  | Crítico      | Falhas em ações primárias, tertiary text e `.btn-accent`    |
| White-label                | Atenção alta | Só parte da UI responde à configuração da organização       |
| Consistência entre módulos | Atenção alta | Verde, azul, índigo, Slate e Gray coexistem sem regra única |
| Identidade nominal         | Atenção      | WooTech Imob, Imobzy e ImobFluow aparecem na experiência    |
| Sites de clientes          | Adequado     | Variação de fontes e cores é intencional nessa camada       |

## 7. Sistema recomendado

### 7.1 Tipografia do painel

Manter Plus Jakarta Sans como única fonte da aplicação operacional.

| Papel             |  Tamanho | Peso | Altura de linha |
| ----------------- | -------: | ---: | --------------: |
| Display/dashboard |    32 px |  700 |            1,15 |
| Título de página  |    24 px |  700 |            1,20 |
| Título de seção   | 18–20 px |  600 |            1,30 |
| Título de card    |    16 px |  600 |            1,35 |
| Corpo             |    14 px |  400 |            1,50 |
| Controle/label    |    13 px |  500 |            1,40 |
| Metadado          |    12 px |  500 |            1,35 |
| Microtexto        |    11 px |  600 |            1,30 |

Regra: 10 px ou menos apenas para elementos decorativos, nunca para informação necessária à decisão ou à operação.

### 7.2 Paleta funcional

| Papel                  | Recomendação                                                     |
| ---------------------- | ---------------------------------------------------------------- |
| Marca/decorativo       | manter `#16A34A`                                                 |
| Botão com texto branco | usar tom com contraste mínimo 4,5:1, como `#15803D` ou `#087747` |
| Texto principal        | unificar `#111827` ou `#10221D`                                  |
| Texto secundário       | `#475569`                                                        |
| Texto auxiliar mínimo  | `#64748B`; evitar `#94A3B8` para texto                           |
| Canvas                 | `#F8FAFC`                                                        |
| Superfície             | `#FFFFFF`                                                        |
| Borda                  | `#E2E8F0`                                                        |
| Sucesso                | verde semântico distinto da ação somente quando necessário       |
| Informação             | azul reservado a informação, links ou integrações                |
| Alerta                 | âmbar                                                            |
| Erro                   | vermelho                                                         |

### 7.3 Arquitetura de tokens

Criar papéis semânticos, sem amarrar componentes à cor física:

- `--color-action-primary`;
- `--color-action-primary-hover`;
- `--color-action-primary-text`;
- `--color-text-muted`;
- `--color-text-disabled`;
- `--color-surface-canvas`;
- `--color-surface-raised`;
- `--color-state-success`, `warning`, `danger`, `info`;
- tokens de `on-color` para garantir contraste.

Os estados hover/light/border devem ser derivados da cor configurada ou salvos como um conjunto validado. Hoje somente os alphas da cor primária são recalculados; `primary-hover`, `primary-light` e outros estados continuam fixos.

## 8. Plano de correção priorizado

### P0 — acessibilidade e erros de cor

1. Corrigir `.btn-accent` para texto branco ou redefinir o fundo.
2. Escurecer fundos de botões verdes, azuis, índigo e emerald quando houver texto branco pequeno.
3. Trocar `text-tertiary`/`text-slate-400` por tom com contraste mínimo de 4,5:1 em conteúdo informativo.
4. Criar teste automatizado de contraste para tokens e temas white-label.

### P1 — unificação tipográfica

1. Remover overrides de Inter/Poppins do shell e das views do produto.
2. Fazer inputs e componentes herdarem `--font-sans`, não `--font-primary` fixo.
3. Reduzir `text-[10px]`, `[9px]` e `[8px]`; adotar escala de papéis.
4. Reservar bold/uppercase/tracking para títulos curtos, status e eyebrow labels.
5. Remover margens globais de elementos tipográficos e controlar ritmo nos componentes.

### P1 — unificação cromática

1. Migrar classes diretas para tokens, começando por layouts, botões, inputs, tabelas e modais.
2. Consolidar `index.css` e `wootech-reference.css` em um único contrato.
3. Reservar azul/índigo para semântica informativa e integrações.
4. Manter cores próprias do WhatsApp apenas onde comunicam o canal.

### P1 — white-label

1. Expor a seleção de fonte na tela de aparência ou remover o campo até existir suporte completo.
2. Gerar estados acessíveis a partir das cores escolhidas.
3. Alertar e bloquear combinações com contraste insuficiente no color picker.
4. Aplicar tema a todos os componentes compartilhados.

### P2 — identidade e QA

1. Revisar textos visíveis e unificar WooTech Imob/Imobzy/ImobFluow.
2. Inspecionar visualmente as rotas em 320, 390, 768, 1024 e desktop.
3. Validar zoom de 125% e 200%, foco, disabled, hover e mobile.
4. Separar formalmente o design system do painel do sistema de temas dos sites dos clientes.

## 9. Critérios de aceite sugeridos

- 100% dos tokens de texto e ação passam WCAG AA;
- nenhum texto operacional abaixo de 11 px;
- corpo padrão entre 13 e 14 px, conforme densidade;
- Plus Jakarta Sans aplicada em todo o painel interno;
- nenhuma fonte nomeada sem carregamento ou fallback documentado;
- layouts e componentes-base sem cores primárias diretas;
- personalização da organização refletida em ações, foco, hover e superfícies;
- nomes visíveis da marca revisados;
- screenshots aprovadas em desktop e mobile para Urbano, Rural, Admin, Mega Admin e WhatsApp.

## 10. Evidências principais

- Tokens globais: `index.css`.
- Fonte carregada: `index.html`.
- Injeção white-label: `context/SettingsContext.tsx`.
- Configuração de aparência: `views/admin/AppearanceSettings.tsx`.
- Camada recente WooTech: `views/wootech-reference.css`.
- Shell com override de Inter: `components/Layout.tsx`.
- Tema do WhatsApp: `views/WhatsApp/whatsapp.css` e `views/WhatsApp/messages-center.css`.

## Conclusão

O sistema já tem uma boa matéria-prima visual, mas ainda não opera como um design system único. A prioridade não é escolher outra fonte ou outra cor: é **fazer a tipografia e a paleta atuais funcionarem como contrato**, com contraste, papéis semânticos, escala legível e aplicação consistente. Corrigidos esses pontos, a identidade WooTech Imob tende a ficar mais profissional, previsível e verdadeiramente personalizável sem exigir uma reconstrução completa das telas.
