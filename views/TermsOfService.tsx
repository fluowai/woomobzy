import React from 'react';
import { Link } from 'react-router-dom';
import { FileText, ArrowLeft } from 'lucide-react';

const TermsOfService: React.FC = () => {
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
          <FileText className="text-green-600" size={32} />
          <h1 className="text-3xl font-bold text-gray-900">Termos de Uso</h1>
        </div>

        <p className="text-sm text-gray-500 mb-8">Última atualização: 26 de agosto de 2026</p>

        <div className="prose prose-gray max-w-none space-y-8">
          <section>
            <h2 className="text-xl font-semibold text-gray-800 mb-3">1. Aceitação dos Termos</h2>
            <p className="text-gray-600 leading-relaxed">
              Ao acessar ou utilizar a plataforma WooTech Imob ("Plataforma"), você concorda com
              estes Termos de Uso. Se não concordar, não utilize a Plataforma.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-800 mb-3">2. Descrição do Serviço</h2>
            <p className="text-gray-600 leading-relaxed">
              A WooTech Imob é uma plataforma SaaS de gestão imobiliária que oferece, entre outras
              funcionalidades: CRM de leads, gestão de imóveis, integração com WhatsApp via API oficial
              (Meta WhatsApp Cloud API), landing pages, painel administrativo, integração com meios de
              pagamento e assinatura digital de contratos.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-800 mb-3">3. Elegibilidade</h2>
            <p className="text-gray-600 leading-relaxed">
              O uso da Plataforma é restrito a pessoas físicas ou jurídicas capacitadas legalmente.
              Ao criar uma conta, você declara ter pelo menos 18 anos de idade e plena capacidade
              civil.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-800 mb-3">4. Cadastro e Conta</h2>
            <ul className="list-disc list-inside text-gray-600 space-y-2 ml-4">
              <li>Os dados fornecidos no cadastro devem ser verdadeiros e atualizados</li>
              <li>O responsável pela conta é responsável por manter a confidencialidade das credenciais</li>
              <li>Uma organização pode ter múltiplos usuários com perfis de acesso diferentes</li>
              <li>A conta pode ser suspensa ou encerrada em caso de violação destes Termos</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-800 mb-3">5. Uso da Plataforma</h2>
            <p className="text-gray-600 leading-relaxed mb-3">O usuário compromete-se a:</p>
            <ul className="list-disc list-inside text-gray-600 space-y-2 ml-4">
              <li>Utilizar a Plataforma apenas para fins lícitos</li>
              <li>Não tentar acessar áreas restritas ou contas de outros usuários</li>
              <li>Não realizar engenharia reversa, descompilar ou copiar funcionalidades</li>
              <li>Não utilizar a Plataforma para envio de spam ou mensagens não solicitadas via WhatsApp</li>
              <li>Cumprir as Políticas de Uso do WhatsApp da Meta ao utilizar a integração</li>
              <li>Manter o cadastro do CRECI atualizado conforme exigido pela legislação</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-800 mb-3">6. WhatsApp Cloud API</h2>
            <p className="text-gray-600 leading-relaxed">
              A integração com o WhatsApp Cloud API da Meta está sujeita aos Termos de Serviço do
              Meta. O cliente é responsável por:
            </p>
            <ul className="list-disc list-inside text-gray-600 space-y-2 ml-4">
              <li>Obter e manter suas próprias credenciais de API do Meta</li>
              <li>Obter consentimento dos destinatários antes de enviar mensagens</li>
              <li>Cumprir as Políticas Comerciais e de Mensagens do WhatsApp Business</li>
              <li>Isentar a WooTech Imob de responsabilidade por suspensão ou bloqueio da conta Meta</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-800 mb-3">7. Planos e Pagamentos</h2>
            <ul className="list-disc list-inside text-gray-600 space-y-2 ml-4">
              <li>Os valores dos planos estão disponíveis na página de pricing</li>
              <li>O pagamento é processado via gateways de pagamento terceiros (AsgardPay)</li>
              <li>Assinaturas são renovadas automaticamente salvo cancelamento prévio</li>
              <li>Alocação de conexões WhatsApp é cobrada conforme a tabela de preços definida pela revenda</li>
              <li>Reembolsos seguem a política vigente informada no momento da contratação</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-800 mb-3">8. Propriedade Intelectual</h2>
            <p className="text-gray-600 leading-relaxed">
              Todo o conteúdo, código-fonte, design, marcas e funcionalidades da Plataforma são de
              propriedade da WooTech Imob ou de seus licenciadores. Nenhuma licença ou direito é
              concedido ao usuário além do uso limitado previsto nestes Termos.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-800 mb-3">9. Limitação de Responsabilidade</h2>
            <p className="text-gray-600 leading-relaxed">
              A WooTech Imob não se responsabiliza por:
            </p>
            <ul className="list-disc list-inside text-gray-600 space-y-2 ml-4">
              <li>Interrupções temporárias de serviço para manutenção</li>
              <li>Perda de dados decorrente de força maior ou ações do usuário</li>
              <li>Decisões comerciais tomadas com base nos dados da Plataforma</li>
              <li>Disponibilidade ou políticas de terceiros (Meta, gateways de pagamento)</li>
              <li>Mensagens enviadas ou recebidas via WhatsApp pelo cliente</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-800 mb-3">10. Rescisão</h2>
            <p className="text-gray-600 leading-relaxed">
              Qualquer parte pode rescindir o contrato mediante aviso prévio de 30 dias. A WooTech
              Imob poderá rescindir imediatamente em caso de violação grave destes Termos. Após a
              rescisão, os dados serão mantidos por 90 dias para recuperação e depois excluídos
              conforme a Política de Privacidade.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-800 mb-3">11. Foro</h2>
            <p className="text-gray-600 leading-relaxed">
              Estes Termos são regidos pelas leis da República Federativa do Brasil. Fica eleito o
              foro da comarca de São Paulo/SP para dirimir quaisquer questões oriundas dos presentes
              Termos, com renúncia a qualquer outro, por mais privilegiado que seja.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-800 mb-3">12. Contato</h2>
            <p className="text-gray-600 leading-relaxed">
              Em caso de dúvidas sobre estes Termos, entre em contato:<br />
              WooTech Imob<br />
              E-mail: <a href="mailto:contato@wootech.com.br" className="text-green-600 hover:underline">contato@wootech.com.br</a>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default TermsOfService;
