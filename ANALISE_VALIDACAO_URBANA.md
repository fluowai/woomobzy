# Plano de Data Intelligence para Imobiliárias Tradicionais (Urbanas)

## 1. Visão Geral do Sistema Atual

O módulo **ComplianceUrbano** possui um checklist com 14 itens organizados em 2 categorias:

| Categoria    | Itens | Documentos                                                                 |
| ------------ | ----- | -------------------------------------------------------------------------- |
| Imóvel       | 8     | Matrícula, IPTU, Habite-se, Ônus, Zoneamento, Alvarás, Vistoria, Averbação |
| Proprietário | 6     | RG/CPF, Estado Civil, Comprovante Res., Certidões (Fed, Est, Mun)          |

O sistema calcula status: OK, Pendente, Vencido, Ausente.

---

## 2. APIs Governamentais Disponíveis para ImóveisUrbanos

### 2.1 APIs Oficiais (Gratuitas via Gov.br)

| API                  | Órgão                | Função                                    | Status             |
| -------------------- | -------------------- | ----------------------------------------- | ------------------ |
| **SINTER API**       | Serpro/MGI           | Cadastro de Unidades Imobiliárias urbanas | ✅ Disponível      |
| **Consulta ITBI SP** | Prefeitura SP        | Valor venal, transmissão                  | ✅ Portal          |
| **Portal IPTU**      | Multiple prefeituras | Dados IPTU                                | ✅ Via InfoSimples |
| **Consulta CND**     | Receita Federal      | Certidão negativa pessoa física           | ✅ Online          |
| **SICAR**            | MMA                  | Apenas rural (não aplicável)              | N/A                |

### 2.2 APIs Comerciais (Pagas)

| Serviço                     | Cobertura                                                 | Função                               |
| --------------------------- | --------------------------------------------------------- | ------------------------------------ |
| **IPTU API**                | 7 capitais (SP, RJ, BH, Curitiba, Recife, POA, Fortaleza) | Dados IPTU, valor venal, comparáveis |
| **InfoSimples**             | SP, RJ, outras                                            | Certidões de IPTU, dados municipais  |
| **Registro de Imóveis API** | Todos cartórios                                           | Matrícula, ônus                      |

---

## 3. Dados Disponíveis por API

### IPTU API (7 Capitais)

```json
{
  "inscricao": "123456789012",
  "endereco": "Rua Example, 123",
  "bairro": "Centro",
  "cep": "01234-567",
  "area_terreno": 250,
  "area_edificada": 180,
  "valor_venal_terreno": 150000,
  "valor_venal_construcao": 120000,
  "valor_venal_total": 270000,
  "ano_construcao": 2015,
  "tipologia": "Residencial",
  "padrão_construtivo": "Médio",
  "zoneamento": "Zona Residencial 1",
  "testada": 10,
  "frente_fundacao": "10m/25m"
}
```

### SINTER API (Unidades Imobiliárias)

```
Endpoint: POST /api/v1/{codigoIBGE}/ui
Dados: Endereço, área, tipologia, valor mercado, parâmetros urbanísticos
```

---

## 4. Estratégia de Implementação

### Fase 1: Integração IPTU (Prioridade Alta)

Integrar com **IPTU API** (pago) ou **InfoSimples** para obter:

- [x] Dados cadastrais do imóvel
- [x] Valor venal
- [x] Área terreno/construção
- [x] Zoneamento
- [x] Ano de construção
- [x] Histórico de valores

### Fase 2: Validações Automáticas

- [ ] IPTU em dia (via portal prefeitura)
- [ ] Certidões do proprietário (Receita Federal)
- [ ] Regularidade municipal via SINTER

### Fase 3: Dashboard Analytics

- [ ] Score de documentação
- [ ] Alertas de vencimento
- [ ] Comparáveis de mercado

---

## 5. Checklists Propostos

### Checklist Urbanotradicional

| ID  | Documento              | Fonte           | Automação  |
| --- | ---------------------- | --------------- | ---------- |
| 1   | Matrícula Atualizada   | Cartório        | Manual     |
| 2   | IPTU em Dia            | IPTU API/Portal | ✅ parcial |
| 3   | Habite-se              | Prefeitura      | Manual     |
| 4   | Certidão Ônus Reais    | Cartório        | Manual     |
| 5   | Zoneamento Verificado  | IPTU/SINTER     | ✅ Via API |
| 6   | Alvarás de Construção  | Prefeitura      | Manual     |
| 7   | Laudo de Vistoria      | Município       | Manual     |
| 8   | Averbação Construção   | Cartório        | Manual     |
| 9   | RG/CPF Proprietário    | Cliente         | Manual     |
| 10  | Estado Civil           | Cliente         | Manual     |
| 11  | Comprovante Residência | Cliente         | Manual     |
| 12  | CND Federal            | Receita         | ✅ Online  |
| 13  | CND Estadual           | Sinesp          | ✅ Online  |
| 14  | CND Municipal          | Prefeitura      | ✅ Parcial |

---

## 6. APIs Recomendadas para Implementação

### Prioridade 1 - Essenciais

1. **IPTU API** (https://iptuapi.com.br)
   - Plano gratuito: 10 req/min
   - 97M+ registros
   - Cobertura: SP, RJ, BH, Curitiba, Recife, POA, Fortaleza

2. **InfoSimples** (https://infosimples.com.br)
   - Múltiplos municípios
   - Certidões de IPTU

### Prioridade 2 - Complementares

1. **Registro de Imóveis API** (https://registrodeimoveis.org.br)
   - Matrícula, ônus reais
2. **Receita Federal CND**
   - https://www.gov.br/receitafederal/pt-br/assuntos/orientacao-tributaria/cadastros/portal-cnir

---

## 7. Dados do Imóvel para Coletar

Via IPTU API ou InfoSimples:

```typescript
interface UrbanPropertyData {
  // Identificação
  inscricaoIPTU: string;
  cep: string;
  endereco: string;
  numero: string;
  complemento?: string;
  bairro: string;
  municipio: string;
  uf: string;

  // Características
  areaTerreno: number;
  areaConstruida: number;
  anoConstrucao: number;
  tipologia: string;
  padraoConstrutivo: string;

  // Valores
  valorVenalTerreno: number;
  valorVenalConstrucao: number;
  valorVenalTotal: number;

  // Zoneamento
  zonaUso: string;
  coeffAproveitamento: number;
  taxaOcupacao: number;

  // dadosGeo
  frente: number;
  profundidade: number;
}
```

---

## 8. Comparativo Rural vs Urbano

| Aspecto                 | Rural               | Urbano        |
| ----------------------- | ------------------- | ------------- |
| **Principal API**       | SNCR/INCRA          | IPTU API      |
| **Georreferenciamento** | SIGEF (obrigatório) | Não aplicável |
| **Ambiental**           | CAR/SICAR           | Habite-se     |
| **Tributos**            | ITR                 | IPTU          |
| **Regularização**       | INCRA               | Prefecture    |

---

## 9. Próximos Passos Recomendados

1. **Imediato**: Contratar IPTU API (plano Starter)
2. **Curto prazo**: Desenvolver connector para dados IPTU
3. **Médio prazo**: Integrar validações automaticadas ao ComplianceUrbano
4. **Longo prazo**: Dashboard analytics unificado (rural + urbano)

---

##Fontes

- https://iptuapi.com.br
- https://www.gov.br/conecta/catalogo/apis
- https://prefeitura.sp.gov.br/fazenda/servicos/itbi/
- https://infosimples.com.br
- https://www.registrodeimoveis.org.br
