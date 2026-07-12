export interface ContractTemplate {
  id: string;
  name: string;
  content: string;
}

export const CONTRACT_TEMPLATES: ContractTemplate[] = [
  {
    id: 'venda-urbana',
    name: 'Compra e Venda de Imóvel Urbano',
    content: `
# INSTRUMENTO PARTICULAR DE COMPROMISSO DE COMPRA E VENDA URBANO

**VENDEDOR:** [NOME DA IMOBILIÁRIA/PROPRIETÁRIO], conforme dados cadastrais.
**COMPRADOR:** {{client_name}}.

**OBJETO:** O imóvel urbano denominado **{{property_name}}**, localizado em {{property_location}}, devidamente registrado sob a matrícula nº {{property_registration}}.

**PREÇO E CONDIÇÕES:** 
O valor total da transação é de **{{contract_value}}**.
- Valor de Entrada: {{entry_value}}
- Saldo em: {{installments}} parcelas de {{installment_value}}.

**CLÁUSULAS GERAIS:**
1. O imóvel será entregue livre e desembaraçado de quaisquer ônus.
2. A posse definitiva será concedida após a assinatura da escritura pública.
3. Este contrato é regido pelas leis civis brasileiras.

Gerado via WooTech Imob em {{current_date}}.
    `,
  },
  {
    id: 'loteamento',
    name: 'Compromisso de Compra e Venda de Lote',
    content: `
# CONTRATO DE COMPROMISSO DE COMPRA E VENDA DE LOTE - LOTEADORA 360°

**LOTEADORA:** {{developer_name}}, inscrita no CNPJ sob nº {{developer_cnpj}}.
**COMPRADOR:** {{client_name}}.

**OBJETO:** O lote de terreno nº **{{lot_number}}** da Quadra **{{block_name}}**, do loteamento denominado **{{development_name}}**, localizado em {{property_location}}.

**ESPECIFICAÇÕES DO LOTE:**
- Área Total: {{lot_area}} m²
- Confrontações: Frente: {{lot_front}}m | Fundo: {{lot_back}}m | Laterais: {{lot_side}}m

**PREÇO E PAGAMENTO:**
O valor total do lote é de **{{contract_value}}**.
- Sinal/Entrada: {{entry_value}}
- Parcelamento: {{installments}} parcelas mensais reajustáveis pelo índice {{adjustment_index}}.

**INFRAESTRUTURA:** A Loteadora se compromete a entregar a infraestrutura conforme o cronograma aprovado pela municipalidade.

Documento assinado digitalmente via WooTech Imob em {{current_date}}.
    `,
  },
  {
    id: 'locacao-urbana',
    name: 'Contrato de Locação Residencial/Comercial',
    content: `
# CONTRATO DE LOCAÇÃO DE IMÓVEL URBANO

**LOCADOR:** [NOME DO PROPRIETÁRIO], representado por [IMOBILIÁRIA].
**LOCATÁRIO:** {{client_name}}.

**OBJETO:** Locação do imóvel **{{property_name}}**, para fins {{rental_purpose}}.

**VALOR E ENCARGOS:**
- Aluguel Mensal: {{contract_value}}
- Encargos: IPTU e Condomínio por conta do {{expenses_responsible}}.

**PRAZO:** Vigência de {{duration}} meses, iniciando em {{start_date}}.

**GARANTIA:** {{warranty_type}}.

Gerado via WooTech Imob em {{current_date}}.
    `,
  },
  {
    id: 'venda-rural',
    name: 'Compra e Venda de Imóvel Rural',
    content: `
# INSTRUMENTO PARTICULAR DE COMPROMISSO DE COMPRA E VENDA RURAL

**VENDEDOR:** [NOME DO VENDEDOR], conforme dados cadastrais.
**COMPRADOR:** {{client_name}}.

**OBJETO:** Imóvel rural denominado **{{property_name}}**, localizado em {{property_location}}, com área de {{property_area}} hectares.

**PREÇO:** O valor total é de **{{contract_value}}**.

Gerado via WooTech Imob em {{current_date}}.
    `,
  }
];
