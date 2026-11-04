# Plano de Transformação em Data Intelligence para Validação de Documentação Jurídica Rural

## 1. Visão Geral do Sistema Atual

O módulo DueDiligence do IMOBZY possui um checklist estruturado com 14 itens organizados em 2 categorias:

| Categoria | Itens | Documentos                                                                                   |
| --------- | ----- | -------------------------------------------------------------------------------------------- |
| Fundiária | 8     | Matrícula Atualizada, CCIR, ITR, Georreferenciamento, Certidões Federais, Contrato/Escritura |
| Ambiental | 6     | CAR, Reserva Legal, Licença Ambiental, Outorga, APP, Laudo Flora/Fauna                       |

O sistema calcula scores individuais (0-100) para cada categoria e gera um "semáforo documental" com status: aprovado, pendente, rechazado, faltando.

---

## 2. APIs Governamentais Disponíveis

### 2.1 APIs Oficiais (Gratuitas via Gov.br)

| API                      | Órgão           | Função                                  | Acesso                                                      |
| ------------------------ | --------------- | --------------------------------------- | ----------------------------------------------------------- |
| **SNCR API v2**          | INCRA/Serpro    | Consulta imóveis rurais por CPF/CNPJ    | `apigateway.conectagov.estaleiro.serpro.gov.br/api-sncr/v2` |
| **SIGEF GEO**            | INCRA           | Parcelas georreferenciadas certificadas | `catalogo.gov.br/conecta`                                   |
| **CAR/SICAR MMA**        | MMA             | Cadastro Ambiental Rural                | Disponível via dados abertos                                |
| **CNIR**                 | Receita Federal | Consulta NIRF e ITR                     | Portal e-CAC                                                |
| **Portal Dados Abertos** | INCRA           | Dados públicos SNCR                     | `dados.gov.br`                                              |

### 2.2 APIs Comerciais (Pagas)

| Serviço            | Fornecedor           | Função                        |
| ------------------ | -------------------- | ----------------------------- |
| Netrin INCRA/SIGEF | Netrin               | Consulta parcels certificadas |
| API Registro Rural | RegistroRural.com.br | Dados SNCR com AP             |
| Serpro             | Gov.br               | Múltiplos serviços            |

---

## 3. Estratégia de Integração

### Abordagem em Camadas

1. **Camada 1 - Automação Completa** (Meta Final)
   - Integração direta com APIs oficiais gov.br
   - Validação automática em tempo real

2. **Camada 2 - Semi-Automação**
   - Integração via APIs comerciais
   - Workflow de validação assistida

3. **Camada 3 - Integração Manual** (Atual)
   - Links externos para consulta manual
   - Checklist colaborativo

---

## 4. Roteiro de Implementação

### Fase 1: Infraestrutura de Dados

- [ ] Configurar banco de dados para cache de validações
- [ ] Criar modelo para storing certidões e débitos
- [ ] Implementar logging de auditoria

### Fase 2: Integrações Principais

- [ ] SNCR - Buscar imóveis por CPF/CNPJ
- [ ] SIGEF - Validar georreferenciamento
- [ ] CAR - Verificar status ambiental
- [ ] ITR - Consultar débitos联邦ais

### Fase 3: Validações Avançadas

- [ ] Certidão negativa federal (Receita)
- [ ] Matrícula cartorial (via cartório)
- [ ] Lista restrições (CNEP/CAR)

### Fase 4: Intelligence

- [ ] Score de risco automático
- [ ] Alertas proactive
- [ ] Integração com checklist DueDiligence
- [ ] Dashboard analytics

---

## 5. Especificações Técnicas

### Endpoints SNCR API (gov.br)

```
POST /api-sncr/v2/imovel/consultar/cpfcnpj
GET  /api-sncr/v2/imovel/{codigo}/codigo
GET  /api-sncr/v2/titular/buscar
```

### DadosRetornados

```json
{
  "codigoImovel": "9999999999999",
  "denominacao": "Fazenda Santa Maria",
  "municipio": "São Paulo",
  "areaTotal": 150.00,
  "titulares": [...],
  "situacao": "ATIVO"
}
```

---

## 6. Fonte: Documentação de Referência

- Manual SNCR_API: `gov.br/conecta/catalogo/apis/sncr-sistema-nacional-de-cadastro-rural`
- SIGEF: `sigef.incra.gov.br`
- CAR: `car.gov.br`
- ITR: `servicos.receita.fazenda.gov.br`

---

## 7. Próximos Passos Recomendados

1. **Imediato**: Configurar ambiente de desenvolvimento com acesso às APIs gov.br
2. **Curto prazo**: Desenvolver connector para SNCR e SIGEF
3. **Médio prazo**: Integrar validações automatizadas ao módulo DueDiligence
4. **Longo prazo**: Implementar scoring inteligente baseado em dados históricos

---

## Resumo das Validações

| Documento            | Fonte           | Status Atual | Automação Possível |
| -------------------- | --------------- | ------------ | ------------------ |
| Matrícula Atualizada | Cartório        | Manual       | Parcial (抵付)     |
| CCIR                 | INCRA/SNCR      | Manual       | Total via API      |
| ITR                  | Receita Federal | Manual       | Total via e-CAC    |
| Georreferenciamento  | SIGEF           | Manual       | Total via API      |
| CAR                  | MMA/SICAR       | Manual       | Total via API      |
| Débitos Federais     | Receita         | Manual       | Total via CND      |
| Ônus Reais           | Cartório        | Manual       | Parcial            |

O plano prioriza integrações com APIs gov.br (SNCR, SIGEF, CAR) que possuem documentação oficial e acesso disponível para a iniciativa privada, followed by validações que requerem interação com cartórios (parciais).
