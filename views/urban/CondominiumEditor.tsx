import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Upload,
  MapPin,
  Building2,
  Users,
  Info,
  CheckCircle2,
  Circle,
  LayoutTemplate,
} from 'lucide-react';

export default function CondominiumEditor() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: 'Residencial Aurora',
    type: 'Residencial',
    cnpj: '12.345.678/0001-90',
    status: 'Ativo',
    developer: 'Construtora Horizonte',
    deliveryYear: '2022',
    zipcode: '88000-000',
    street: 'Avenida das Palmeiras',
    number: '1250',
    complement: 'Torre Central',
    neighborhood: 'Centro',
    city: 'Florianópolis',
    state: 'SC',
    totalUnits: '144',
    floors: '12',
    parkingSpots: '180',
  });

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <div className="wootech-reference-screen w-full max-w-[1600px] mx-auto pb-24 font-sans text-slate-800 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 text-sm text-slate-500 mb-2">
            <span className="font-medium text-slate-400">Imóveis</span>
            <span className="text-slate-300">/</span>
            <span className="font-medium text-slate-400">Condomínios</span>
            <span className="text-slate-300">/</span>
            <span className="text-emerald-600 font-semibold">
              Novo cadastro
            </span>
          </div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
            Cadastrar condomínio
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Centralize estrutura, administração, contatos e documentos em um só
            lugar.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => toast.info('Rascunho salvo com sucesso')}
            className="px-5 py-2.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold text-sm rounded-lg transition-all shadow-sm"
          >
            Salvar rascunho
          </button>
          <button
            onClick={() => toast.info('Avançar para próxima etapa')}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm rounded-lg transition-all shadow-sm"
          >
            Continuar
          </button>
        </div>
      </div>

      {/* Main Steps */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm mb-6 p-4 overflow-x-auto">
        <div className="flex items-center justify-between min-w-[800px] relative">
          <div className="absolute top-1/2 left-8 right-8 h-px bg-slate-200 -z-10" />

          <div className="flex items-center gap-3 bg-white pr-4">
            <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center text-sm font-bold shadow-sm">
              1
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900 leading-tight">
                Identificação
              </p>
              <p className="text-[10px] font-bold text-emerald-600">20%</p>
            </div>
          </div>

          <div className="flex items-center gap-3 bg-white px-4">
            <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center text-sm font-bold">
              2
            </div>
            <p className="text-sm font-medium text-slate-500">Estrutura</p>
          </div>

          <div className="flex items-center gap-3 bg-white px-4">
            <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center text-sm font-bold">
              3
            </div>
            <p className="text-sm font-medium text-slate-500">Administração</p>
          </div>

          <div className="flex items-center gap-3 bg-white px-4">
            <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center text-sm font-bold">
              4
            </div>
            <p className="text-sm font-medium text-slate-500">Comodidades</p>
          </div>

          <div className="flex items-center gap-3 bg-white pl-4">
            <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center text-sm font-bold">
              5
            </div>
            <p className="text-sm font-medium text-slate-500">Documentos</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col xl:flex-row gap-6">
        {/* Left Column (Forms) */}
        <div className="flex-1 space-y-6">
          {/* Identificação Section */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 lg:p-8">
            <h2 className="text-lg font-bold text-slate-900 mb-6">
              Identificação do condomínio
            </h2>

            <div className="flex flex-col md:flex-row gap-8">
              {/* Photo Upload */}
              <div className="w-full md:w-64 shrink-0">
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  Foto de capa
                </label>
                <div className="w-full h-48 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-100 transition-colors group relative overflow-hidden">
                  <div className="absolute inset-0 bg-slate-200/50 flex flex-col items-center justify-center text-slate-500 opacity-50 group-hover:opacity-100 transition-opacity">
                    <Building2 size={64} className="text-slate-300 mb-2" />
                  </div>
                  <div className="relative z-10 flex flex-col items-center bg-white/90 p-3 rounded-lg shadow-sm">
                    <Upload size={20} className="text-slate-700 mb-1" />
                    <p className="text-sm font-bold text-slate-700">
                      Adicionar foto
                    </p>
                    <p className="text-[10px] text-slate-500 mt-1">
                      JPG, PNG até 5MB
                    </p>
                  </div>
                </div>
              </div>

              {/* Form Fields */}
              <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">
                    Nome do condomínio <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">
                    Tipo <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="type"
                    value={formData.type}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 appearance-none focus:ring-2 focus:ring-emerald-500 outline-none transition-all bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20width%3D%2220%22%20height%3D%2220%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpath%20d%3D%22M5%207l5%205%205-5%22%20fill%3D%22none%22%20stroke%3D%22%2394a3b8%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[position:right_0.75rem_center]"
                  >
                    <option value="Residencial">Residencial</option>
                    <option value="Comercial">Comercial</option>
                    <option value="Misto">Misto</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">
                    CNPJ
                  </label>
                  <input
                    type="text"
                    name="cnpj"
                    value={formData.cnpj}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">
                    Status
                  </label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 appearance-none focus:ring-2 focus:ring-emerald-500 outline-none transition-all bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20width%3D%2220%22%20height%3D%2220%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpath%20d%3D%22M5%207l5%205%205-5%22%20fill%3D%22none%22%20stroke%3D%22%2394a3b8%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[position:right_0.75rem_center]"
                  >
                    <option value="Ativo">Ativo</option>
                    <option value="Inativo">Inativo</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">
                    Incorporadora / Construtora
                  </label>
                  <input
                    type="text"
                    name="developer"
                    value={formData.developer}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">
                    Ano de entrega
                  </label>
                  <input
                    type="text"
                    name="deliveryYear"
                    value={formData.deliveryYear}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Endereço Section */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 lg:p-8">
            <h2 className="text-lg font-bold text-slate-900 mb-6">Endereço</h2>

            <div className="flex flex-col md:flex-row gap-8">
              <div className="flex-1 space-y-5">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">
                    CEP
                  </label>
                  <div className="flex items-center gap-4">
                    <input
                      type="text"
                      name="zipcode"
                      value={formData.zipcode}
                      onChange={handleInputChange}
                      className="w-48 px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                    />
                    <button
                      onClick={() => toast.info('Busca de CEP em breve')}
                      className="text-sm font-bold text-emerald-600 hover:text-emerald-700"
                    >
                      Buscar CEP
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-5">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-bold text-slate-700 mb-1">
                      Rua
                    </label>
                    <input
                      type="text"
                      name="street"
                      value={formData.street}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">
                      Número
                    </label>
                    <input
                      type="text"
                      name="number"
                      value={formData.number}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">
                      Complemento
                    </label>
                    <input
                      type="text"
                      name="complement"
                      value={formData.complement}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">
                      Bairro
                    </label>
                    <input
                      type="text"
                      name="neighborhood"
                      value={formData.neighborhood}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">
                      Cidade
                    </label>
                    <input
                      type="text"
                      name="city"
                      value={formData.city}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">
                      Estado
                    </label>
                    <select
                      name="state"
                      value={formData.state}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 appearance-none focus:ring-2 focus:ring-emerald-500 outline-none transition-all bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20width%3D%2220%22%20height%3D%2220%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpath%20d%3D%22M5%207l5%205%205-5%22%20fill%3D%22none%22%20stroke%3D%22%2394a3b8%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[position:right_0.75rem_center]"
                    >
                      <option value="SC">SC</option>
                      <option value="SP">SP</option>
                      <option value="RJ">RJ</option>
                      <option value="PR">PR</option>
                      <option value="RS">RS</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Map Mock */}
              <div className="w-full md:w-72 shrink-0">
                <div className="w-full h-full min-h-[240px] bg-emerald-50 rounded-xl overflow-hidden relative border border-emerald-100 flex items-center justify-center">
                  <div
                    className="absolute inset-0 opacity-20"
                    style={{
                      backgroundImage:
                        'repeating-linear-gradient(45deg, #059669 25%, transparent 25%, transparent 75%, #059669 75%, #059669)',
                      backgroundPosition: '0 0, 10px 10px',
                      backgroundSize: '20px 20px',
                    }}
                  ></div>
                  <div className="absolute inset-0 bg-gradient-to-br from-emerald-100/50 to-blue-100/50 mix-blend-overlay"></div>
                  <MapPin
                    size={40}
                    className="text-emerald-600 relative z-10 filter drop-shadow-md"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Configuração Inicial */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 lg:p-8">
            <h2 className="text-lg font-bold text-slate-900 mb-6">
              Configuração inicial
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">
                  Total de unidades
                </label>
                <input
                  type="text"
                  name="totalUnits"
                  value={formData.totalUnits}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">
                  Andares
                </label>
                <input
                  type="text"
                  name="floors"
                  value={formData.floors}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">
                  Vagas
                </label>
                <input
                  type="text"
                  name="parkingSpots"
                  value={formData.parkingSpots}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                />
              </div>
            </div>
            <p className="text-sm text-slate-500">
              Você poderá cadastrar blocos e unidades detalhadamente após
              concluir.
            </p>
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="w-full xl:w-[380px] shrink-0 space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6">
            <h3 className="text-base font-bold text-slate-900 mb-6">
              Resumo do cadastro
            </h3>

            <div className="flex items-center gap-4 mb-8">
              <div className="w-16 h-16 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center">
                <Building2 size={28} className="text-slate-300" />
              </div>
              <div>
                <p className="font-bold text-slate-900">
                  {formData.name || 'Nome do condomínio'}
                </p>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 mt-1">
                  Ativo
                </span>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <Circle
                    size={16}
                    className="text-emerald-500 fill-emerald-50"
                  />
                  <span className="font-medium text-slate-900">
                    Identificação
                  </span>
                </div>
                <span className="text-xs text-slate-400">Em preenchimento</span>
              </div>

              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <Circle
                    size={16}
                    className="text-emerald-500 fill-emerald-50"
                  />
                  <span className="font-medium text-slate-900">Endereço</span>
                </div>
                <span className="text-xs text-slate-400">Em preenchimento</span>
              </div>

              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <Circle size={16} className="text-slate-200" />
                  <span className="text-slate-500">Estrutura</span>
                </div>
                <span className="text-xs text-slate-300">Pendente</span>
              </div>

              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <Circle size={16} className="text-slate-200" />
                  <span className="text-slate-500">Administração</span>
                </div>
                <span className="text-xs text-slate-300">Pendente</span>
              </div>

              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <Circle size={16} className="text-slate-200" />
                  <span className="text-slate-500">Comodidades</span>
                </div>
                <span className="text-xs text-slate-300">Pendente</span>
              </div>

              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <Circle size={16} className="text-slate-200" />
                  <span className="text-slate-500">Documentos</span>
                </div>
                <span className="text-xs text-slate-300">Pendente</span>
              </div>
            </div>
          </div>

          <div className="bg-[#f8fafc] border border-slate-200 rounded-2xl shadow-sm p-6">
            <h3 className="text-base font-bold text-slate-900 mb-6">
              O que será criado?
            </h3>

            <div className="space-y-6 mb-6">
              <div className="flex items-start gap-4">
                <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg">
                  <LayoutTemplate size={20} />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900 leading-none mb-1.5">
                    Página do condomínio
                  </p>
                  <p className="text-xs text-slate-500">
                    Página pública com informações e contatos.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg">
                  <Building2 size={20} />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900 leading-none mb-1.5">
                    Estrutura de blocos e unidades
                  </p>
                  <p className="text-xs text-slate-500">
                    Cadastro organizado de blocos e unidades.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg">
                  <Users size={20} />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900 leading-none mb-1.5">
                    Vínculo com imóveis e proprietários
                  </p>
                  <p className="text-xs text-slate-500">
                    Integração com proprietários e moradores.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white border border-emerald-100 rounded-lg p-3 flex items-start gap-2">
              <Info size={16} className="text-emerald-600 shrink-0 mt-0.5" />
              <p className="text-xs text-slate-600">
                Os dados poderão ser atualizados depois.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer sticky bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-4 shadow-[0_-4px_6px_-1px_rgb(0,0,0,0.05)] z-50">
        <div className="max-w-[1600px] mx-auto flex items-center justify-between">
          <p className="text-sm font-bold text-slate-700">Etapa 1 de 5</p>
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/urban/condominios')}
              className="px-5 py-2.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-sm rounded-lg transition-all"
            >
              Cancelar
            </button>
            <button
              onClick={() => toast.info('Rascunho salvo com sucesso')}
              className="px-5 py-2.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-sm rounded-lg transition-all hidden sm:block"
            >
              Salvar rascunho
            </button>
            <button
              onClick={() => toast.info('Avançar para próxima etapa')}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-lg transition-all shadow-sm"
            >
              Continuar para Estrutura
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
