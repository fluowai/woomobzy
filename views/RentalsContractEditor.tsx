import React, { useState } from 'react';
import {
  FileUp,
  Image as ImageIcon,
  Sparkles,
  FileText,
  CheckCircle2,
  Check,
  ShieldCheck,
  Search,
  ZoomIn,
  ZoomOut,
  Download,
  Printer,
  Maximize,
  Edit2,
  ChevronDown,
  User,
  CreditCard,
  Phone,
  Mail,
  MapPin,
  Building,
  Home,
  Calendar,
  Send,
  X,
  FileCheck,
  Edit3
} from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  leaseId?: string;
  onClose?: () => void;
}

export function RentalsContractEditor({ leaseId, onClose }: Props) {
  const [activeImport, setActiveImport] = useState('pdf');
  const [expandedSection, setExpandedSection] = useState<string | null>('locador');
  const [chatInput, setChatInput] = useState('');

  const importOptions = [
    { id: 'pdf', title: 'Importar PDF', desc: 'Envie um PDF e a IA preenche tudo para você', icon: FileUp },
    { id: 'img', title: 'Importar Imagem', desc: 'Tire uma foto ou envie uma imagem do contrato', icon: ImageIcon },
    { id: 'ai', title: 'Gerar com IA', desc: 'Descreva o contrato em linguagem natural', icon: Sparkles },
    { id: 'model', title: 'Usar Modelo', desc: 'Selecione um modelo pronto', icon: FileText },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-gray-50 flex flex-col font-sans overflow-hidden">
      {/* Header */}
      <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center text-emerald-600 font-bold text-lg gap-2">
            <Home className="w-5 h-5 fill-emerald-600" />
            WooTech Imob
          </div>
          <div className="h-5 w-px bg-gray-300 mx-2"></div>
          <div className="flex items-center text-sm text-gray-500">
            <span className="hover:text-gray-900 cursor-pointer" onClick={onClose}>Contratos</span>
            <span className="mx-2">/</span>
            <span className="font-medium text-gray-900">Novo Contrato de Locação</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button className="text-sm font-medium text-emerald-600 flex items-center gap-1.5 hover:bg-emerald-50 px-3 py-1.5 rounded-full transition-colors">
            <span className="w-4 h-4 rounded-full border border-emerald-600 flex items-center justify-center text-[10px]">?</span>
            Ajuda
          </button>
          <div className="relative">
            <div className="w-8 h-8 bg-gray-200 rounded-full overflow-hidden border border-gray-300">
              <img src="https://ui-avatars.com/api/?name=Joao+Silva&background=0D8ABC&color=fff" alt="User" />
            </div>
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 text-white text-[9px] font-bold flex items-center justify-center rounded-full border-2 border-white">3</div>
          </div>
          <div className="text-sm hidden sm:block">
            <div className="font-semibold text-gray-900">João da Silva</div>
            <div className="text-xs text-gray-500">Administrador</div>
          </div>
          <button onClick={onClose} className="ml-2 p-2 text-gray-500 hover:bg-gray-100 rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main Layout */}
      <main className="flex-1 flex overflow-hidden">
        
        {/* Left Sidebar */}
        <aside className="w-72 bg-white border-r border-gray-200 flex flex-col overflow-y-auto shrink-0">
          <div className="p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-1">Novo Contrato</h2>
            <p className="text-sm text-gray-500 mb-6">Escolha como deseja criar seu contrato de locação</p>

            <div className="space-y-3 mb-10">
              {importOptions.map((opt) => (
                <div 
                  key={opt.id}
                  onClick={() => setActiveImport(opt.id)}
                  className={`p-3 border rounded-xl flex items-start gap-3 cursor-pointer transition-all ${activeImport === opt.id ? 'border-emerald-500 bg-emerald-50/30 ring-1 ring-emerald-500 shadow-sm' : 'border-gray-200 hover:border-emerald-300 hover:bg-gray-50'}`}
                >
                  <div className={`mt-0.5 p-2 rounded-lg ${activeImport === opt.id ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-100 text-gray-500'}`}>
                    <opt.icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h3 className={`font-semibold text-sm ${activeImport === opt.id ? 'text-emerald-800' : 'text-gray-900'}`}>{opt.title}</h3>
                      {activeImport === opt.id && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{opt.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Etapas do processo</h3>
              <div className="space-y-6 relative before:absolute before:inset-0 before:ml-3 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-gray-200 before:to-transparent">
                
                {/* Step 1 */}
                <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                  <div className="flex items-center justify-center w-6 h-6 rounded-full bg-emerald-500 text-white shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-emerald-500/30 z-10">
                    <Check className="w-3 h-3" />
                  </div>
                  <div className="w-[calc(100%-3rem)] md:w-[calc(50%-2.5rem)] ml-3 md:ml-0">
                    <h4 className="font-semibold text-sm text-gray-900">Documento importado</h4>
                    <p className="text-xs text-gray-500">Contrato_joao.pdf</p>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                  <div className="flex items-center justify-center w-6 h-6 rounded-full bg-emerald-500 text-white shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-emerald-500/30 z-10">
                    <Check className="w-3 h-3" />
                  </div>
                  <div className="w-[calc(100%-3rem)] md:w-[calc(50%-2.5rem)] ml-3 md:ml-0">
                    <h4 className="font-semibold text-sm text-gray-900">Análise concluída</h4>
                    <p className="text-xs text-gray-500">95% dos dados extraídos</p>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group">
                  <div className="flex items-center justify-center w-6 h-6 rounded-full bg-emerald-50 border-2 border-emerald-500 text-emerald-600 font-bold text-[10px] shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                    3
                  </div>
                  <div className="w-[calc(100%-3rem)] md:w-[calc(50%-2.5rem)] ml-3 md:ml-0">
                    <h4 className="font-semibold text-sm text-emerald-700">Dados extraídos</h4>
                    <p className="text-xs text-emerald-600/80">19 de 20 campos encontrados</p>
                  </div>
                </div>

                {/* Step 4 */}
                <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group">
                  <div className="flex items-center justify-center w-6 h-6 rounded-full bg-white border-2 border-gray-300 text-gray-400 font-bold text-[10px] shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                    4
                  </div>
                  <div className="w-[calc(100%-3rem)] md:w-[calc(50%-2.5rem)] ml-3 md:ml-0 opacity-60">
                    <h4 className="font-medium text-sm text-gray-900">Revisão</h4>
                    <p className="text-xs text-gray-500">Revise e edite os dados</p>
                  </div>
                </div>

              </div>
            </div>
          </div>

          <div className="mt-auto p-4 bg-emerald-50/50 border-t border-gray-100 flex items-center gap-3">
            <ShieldCheck className="w-8 h-8 text-emerald-500 shrink-0" />
            <p className="text-[10px] text-gray-500 leading-tight">
              Seus dados estão protegidos com criptografia de ponta a ponta.
            </p>
          </div>
        </aside>

        {/* Center: Document Viewer */}
        <section className="flex-1 bg-gray-100/50 flex flex-col relative overflow-hidden">
          
          <div className="p-4 shrink-0">
            <div className="bg-white border border-emerald-200 shadow-sm rounded-xl p-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-emerald-800 font-semibold text-sm">Documento analisado com sucesso!</h3>
                  <p className="text-emerald-600/80 text-xs">95% dos dados foram encontrados e preenchidos automaticamente.</p>
                </div>
              </div>
              <button className="px-4 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors">
                Ver análise completa
              </button>
            </div>
          </div>

          <div className="px-8 pb-4 shrink-0 flex items-center justify-between">
            <div className="flex items-center gap-2 bg-white rounded-lg shadow-sm border border-gray-200 p-1">
              <button className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-md"><Edit2 className="w-4 h-4" /></button>
              <div className="w-px h-4 bg-gray-200"></div>
              <button className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-md"><FileText className="w-4 h-4" /></button>
              <button className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-md"><ImageIcon className="w-4 h-4" /></button>
            </div>
            
            <div className="flex items-center gap-3 bg-white rounded-lg shadow-sm border border-gray-200 px-3 py-1.5">
              <button className="text-gray-500 hover:text-gray-900">—</button>
              <span className="text-xs font-medium text-gray-700 w-12 text-center">100%</span>
              <button className="text-gray-500 hover:text-gray-900">+</button>
              <div className="w-px h-4 bg-gray-200 mx-1"></div>
              <button className="text-gray-400 hover:text-gray-900 text-xs">&lt;</button>
              <span className="text-xs font-medium text-gray-700">1 / 8</span>
              <button className="text-gray-500 hover:text-gray-900 text-xs">&gt;</button>
            </div>

            <div className="flex items-center gap-1 bg-white rounded-lg shadow-sm border border-gray-200 p-1">
              <button className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-md"><Search className="w-4 h-4" /></button>
              <button className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-md"><ZoomIn className="w-4 h-4" /></button>
              <button className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-md"><Download className="w-4 h-4" /></button>
              <button className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-md"><Printer className="w-4 h-4" /></button>
              <button className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-md"><Maximize className="w-4 h-4" /></button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-8 pb-16 pt-2">
            <div className="max-w-[800px] mx-auto bg-white shadow-xl min-h-[1100px] border border-gray-200 rounded-sm p-16 font-serif text-[15px] leading-relaxed text-gray-800">
              <h1 className="text-2xl font-bold text-center text-emerald-800 mb-10">CONTRATO DE LOCAÇÃO<br/>DE IMÓVEL URBANO</h1>
              
              <p className="mb-6">Pelo presente instrumento particular de locação de imóvel, as partes abaixo qualificadas têm entre si justo e contratado o seguinte:</p>

              <h2 className="font-bold mb-4 uppercase">Cláusula 1ª – Das Partes</h2>
              
              <p className="mb-4">
                <strong>LOCADOR:</strong> <span className="bg-emerald-100 text-emerald-800 font-semibold px-1 py-0.5 rounded">João da Silva</span>, brasileiro, casado, empresário, inscrito no CPF sob o nº <span className="bg-emerald-100 text-emerald-800 font-semibold px-1 py-0.5 rounded">123.456.789-00</span>, portador do RG nº 12.345.678-9 SSP/SP, residente e domiciliado na <span className="bg-emerald-100 text-emerald-800 font-semibold px-1 py-0.5 rounded">Rua das Flores, 123, Jardim Paulista, São Paulo/SP, CEP 01415-000</span>.
              </p>

              <p className="mb-8">
                <strong>LOCATÁRIO:</strong> <span className="bg-blue-100 text-blue-800 font-semibold px-1 py-0.5 rounded">Maria Oliveira Santos</span>, brasileira, solteira, administradora, inscrita no CPF sob o nº <span className="bg-blue-100 text-blue-800 font-semibold px-1 py-0.5 rounded">987.654.321-00</span>, portadora do RG nº 98.765.432-1 SSP/SP, residente e domiciliada na <span className="bg-emerald-100 text-emerald-800 font-semibold px-1 py-0.5 rounded">Avenida Paulista, 1.000, Bela Vista, São Paulo/SP, CEP 01310-100</span>.
              </p>

              <h2 className="font-bold mb-4 uppercase">Cláusula 2ª – Do Imóvel</h2>

              <p className="mb-8">
                O LOCADOR dá em locação ao LOCATÁRIO o imóvel assim descrito:<br/>
                Apartamento nº 101, localizado na <span className="bg-amber-100 text-amber-800 font-semibold px-1 py-0.5 rounded">Rua das Acácias, 500, Apartamento Centro, São Paulo/SP, CEP 01000-000</span>, com área útil de 80,00m², composto por sala, cozinha, 2 dormitórios, banheiro e área de serviço.
              </p>

              <h2 className="font-bold mb-4 uppercase">Cláusula 3ª – Do Valor e Pagamento</h2>

              <p className="mb-4">
                O aluguel mensal é de <span className="bg-purple-100 text-purple-800 font-semibold px-1 py-0.5 rounded">R$ 2.500,00</span> (dois mil e quinhentos reais), vencível todo dia <span className="bg-pink-100 text-pink-800 font-semibold px-1 py-0.5 rounded">05</span> de cada mês.
              </p>

              <p className="mb-8">
                O pagamento será realizado mediante depósito bancário na conta indicada pelo LOCADOR.
              </p>

              <div className="h-40 border-b border-gray-100 border-dashed"></div>
            </div>
          </div>

          <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-200 py-3 px-6 flex items-center justify-center gap-6 text-[11px] font-medium uppercase text-gray-500 shadow-[0_-4px_10px_rgba(0,0,0,0.05)]">
            <span className="mr-2 text-gray-400 normal-case">Legenda:</span>
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-emerald-400"></div> Locador</div>
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-blue-400"></div> Locatário</div>
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-amber-400"></div> Imóvel</div>
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-purple-400"></div> Valores</div>
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-pink-400"></div> Datas</div>
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-gray-400"></div> Outros</div>
          </div>

        </section>

        {/* Right Sidebar */}
        <aside className="w-[380px] bg-white border-l border-gray-200 flex flex-col shrink-0 z-10 shadow-[-4px_0_15px_rgba(0,0,0,0.03)]">
          
          <div className="h-[55%] flex flex-col border-b border-gray-200">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <h2 className="font-bold text-gray-900">Dados extraídos</h2>
              <button className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1">
                <Edit3 className="w-3 h-3" /> Editar todos
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              
              {/* Accordion Locador */}
              <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                <button 
                  onClick={() => setExpandedSection(expandedSection === 'locador' ? null : 'locador')}
                  className="w-full px-4 py-3 bg-gray-50 flex items-center justify-between text-sm font-bold text-gray-700 uppercase"
                >
                  Locador
                  <ChevronDown className={`w-4 h-4 transition-transform ${expandedSection === 'locador' ? 'rotate-180' : ''}`} />
                </button>
                {expandedSection === 'locador' && (
                  <div className="p-4 bg-white grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <label className="text-[10px] uppercase font-bold text-gray-400 mb-1 block">Nome</label>
                      <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2 bg-gray-50">
                        <User className="w-4 h-4 text-emerald-500" />
                        <span className="text-sm font-medium text-gray-900 truncate">João da Silva</span>
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] uppercase font-bold text-gray-400 mb-1 block">CPF</label>
                      <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2 bg-gray-50">
                        <CreditCard className="w-4 h-4 text-emerald-500" />
                        <span className="text-sm font-medium text-gray-900">123.456.789-00</span>
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] uppercase font-bold text-gray-400 mb-1 block">Telefone</label>
                      <div className="flex items-center justify-between border border-emerald-500 rounded-lg px-2 py-2 bg-emerald-50 ring-2 ring-emerald-500/20">
                        <div className="flex items-center gap-2 overflow-hidden">
                          <Phone className="w-4 h-4 text-emerald-600 shrink-0" />
                          <input type="text" defaultValue="(11) 99999-9999" className="text-sm font-medium text-gray-900 bg-transparent outline-none w-full" />
                        </div>
                        <button className="text-emerald-600 bg-white shadow-sm p-1 rounded-md"><Check className="w-3 h-3" /></button>
                      </div>
                    </div>
                    <div className="col-span-2">
                      <label className="text-[10px] uppercase font-bold text-gray-400 mb-1 block">E-mail</label>
                      <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2 bg-gray-50">
                        <Mail className="w-4 h-4 text-emerald-500" />
                        <span className="text-sm font-medium text-gray-900">joao.silva@email.com</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Accordion Locatário */}
              <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                <button 
                  onClick={() => setExpandedSection(expandedSection === 'locatario' ? null : 'locatario')}
                  className="w-full px-4 py-3 bg-gray-50 flex items-center justify-between text-sm font-bold text-gray-700 uppercase"
                >
                  Locatário
                  <ChevronDown className={`w-4 h-4 transition-transform ${expandedSection === 'locatario' ? 'rotate-180' : ''}`} />
                </button>
                {expandedSection === 'locatario' && (
                  <div className="p-4 bg-white grid grid-cols-2 gap-4">
                     <div className="col-span-2">
                      <label className="text-[10px] uppercase font-bold text-gray-400 mb-1 block">Nome</label>
                      <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2 bg-gray-50">
                        <User className="w-4 h-4 text-emerald-500" />
                        <span className="text-sm font-medium text-gray-900 truncate">Maria Oliveira Santos</span>
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] uppercase font-bold text-gray-400 mb-1 block">CPF</label>
                      <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2 bg-gray-50">
                        <CreditCard className="w-4 h-4 text-emerald-500" />
                        <span className="text-sm font-medium text-gray-900">987.654.321-00</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Accordion Imóvel */}
              <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                <button 
                  onClick={() => setExpandedSection(expandedSection === 'imovel' ? null : 'imovel')}
                  className="w-full px-4 py-3 bg-gray-50 flex items-center justify-between text-sm font-bold text-gray-700 uppercase"
                >
                  Imóvel
                  <ChevronDown className={`w-4 h-4 transition-transform ${expandedSection === 'imovel' ? 'rotate-180' : ''}`} />
                </button>
                {expandedSection === 'imovel' && (
                  <div className="p-4 bg-white grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <label className="text-[10px] uppercase font-bold text-gray-400 mb-1 block">Endereço</label>
                      <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2 bg-gray-50">
                        <MapPin className="w-4 h-4 text-emerald-500" />
                        <span className="text-sm font-medium text-gray-900 truncate">Rua das Acácias, 500</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Accordion Condições */}
              <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                <button 
                  onClick={() => setExpandedSection(expandedSection === 'condicoes' ? null : 'condicoes')}
                  className="w-full px-4 py-3 bg-gray-50 flex items-center justify-between text-sm font-bold text-gray-700 uppercase"
                >
                  Condições
                  <ChevronDown className={`w-4 h-4 transition-transform ${expandedSection === 'condicoes' ? 'rotate-180' : ''}`} />
                </button>
                {expandedSection === 'condicoes' && (
                  <div className="p-4 bg-white grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] uppercase font-bold text-gray-400 mb-1 block">Aluguel</label>
                      <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2 bg-gray-50">
                        <span className="text-sm font-medium text-gray-900">R$ 2.500,00</span>
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] uppercase font-bold text-gray-400 mb-1 block">Vencimento</label>
                      <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2 bg-gray-50">
                        <Calendar className="w-4 h-4 text-emerald-500" />
                        <span className="text-sm font-medium text-gray-900">Dia 05</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

            </div>
          </div>

          <div className="flex-1 flex flex-col bg-gray-50 relative">
            <div className="p-4 border-b border-gray-200 bg-white flex items-center justify-between shadow-sm z-10">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-600" />
                <h3 className="font-bold text-gray-900">Assistente IA</h3>
                <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-800 text-[9px] font-bold uppercase rounded-md">Beta</span>
              </div>
              <button className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              
              <div className="flex items-start gap-2">
                <div className="w-6 h-6 rounded bg-emerald-100 flex items-center justify-center shrink-0 mt-1">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                </div>
                <div className="bg-white border border-gray-200 rounded-2xl rounded-tl-sm p-3 shadow-sm text-sm text-gray-700">
                  Olá! Sou seu assistente jurídico. Como posso ajudar?
                </div>
              </div>

              <div className="flex items-start gap-2 flex-row-reverse">
                <div className="bg-emerald-600 text-white rounded-2xl rounded-tr-sm p-3 shadow-sm text-sm max-w-[85%]">
                  Troque o valor do aluguel para R$ 3.000,00
                </div>
              </div>

              <div className="flex items-start gap-2">
                <div className="w-6 h-6 rounded bg-emerald-100 flex items-center justify-center shrink-0 mt-1">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="bg-emerald-50 border border-emerald-100 rounded-2xl rounded-tl-sm p-3 shadow-sm text-sm text-emerald-800">
                  <strong>Valor do aluguel</strong> atualizado para R$ 3.000,00
                </div>
              </div>

              <div className="flex items-start gap-2 flex-row-reverse">
                <div className="bg-emerald-600 text-white rounded-2xl rounded-tr-sm p-3 shadow-sm text-sm max-w-[85%]">
                  Adicione cláusula de vistoria de entrada e saída
                </div>
              </div>

               <div className="flex items-start gap-2">
                <div className="w-6 h-6 rounded bg-emerald-100 flex items-center justify-center shrink-0 mt-1">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="bg-emerald-50 border border-emerald-100 rounded-2xl rounded-tl-sm p-3 shadow-sm text-sm text-emerald-800">
                  <strong>Cláusula de vistoria</strong> adicionada na página 6
                </div>
              </div>

            </div>

            <div className="p-3 bg-white border-t border-gray-200 shrink-0">
              <div className="relative">
                <input 
                  type="text" 
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Digite sua solicitação..." 
                  className="w-full bg-gray-50 border border-gray-200 rounded-full pl-4 pr-10 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all"
                />
                <button className="absolute right-1.5 top-1/2 -translate-y-1/2 w-8 h-8 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full flex items-center justify-center shadow-md transition-colors">
                  <Send className="w-4 h-4 -ml-0.5" />
                </button>
              </div>
            </div>
          </div>

          <div className="p-4 bg-white border-t border-gray-200 shrink-0 shadow-[0_-10px_20px_rgba(0,0,0,0.03)] z-20">
            <h3 className="font-bold text-gray-900 mb-3 text-sm">Próximos passos</h3>
            
            <div className="space-y-2 mb-4">
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 rounded flex items-center justify-center bg-gray-100 text-gray-500 mt-0.5">
                  <FileCheck className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-gray-800 leading-tight">Revisar documento</h4>
                  <p className="text-[11px] text-gray-500">Confira todas as cláusulas</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 rounded flex items-center justify-center bg-gray-100 text-gray-500 mt-0.5">
                  <Send className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-gray-800 leading-tight">Enviar para assinatura</h4>
                  <p className="text-[11px] text-gray-500">Envie para as partes assinarem</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 rounded flex items-center justify-center bg-gray-100 text-gray-500 mt-0.5">
                  <Download className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-gray-800 leading-tight">Baixar PDF</h4>
                  <p className="text-[11px] text-gray-500">Faça o download do contrato</p>
                </div>
              </div>
            </div>

            <button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 transition-transform active:scale-95">
              <CheckCircle2 className="w-5 h-5" />
              Finalizar e gerar contrato
            </button>
          </div>

        </aside>
      </main>
      
      {/* Footer Branding */}
      <footer className="h-10 bg-white border-t border-gray-200 flex items-center justify-between px-6 shrink-0 text-xs text-gray-500 font-medium">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          <span>WooTech Imob © 2026 - Todos os direitos reservados</span>
        </div>
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          <span className="text-emerald-700">Documento salvo automaticamente</span>
        </div>
        <div>Versão 2.0.0</div>
      </footer>
    </div>
  );
}
