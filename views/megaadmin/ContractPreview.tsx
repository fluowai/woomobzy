import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/src/lib/supabase';
import { ArrowLeft, Printer, FileCheck } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const ContractPreview: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [contract, setContract] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchContract();
  }, [id]);

  const fetchContract = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('system_contracts')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      setContract(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading)
    return <div className="p-12 text-center text-slate-500">Carregando...</div>;
  if (!contract)
    return (
      <div className="p-12 text-center text-red-500">
        Contrato não encontrado.
      </div>
    );

  return (
    <div className="bg-slate-100 min-h-screen pb-24">
      {/* Header Actions - Escondido na impressão */}
      <div className="bg-white border-b p-4 sticky top-0 z-10 print:hidden flex justify-between items-center shadow-sm">
        <button
          onClick={() => navigate('/mega-admin/contracts')}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition"
        >
          <ArrowLeft size={20} />
          <span>Voltar para Lista</span>
        </button>
        <div className="flex gap-4">
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 border border-slate-300 rounded hover:bg-slate-50 transition"
          >
            <Printer size={18} />
            Imprimir / PDF
          </button>
          <button
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition opacity-50 cursor-not-allowed"
            title="Em breve"
          >
            <FileCheck size={18} />
            Enviar para Assinatura
          </button>
        </div>
      </div>

      {/* Página do Documento */}
      <div className="max-w-[210mm] mx-auto bg-white p-[20mm] my-8 shadow-lg print:shadow-none print:m-0 print:p-0">
        {/* Cabeçalho do Documento */}
        <div className="text-center mb-12">
          <p className="text-sm text-slate-500 uppercase tracking-widest mb-2">
            Modelo Contratual Estratégico
          </p>
          <h1 className="text-3xl font-bold text-slate-900 leading-tight">
            Contrato Mestre de Comercialização, Licenciamento e Serviços de
            Software
          </h1>
        </div>

        <div className="space-y-6 text-slate-800 leading-relaxed text-justify">
          <p>
            Pelo presente instrumento particular, as partes abaixo qualificadas,
            doravante denominadas "Partes", celebram este Contrato Mestre,
            integrado pelos Anexos.
          </p>

          <h2 className="text-xl font-bold mt-8 border-b border-slate-200 pb-2">
            ANEXO I - QUADRO COMERCIAL E LICENÇA
          </h2>

          <table className="w-full border-collapse border border-slate-300 text-sm mt-4">
            <tbody>
              <tr>
                <td className="border border-slate-300 p-3 font-semibold bg-slate-50 w-1/3">
                  CONTRATADA
                </td>
                <td className="border border-slate-300 p-3">
                  {contract.contratada_details.nome} - CNPJ:{' '}
                  {contract.contratada_details.cnpj}
                  <br />
                  Endereço: {contract.contratada_details.endereco}
                  <br />
                  Rep: {contract.contratada_details.representante} | E-mail:{' '}
                  {contract.contratada_details.email}
                </td>
              </tr>
              <tr>
                <td className="border border-slate-300 p-3 font-semibold bg-slate-50">
                  CONTRATANTE
                </td>
                <td className="border border-slate-300 p-3">
                  {contract.contratante_details.nome} - CNPJ/CPF:{' '}
                  {contract.contratante_details.cnpj}
                  <br />
                  Endereço: {contract.contratante_details.endereco}
                  <br />
                  Rep: {contract.contratante_details.representante} | E-mail:{' '}
                  {contract.contratante_details.email}
                </td>
              </tr>
              <tr>
                <td className="border border-slate-300 p-3 font-semibold bg-slate-50">
                  Produto/versão
                </td>
                <td className="border border-slate-300 p-3">
                  {contract.product_version}
                </td>
              </tr>
              <tr>
                <td className="border border-slate-300 p-3 font-semibold bg-slate-50">
                  Modalidade IP
                </td>
                <td className="border border-slate-300 p-3 font-medium text-indigo-700">
                  {contract.ip_modality === 'saas'
                    ? '☑ 9A SaaS / Assinatura'
                    : '☐ 9A SaaS'}{' '}
                  <br />
                  {contract.ip_modality === 'restricted_code'
                    ? '☑ 9C Entrega de código-fonte sob licença restrita'
                    : '☐ 9C Entrega de código-fonte'}
                </td>
              </tr>
              <tr>
                <td className="border border-slate-300 p-3 font-semibold bg-slate-50">
                  Domínios de Produção
                </td>
                <td className="border border-slate-300 p-3">
                  {contract.production_domain || 'A definir'}
                </td>
              </tr>
              <tr>
                <td className="border border-slate-300 p-3 font-semibold bg-slate-50">
                  Limites (Usuários/Volume)
                </td>
                <td className="border border-slate-300 p-3">
                  {contract.usage_limits}
                </td>
              </tr>
              <tr>
                <td className="border border-slate-300 p-3 font-semibold bg-slate-50">
                  Início e vigência
                </td>
                <td className="border border-slate-300 p-3">
                  Início: {format(new Date(contract.start_date), 'dd/MM/yyyy')}{' '}
                  | {contract.renewal_type}
                </td>
              </tr>
              <tr>
                <td className="border border-slate-300 p-3 font-semibold bg-slate-50">
                  Financeiro
                </td>
                <td className="border border-slate-300 p-3">
                  Setup:{' '}
                  {new Intl.NumberFormat('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                  }).format(contract.setup_fee)}{' '}
                  <br />
                  Mensalidade:{' '}
                  {new Intl.NumberFormat('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                  }).format(contract.monthly_fee)}
                </td>
              </tr>
              {contract.contract_type === 'reseller' && (
                <tr>
                  <td className="border border-slate-300 p-3 font-semibold bg-slate-50 text-indigo-900">
                    Condição Especial (Revenda)
                  </td>
                  <td className="border border-slate-300 p-3">
                    {contract.special_assignment}
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          <h2 className="text-xl font-bold mt-12 border-b border-slate-200 pb-2">
            CONDIÇÕES GERAIS (Extrato)
          </h2>

          <h3 className="font-bold mt-6">1. Objeto e Modalidade</h3>
          <p>
            1.1. O objeto é a disponibilização e/ou desenvolvimento do Software
            e serviços selecionados no Quadro Comercial (Anexo I).
          </p>
          <p>
            1.2. A natureza de cada parcela seguirá o item efetivamente
            contratado: implantação, desenvolvimento, licença/acesso,
            hospedagem, conforme aplicável.
          </p>

          <h3 className="font-bold mt-6">2. Obrigações da CONTRATADA</h3>
          <ul className="list-disc pl-6 space-y-2">
            <li>
              Executar os serviços com diligência técnica e conforme o escopo
              aceito;
            </li>
            <li>
              Manter controles de acesso, registros e medidas de segurança
              proporcionais ao risco;
            </li>
            <li>
              Não usar Dados do Cliente para finalidade própria incompatível sem
              autorização específica.
            </li>
          </ul>

          <h3 className="font-bold mt-6">3. Obrigações da CONTRATANTE</h3>
          <ul className="list-disc pl-6 space-y-2">
            <li>
              Pagar valores e tributos/encargos que legalmente lhe caibam;
            </li>
            <li>
              Usar o Software conforme lei, documentação, políticas de terceiros
              e limites contratados;
            </li>
            <li>
              Não realizar engenharia reversa fora das hipóteses legais ou
              disponibilizar o Software a terceiros não autorizados (salvo
              revenda expressamente pactuada).
            </li>
          </ul>

          {contract.ip_modality === 'restricted_code' && (
            <>
              <h3 className="font-bold mt-6 text-indigo-800">
                4. Entrega de código-fonte sob licença restrita (9C)
              </h3>
              <p>
                Após pagamento integral e aceite, a CONTRATADA entrega cópia do
                código identificado no Anexo I e concede licença não exclusiva
                para executar, manter e adaptar internamente no Domínio
                Autorizado. A entrega física não transfere titularidade
                patrimonial irrestrita além dos limites do Quadro Comercial.
              </p>
            </>
          )}

          <div className="mt-24">
            <p className="mb-12">
              Por estarem de acordo, as Partes assinam eletronicamente o
              presente instrumento.
            </p>
            <div className="grid grid-cols-2 gap-16 text-center">
              <div>
                <div className="border-t border-slate-800 pt-2 font-bold">
                  {contract.contratada_details.nome}
                </div>
                <div className="text-sm text-slate-500">CONTRATADA</div>
              </div>
              <div>
                <div className="border-t border-slate-800 pt-2 font-bold">
                  {contract.contratante_details.nome || 'CONTRATANTE'}
                </div>
                <div className="text-sm text-slate-500">CONTRATANTE</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style
        dangerouslySetInnerHTML={{
          __html: `
        @media print {
          body { background-color: white !important; }
          .print\\:hidden { display: none !important; }
          .print\\:shadow-none { box-shadow: none !important; }
          .print\\:m-0 { margin: 0 !important; }
          .print\\:p-0 { padding: 0 !important; }
        }
      `,
        }}
      />
    </div>
  );
};

export default ContractPreview;
