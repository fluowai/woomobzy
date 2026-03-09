
export interface ContractTemplate {
  id: string;
  name: string;
  content: string;
}

export const CONTRACT_TEMPLATES: ContractTemplate[] = [
  {
    id: 'venda-rural',
    name: 'Compra e Venda de Imóvel Rural',
    content: `
# INSTRUMENTO PARTICULAR DE COMPROMISSO DE COMPRA E VENDA RURAL

**VENDEDOR:** Fazendas Brasil Select, conforme dados cadastrais no sistema.
**COMPRADOR:** {{client_name}}, com os dados fornecidos no ato da negociação.

**OBJETO:** O presente contrato tem como objeto a compra e venda do imóvel rural denominado **{{property_name}}**, localizado em {{property_location}}, com área total de {{property_area}} hectares.

**PREÇO E CONDIÇÕES DE PAGAMENTO:** O valor total da transação é de **{{contract_value}}**, a ser pago conforme as condições estabelecidas entre as partes.

**CLÁUSULAS GERAIS:**
1. A posse do imóvel será transferida após a quitação total ou conforme acordo de sinal.
2. O vendedor garante que o imóvel está livre de ônus e gravames, possuindo CAR (Cadastro Ambiental Rural) e Georreferenciamento em dia.
3. Este contrato serve como título executivo extrajudicial entre as partes.

Este documento foi gerado automaticamente pela plataforma ImobSaaS em {{current_date}}.
    `
  },
  {
    id: 'arrendamento',
    name: 'Contrato de Arrendamento Agrícola',
    content: `
# CONTRATO DE ARRENDAMENTO AGRÍCOLA

**ARRENDADOR:** Fazendas Brasil Select (Representante do Proprietário).
**ARRENDATÁRIO:** {{client_name}}.

**OBJETO:** Arrendamento parcial/total da propriedade **{{property_name}}**, visando a exploração de atividade agropecuária.

**PRAZO:** O prazo de arrendamento será de {{duration}} meses, com início em {{start_date}}.

**VALOR:** O valor do arrendamento é fixado em {{contract_value}} por ciclo/ano, podendo ser convertido em sacas de soja/arrobas de boi conforme índice regional.

**CONDIÇÕES:**
- O arrendatário se compromete a preservar as áreas de reserva legal.
- Benfeitorias deverão ser autorizadas previamente por escrito.

Gerado via ImobSaaS em {{current_date}}.
    `
  },
  {
    id: 'parceria',
    name: 'Contrato de Parceria Pecuária',
    content: `
# CONTRATO DE PARCERIA PECUÁRIA

**PARCEIRO-OUTORGANTE:** Fazendas Brasil Select.
**PARCEIRO-OUTORGADO:** {{client_name}}.

**OBJETO:** Parceria para criação e engorda de gado na propriedade **{{property_name}}**.

**DIVISÃO DE RESULTADOS:** Os lucros provenientes da venda do rebanho serão divididos na proporção de {{percent}}% para o outorgante e {{percent_out}}% para o outorgado.

**RESPONSABILIDADES:**
- O outorgante fornece a pastagem e infraestrutura.
- O outorgado fornece a mão de obra e manejo técnico.

Documento de controle interno ImobSaaS - {{current_date}}.
    `
  }
];
