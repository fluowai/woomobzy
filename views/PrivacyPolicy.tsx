import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, ArrowLeft } from 'lucide-react';

const PrivacyPolicy: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-6 py-12">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-8"
        >
          <ArrowLeft size={14} /> Voltar
        </Link>

        <div className="flex items-center gap-3 mb-8">
          <Shield className="text-green-600" size={32} />
          <h1 className="text-3xl font-bold text-gray-900">Política de Privacidade</h1>
        </div>

        <p className="text-sm text-gray-500 mb-8">Última atualização: 26 de agosto de 2026</p>

        <div className="prose prose-gray max-w-none space-y-8">
          <section>
            <h2 className="text-xl font-semibold text-gray-800 mb-3">1. Introdução</h2>
            <p className="text-gray-600 leading-relaxed">
              A WooTech Imob ("Plataforma", "nós", "nosso") respeita a privacidade dos seus usuários.
              Esta Política de Privacidade descreve como coletamos, usamos, armazenamos e protegemos
              informações pessoais em conformidade com a Lei Geral de Proteção de Dados (LGPD — Lei nº 13.709/2018)
              e o Regulamento Geral sobre a Proteção de Dados (GDPR) da União Europeia.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-800 mb-3">2. Dados Coletados</h2>
            <p className="text-gray-600 leading-relaxed mb-3">Coletamos os seguintes tipos de dados:</p>
            <ul className="list-disc list-inside text-gray-600 space-y-2 ml-4">
              <li><strong>Dados de cadastro:</strong> nome, e-mail, telefone, CPF/CNPJ, CRECI</li>
              <li><strong>Dados de uso:</strong> interações com a plataforma, propriedades visualizadas, mensagens enviadas</li>
              <li><strong>Dados de pagamento:</strong> informações de cobrança processadas por gateways de pagamento terceiros (AsgardPay)</li>
              <li><strong>Dados de WhatsApp:</strong> credenciais de API do Meta WhatsApp Cloud API fornecidas pelo cliente, mensagens e contatos processados通过 a integração</li>
              <li><strong>Dados técnicos:</strong> endereço IP, tipo de navegador, dispositivo, logs de acesso</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-800 mb-3">3. Finalidade do Tratamento</h2>
            <p className="text-gray-600 leading-relaxed">Os dados são tratados para:</p>
            <ul className="list-disc list-inside text-gray-600 space-y-2 ml-4">
              <li>Operação e manutenção da plataforma SaaS de gestão imobiliária</li>
              <li>Processamento de mensagens WhatsApp via integração com Meta Cloud API</li>
              <li>Autenticação, autorização e controle de acesso por organização</li>
              <li>Processamento de pagamentos e cobranças</li>
              <li>Suporte ao cliente e comunicações operacionais</li>
              <li>Cumprimento de obrigações legais e regulatórias</li>
              <li>Melhoria da experiência do usuário e desenvolvimento de funcionalidades</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-800 mb-3">4. Base Legal (LGPD)</h2>
            <p className="text-gray-600 leading-relaxed">O tratamento de dados é fundamentado em:</p>
            <ul className="list-disc list-inside text-gray-600 space-y-2 ml-4">
              <li><strong>Execução de contrato:</strong> prestação dos serviços contratados</li>
              <li><strong>Consentimento:</strong> quando aplicável, obtido de forma explícita</li>
              <li><strong>Legítimo interesse:</strong> melhoria dos serviços e prevenção de fraudes</li>
              <li><strong>Obrigação legal:</strong> cumprimento de normas fiscais e regulatórias</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-800 mb-3">5. Compartilhamento de Dados</h2>
            <p className="text-gray-600 leading-relaxed mb-3">Os dados podem ser compartilhados com:</p>
            <ul className="list-disc list-inside text-gray-600 space-y-2 ml-4">
              <li><strong>Meta Platforms (WhatsApp Cloud API):</strong> para processamento de mensagens WhatsApp conforme as políticas do Meta</li>
              <li><strong>Supabase:</strong> provedor de banco de dados e autenticação</li>
              <li><strong>AsgardPay:</strong> processamento de pagamentos</li>
              <li><strong>Provedores de hospedagem:</strong> infraestrutura cloud para operação da plataforma</li>
              <li><strong>Autoridades competentes:</strong> quando exigido por lei ou ordem judicial</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-800 mb-3">6. WhatsApp Cloud API</h2>
            <p className="text-gray-600 leading-relaxed">
              A integração com o WhatsApp Cloud API da Meta é realizada mediante credenciais
              fornecidas pelo próprio cliente (App ID, Access Token, Phone Number ID). A WooTech Imob
              atua como intermediária técnica e não controla o conteúdo das mensagens. Os dados de
              mensagens são processados conforme as políticas de privacidade do Meta.
            </p>
            <p className="text-gray-600 leading-relaxed mt-3">
              O cliente é responsável por obter o consentimento dos destinatários das mensagens
              conforme a LGPD e as políticas do Meta WhatsApp.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-800 mb-3">7. Retenção de Dados</h2>
            <p className="text-gray-600 leading-relaxed">
              Os dados são retidos pelo período necessário à prestação dos serviços ou conforme
              exigido por lei. Dados de mensagens WhatsApp são armazenados conforme a configuração
              do cliente. Ao solicitar exclusão, os dados serão removidos em até 30 dias, exceto
              quando obrigatória a retenção por lei.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-800 mb-3">8. Direitos do Titular</h2>
            <p className="text-gray-600 leading-relaxed mb-3">Conforme a LGPD, o titular tem direito a:</p>
            <ul className="list-disc list-inside text-gray-600 space-y-2 ml-4">
              <li>Confirmar a existência de tratamento de dados</li>
              <li>Acessar os dados pessoais</li>
              <li>Corrigir dados incompletos ou desatualizados</li>
              <li>Anonimizar, bloquear ou eliminar dados desnecessários</li>
              <li>Portabilidade dos dados</li>
              <li>Eliminar dados tratados com consentimento</li>
              <li>Revogar o consentimento</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-800 mb-3">9. Segurança</h2>
            <p className="text-gray-600 leading-relaxed">
              Adotamos medidas técnicas e administrativas para proteger os dados, incluindo
              criptografia em repouso e em trânsito, controle de acesso por papel (RLS), monitoramento
              de logs e auditoria periódica de segurança.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-800 mb-3">10. Exclusão de Dados (Meta Data Deletion)</h2>
            <p className="text-gray-600 leading-relaxed">
              Para solicitar a exclusão de dados, incluindo dados processados via WhatsApp Cloud API,
              entre em contato com nosso Encarregado de Dados (DPO) pelo e-mail{' '}
              <a href="mailto:privacidade@wootech.com.br" className="text-green-600 hover:underline">
                privacidade@wootech.com.br
              </a>{' '}
              ou acesse a URL de exclusão:
            </p>
            <p className="text-gray-600 font-mono text-sm bg-gray-100 p-3 rounded-lg mt-2">
              POST https://imob.wootech.com.br/api/whatsapp-cloud/data-deletion
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-800 mb-3">11. Encarregado (DPO)</h2>
            <p className="text-gray-600 leading-relaxed">
              Encarregado de Proteção de Dados: WooTech Imob<br />
              E-mail: <a href="mailto:privacidade@wootech.com.br" className="text-green-600 hover:underline">privacidade@wootech.com.br</a>
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-800 mb-3">12. Alterações</h2>
            <p className="text-gray-600 leading-relaxed">
              Esta política pode ser atualizada periodicamente. Notificaremos os usuários sobre
              alterações significativas por e-mail ou na plataforma.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
