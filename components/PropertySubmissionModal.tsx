import {
  ChevronRight,
  Home,
  Info,
  MapPin,
  X,
  CheckCircle2,
  Sparkles,
  Plus,
  Trash2,
  Loader2,
  Image as ImageIcon,
} from 'lucide-react';
import { useTexts } from '../context/TextsContext';
import { useSettings } from '../context/SettingsContext';
import { getContrastColor } from '../utils/color';
import InlineEditable from './InlineEditable';
import type { Property } from '../types';

interface PropertySubmissionModalProps {
  isOpen: boolean;
  isSubmitting: boolean;
  submitSuccess: boolean;
  activeStep: number;
  propertyForm: Partial<Property>;
  uploadingImage: boolean;
  onClose: () => void;
  onFormChange: (form: Partial<Property>) => void;
  onStepChange: (step: number) => void;
  onSubmit: (e: React.FormEvent) => Promise<void>;
  onImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
}

const PropertySubmissionModal: React.FC<PropertySubmissionModalProps> = ({
  isOpen,
  isSubmitting,
  submitSuccess,
  activeStep,
  propertyForm,
  uploadingImage,
  onClose,
  onFormChange,
  onStepChange,
  onSubmit,
  onImageUpload,
}) => {
  const { t } = useTexts();
  const { settings } = useSettings();

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-12 backdrop-blur-md animate-in fade-in duration-500"
      style={{ backgroundColor: settings.secondaryColor + 'cc' }}
    >
      <div className="bg-white w-full max-w-6xl h-full max-h-[850px] rounded-[3rem] shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col md:flex-row relative animate-in zoom-in-95 slide-in-from-bottom-10 duration-500">
        {/* Sidebar - Progressive Tracker */}
        <div
          className="w-full md:w-80 p-10 flex flex-col justify-between relative overflow-hidden shrink-0"
          style={{ backgroundColor: settings.secondaryColor }}
        >
          {/* Background Glow */}
          <div
            className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none"
            style={{
              background: `radial-gradient(circle at 0% 0%, ${settings.primaryColor}, transparent 70%)`,
            }}
          ></div>

          <div className="relative z-10">
            <div className="mb-12">
              <h2 className="text-white text-2xl font-bold italic tracking-tighter uppercase leading-tight">
                <InlineEditable textKey="submit_modal.sidebar_title_line1">
                  {t('submit_modal.sidebar_title_line1', 'Venda seu')}
                </InlineEditable>{' '}
                <br />
                <span style={{ color: settings.primaryColor }}>
                  <InlineEditable textKey="submit_modal.sidebar_title_line2">
                    {t('submit_modal.sidebar_title_line2', 'Imóvel Elite')}
                  </InlineEditable>
                </span>
              </h2>
              <p className="text-lg font-medium tracking-tight opacity-70">
                <InlineEditable textKey="submit_modal.sidebar_subtitle">
                  {t('submit_modal.sidebar_subtitle', 'Curadoria de Luxo')}
                </InlineEditable>
              </p>
            </div>

            <div className="space-y-10">
              {[
                {
                  step: 1,
                  label: t('submit_modal.step1_label', 'Proprietário'),
                  icon: Info,
                },
                {
                  step: 2,
                  label: t('submit_modal.step2_label', 'O Imóvel'),
                  icon: Home,
                },
                {
                  step: 3,
                  label: t('submit_modal.step3_label', 'Localização'),
                  icon: MapPin,
                },
                {
                  step: 4,
                  label: t('submit_modal.step4_label', 'Mídias'),
                  icon: ImageIcon,
                },
              ].map((item) => (
                <div
                  key={item.step}
                  className="flex items-center gap-5 group cursor-default"
                >
                  <div
                    className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all duration-500 ${
                      activeStep === item.step
                        ? 'bg-white scale-110 shadow-[0_0_20px_rgba(255,255,255,0.3)]'
                        : activeStep > item.step
                          ? 'text-white'
                          : 'bg-white/5 text-white/30'
                    }`}
                    style={{
                      backgroundColor:
                        activeStep > item.step
                          ? settings.primaryColor
                          : undefined,
                      color:
                        activeStep === item.step
                          ? settings.secondaryColor
                          : undefined,
                    }}
                  >
                    {activeStep > item.step ? (
                      <CheckCircle2 size={18} />
                    ) : (
                      <item.icon size={18} />
                    )}
                  </div>
                  <div className="flex flex-col">
                    <span
                      className={`text-[10px] font-bold uppercase tracking-widest transition-colors ${activeStep === item.step ? 'text-white' : 'text-white/20'}`}
                    >
                      Passo 0{item.step}
                    </span>
                    <span
                      className={`text-sm font-bold transition-colors ${activeStep === item.step ? 'text-white' : 'text-white/40'}`}
                    >
                      {item.label}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="relative z-10 mt-12 pt-10 border-t border-white/10 hidden md:block">
            <p className="text-[10px] text-white/30 font-medium leading-relaxed uppercase tracking-tighter">
              <InlineEditable textKey="submit_modal.disclaimer">
                {t(
                  'submit_modal.disclaimer',
                  'Ao submeter, você concorda que nossa equipe fará uma análise técnica detalhada antes da publicação final.'
                )}
              </InlineEditable>
            </p>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col h-full bg-slate-50/30">
          {/* Top Bar */}
          <div className="p-8 md:p-10 flex items-center justify-end">
            <button
              onClick={onClose}
              className="w-12 h-12 flex items-center justify-center bg-white text-slate-400 hover:text-red-500 rounded-full shadow-lg transition-all hover:rotate-90"
            >
              <X size={20} />
            </button>
          </div>

          {submitSuccess ? (
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center animate-in fade-in slide-in-from-bottom-8 duration-700">
              <div className="relative mb-10 group">
                <div
                  className="absolute inset-0 blur-3xl rounded-full opacity-20 group-hover:blur-[60px] transition-all duration-1000"
                  style={{ backgroundColor: settings.primaryColor }}
                ></div>
                <div
                  className="w-28 h-28 text-white rounded-[2rem] flex items-center justify-center relative z-10 shadow-2xl animate-in zoom-in duration-500 rotate-3 group-hover:rotate-0 transition-transform"
                  style={{ backgroundColor: settings.primaryColor }}
                >
                  <CheckCircle2 size={48} strokeWidth={3} />
                </div>
              </div>
              <h3
                className="text-4xl font-bold italic uppercase tracking-tighter mb-4"
                style={{ color: settings.secondaryColor }}
              >
                <InlineEditable textKey="submit_modal.success_title">
                  {t('submit_modal.success_title', 'Proposta Recebida!')}
                </InlineEditable>
              </h3>
              <p className="text-black/60 max-w-sm mx-auto leading-relaxed font-medium">
                <InlineEditable textKey="submit_modal.success_desc">
                  {t(
                    'submit_modal.success_desc',
                    'Excelente escolha. Nossa equipe de elite já foi notificada e entrará em contato em breve para os próximos passos.'
                  )}
                </InlineEditable>
              </p>
              <button
                onClick={onClose}
                className="mt-12 px-12 py-5 text-white rounded-full font-bold uppercase text-[11px] tracking-[0.3em] shadow-2xl hover:scale-105 active:scale-95 transition-all"
                style={{ backgroundColor: settings.secondaryColor }}
              >
                <InlineEditable textKey="submit_modal.success_button">
                  {t('submit_modal.success_button', 'Voltar para Home')}
                </InlineEditable>
              </button>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto px-8 md:px-20 pb-10 custom-scrollbar flex flex-col">
              {/* Steps Content */}
              <div className="flex-1">
                {activeStep === 1 && (
                  <div className="animate-in fade-in slide-in-from-right-4 duration-500 space-y-10">
                    <div>
                      <h3
                        className="text-3xl font-bold italic uppercase tracking-tighter mb-2"
                        style={{ color: settings.secondaryColor }}
                      >
                        <InlineEditable textKey="submit_modal.step1_title">
                          {t(
                            'submit_modal.step1_title',
                            'Quem é o proprietário?'
                          )}
                        </InlineEditable>
                      </h3>
                      <p className="text-black/60 font-medium">
                        <InlineEditable textKey="submit_modal.step1_subtitle">
                          {t(
                            'submit_modal.step1_subtitle',
                            'Inicie com as informações básicas de contato.'
                          )}
                        </InlineEditable>
                      </p>
                    </div>
                    <div className="grid grid-cols-1 gap-8">
                      <div className="group">
                        <label className="text-[10px] font-bold uppercase text-slate-400 block mb-3 tracking-widest ml-1 transition-colors group-focus-within:text-black">
                          <InlineEditable textKey="submit_modal.field_name_label">
                            {t(
                              'submit_modal.field_name_label',
                              'Nome Completo'
                            )}
                          </InlineEditable>
                        </label>
                        <input
                          required
                          type="text"
                          value={propertyForm.ownerInfo?.name}
                          onChange={(e) =>
                            onFormChange({
                              ...propertyForm,
                              ownerInfo: {
                                ...propertyForm.ownerInfo!,
                                name: e.target.value,
                              },
                            })
                          }
                          className="w-full px-8 py-6 bg-white border border-slate-100 rounded-3xl text-sm font-bold text-slate-700 focus:ring-4 outline-none transition-all shadow-sm"
                          style={
                            {
                              '--tw-ring-color': settings.primaryColor + '15',
                              borderColor: 'var(--focus-border-color)',
                            } as any
                          }
                          onFocus={(e) =>
                            (e.target.style.borderColor =
                              settings.primaryColor)
                          }
                          onBlur={(e) => (e.target.style.borderColor = '')}
                          placeholder={t(
                            'submit_modal.field_name_placeholder',
                            'Ex: Rodrigo Albuquerque'
                          )}
                        />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="group">
                          <label className="text-[10px] font-bold uppercase text-slate-400 block mb-3 tracking-widest ml-1">
                            <InlineEditable textKey="submit_modal.field_email_label">
                              {t(
                                'submit_modal.field_email_label',
                                'E-mail Corporativo'
                              )}
                            </InlineEditable>
                          </label>
                          <input
                            required
                            type="email"
                            value={propertyForm.ownerInfo?.email}
                            onChange={(e) =>
                              onFormChange({
                                ...propertyForm,
                                ownerInfo: {
                                  ...propertyForm.ownerInfo!,
                                  email: e.target.value,
                                },
                              })
                            }
                            className="w-full px-8 py-6 bg-white border border-slate-100 rounded-3xl text-sm font-bold text-slate-700 focus:ring-4 outline-none transition-all shadow-sm"
                            onFocus={(e) =>
                              (e.target.style.borderColor =
                                settings.primaryColor)
                            }
                            onBlur={(e) => (e.target.style.borderColor = '')}
                            placeholder={t(
                              'submit_modal.field_email_placeholder',
                              'rodrigo@email.com'
                            )}
                          />
                        </div>
                        <div className="group">
                          <label className="text-[10px] font-bold uppercase text-slate-400 block mb-3 tracking-widest ml-1">
                            <InlineEditable textKey="submit_modal.field_phone_label">
                              {t(
                                'submit_modal.field_phone_label',
                                'WhatsApp Direto'
                              )}
                            </InlineEditable>
                          </label>
                          <input
                            required
                            type="tel"
                            value={propertyForm.ownerInfo?.phone}
                            onChange={(e) =>
                              onFormChange({
                                ...propertyForm,
                                ownerInfo: {
                                  ...propertyForm.ownerInfo!,
                                  phone: e.target.value,
                                },
                              })
                            }
                            className="w-full px-8 py-6 bg-white border border-slate-100 rounded-3xl text-sm font-bold text-slate-700 focus:ring-4 outline-none transition-all shadow-sm"
                            onFocus={(e) =>
                              (e.target.style.borderColor =
                                settings.primaryColor)
                            }
                            onBlur={(e) => (e.target.style.borderColor = '')}
                            placeholder={t(
                              'submit_modal.field_phone_placeholder',
                              '(00) 00000-0000'
                            )}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeStep === 2 && (
                  <div className="animate-in fade-in slide-in-from-right-4 duration-500 space-y-10">
                    <div>
                      <h3
                        className="text-3xl font-bold italic uppercase tracking-tighter mb-2"
                        style={{ color: settings.secondaryColor }}
                      >
                        <InlineEditable textKey="submit_modal.step2_title">
                          {t(
                            'submit_modal.step2_title',
                            'Detalhes do Imóvel'
                          )}
                        </InlineEditable>
                      </h3>
                      <p className="text-black/60 font-medium">
                        <InlineEditable textKey="submit_modal.step2_subtitle">
                          {t(
                            'submit_modal.step2_subtitle',
                            'O que torna sua propriedade única?'
                          )}
                        </InlineEditable>
                      </p>
                    </div>
                    <div className="space-y-8">
                      <div className="group">
                        <label className="text-[10px] font-bold uppercase text-slate-400 block mb-3 tracking-widest ml-1">
                          <InlineEditable textKey="submit_modal.field_title_impact">
                            {t(
                              'submit_modal.field_title_impact',
                              'Título de Impacto'
                            )}
                          </InlineEditable>
                        </label>
                        <input
                          required
                          type="text"
                          value={propertyForm.title}
                          onChange={(e) =>
                            onFormChange({
                              ...propertyForm,
                              title: e.target.value,
                            })
                          }
                          className="w-full px-8 py-6 bg-white border border-slate-100 rounded-3xl text-sm font-bold text-slate-700 focus:ring-4 outline-none transition-all shadow-sm"
                          onFocus={(e) =>
                            (e.target.style.borderColor =
                              settings.primaryColor)
                          }
                          onBlur={(e) => (e.target.style.borderColor = '')}
                          placeholder={t(
                            'submit_modal.field_title_placeholder',
                            'Ex: Mansão suspensa com vista definitiva para o mar'
                          )}
                        />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="group">
                          <label className="text-[10px] font-bold uppercase text-slate-400 block mb-3 tracking-widest ml-1">
                            <InlineEditable textKey="submit_modal.field_type_label">
                              {t(
                                'submit_modal.field_type_label',
                                'Tipo de Imóvel'
                              )}
                            </InlineEditable>
                          </label>
                          <div className="relative">
                            <select
                              className="w-full px-8 py-6 bg-white border border-slate-100 rounded-3xl text-sm font-bold text-slate-700 focus:ring-4 outline-none appearance-none cursor-pointer shadow-sm transition-all"
                              value={propertyForm.type}
                              onChange={(e) =>
                                onFormChange({
                                  ...propertyForm,
                                  type: e.target.value as any,
                                })
                              }
                              onFocus={(e) =>
                                (e.target.style.borderColor =
                                  settings.primaryColor)
                              }
                              onBlur={(e) => (e.target.style.borderColor = '')}
                            >
                              <option value="Apartamento">
                                {t(
                                  'property_type.apt',
                                  'Apartamento de Alto Padrão'
                                )}
                              </option>
                              <option value="Casa">
                                {t(
                                  'property_type.house',
                                  'Casa / Villa de Luxo'
                                )}
                              </option>
                              <option value="Terreno">
                                {t(
                                  'property_type.farm',
                                  'Fazenda / Haras / Rural'
                                )}
                              </option>
                              <option value="Comercial">
                                {t(
                                  'property_type.com',
                                  'Corporativo / Industrial'
                                )}
                              </option>
                            </select>
                            <ChevronRight
                              className="absolute right-8 top-1/2 -translate-y-1/2 rotate-90 text-slate-400 pointer-events-none"
                              size={16}
                            />
                          </div>
                        </div>
                        <div className="group">
                          <label className="text-[10px] font-bold uppercase text-slate-400 block mb-3 tracking-widest ml-1">
                            <InlineEditable textKey="submit_modal.field_price_label">
                              {t(
                                'submit_modal.field_price_label',
                                'Preço Sugerido (R$)'
                              )}
                            </InlineEditable>
                          </label>
                          <input
                            type="number"
                            value={propertyForm.price}
                            onChange={(e) =>
                              onFormChange({
                                ...propertyForm,
                                price: Number(e.target.value),
                              })
                            }
                            className="w-full px-8 py-6 bg-white border border-slate-100 rounded-3xl text-sm font-bold outline-none transition-all shadow-sm"
                            style={{ color: settings.primaryColor }}
                            onFocus={(e) =>
                              (e.target.style.borderColor =
                                settings.primaryColor)
                            }
                            onBlur={(e) => (e.target.style.borderColor = '')}
                          />
                        </div>
                      </div>
                      <div className="group w-1/2">
                        <label className="text-[10px] font-bold uppercase text-slate-400 block mb-3 tracking-widest ml-1">
                          <InlineEditable textKey="submit_modal.field_area_label">
                            {t(
                              'submit_modal.field_area_label',
                              'Área Privativa (m²)'
                            )}
                          </InlineEditable>
                        </label>
                        <input
                          type="number"
                          value={propertyForm.features?.areaM2}
                          onChange={(e) =>
                            onFormChange({
                              ...propertyForm,
                              features: {
                                ...propertyForm.features!,
                                areaM2: Number(e.target.value),
                              },
                            })
                          }
                          className="w-full px-8 py-6 bg-white border border-slate-100 rounded-3xl text-sm font-bold text-slate-700 focus:ring-4 outline-none transition-all shadow-sm"
                          onFocus={(e) =>
                            (e.target.style.borderColor =
                              settings.primaryColor)
                          }
                          onBlur={(e) => (e.target.style.borderColor = '')}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {activeStep === 3 && (
                  <div className="animate-in fade-in slide-in-from-right-4 duration-500 space-y-10">
                    <div>
                      <h3
                        className="text-3xl font-bold italic uppercase tracking-tighter mb-2"
                        style={{ color: settings.secondaryColor }}
                      >
                        <InlineEditable textKey="submit_modal.step3_title">
                          {t('submit_modal.step3_title', 'Onde fica?')}
                        </InlineEditable>
                      </h3>
                      <p className="text-black/60 font-medium">
                        <InlineEditable textKey="submit_modal.step3_subtitle">
                          {t(
                            'submit_modal.step3_subtitle',
                            'Sua localização deve ser precisa para valorizar o m².'
                          )}
                        </InlineEditable>
                      </p>
                    </div>
                    <div className="space-y-8">
                      <div className="group">
                        <label className="text-[10px] font-bold uppercase text-slate-400 block mb-3 tracking-widest ml-1">
                          <InlineEditable textKey="submit_modal.field_address_label">
                            {t(
                              'submit_modal.field_address_label',
                              'Endereço Completo'
                            )}
                          </InlineEditable>
                        </label>
                        <input
                          required
                          type="text"
                          value={propertyForm.location?.address}
                          onChange={(e) =>
                            onFormChange({
                              ...propertyForm,
                              location: {
                                ...propertyForm.location!,
                                address: e.target.value,
                              },
                            })
                          }
                          className="w-full px-8 py-6 bg-white border border-slate-100 rounded-3xl text-sm font-bold text-slate-700 focus:ring-4 outline-none transition-all shadow-sm"
                          onFocus={(e) =>
                            (e.target.style.borderColor =
                              settings.primaryColor)
                          }
                          onBlur={(e) => (e.target.style.borderColor = '')}
                          placeholder={t(
                            'submit_modal.field_address_placeholder',
                            'Rua, número e CEP'
                          )}
                        />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="group">
                          <label className="text-[10px] font-bold uppercase text-slate-400 block mb-3 tracking-widest ml-1">
                            <InlineEditable textKey="submit_modal.field_city_label">
                              {t(
                                'submit_modal.field_city_label',
                                'Cidade / Munícipio'
                              )}
                            </InlineEditable>
                          </label>
                          <input
                            required
                            type="text"
                            value={propertyForm.location?.city}
                            onChange={(e) =>
                              onFormChange({
                                ...propertyForm,
                                location: {
                                  ...propertyForm.location!,
                                  city: e.target.value,
                                },
                              })
                            }
                            className="w-full px-8 py-6 bg-white border border-slate-100 rounded-3xl text-sm font-bold text-slate-700 focus:ring-4 outline-none transition-all shadow-sm"
                            onFocus={(e) =>
                              (e.target.style.borderColor =
                                settings.primaryColor)
                            }
                            onBlur={(e) => (e.target.style.borderColor = '')}
                            placeholder={t(
                              'submit_modal.field_city_placeholder',
                              'Ex: Ribeirão Preto'
                            )}
                          />
                        </div>
                        <div className="group">
                          <label className="text-[10px] font-bold uppercase text-slate-400 block mb-3 tracking-widest ml-1">
                            <InlineEditable textKey="submit_modal.field_neighborhood_label">
                              {t(
                                'submit_modal.field_neighborhood_label',
                                'Bairro / Região'
                              )}
                            </InlineEditable>
                          </label>
                          <input
                            required
                            type="text"
                            value={propertyForm.location?.neighborhood}
                            onChange={(e) =>
                              onFormChange({
                                ...propertyForm,
                                location: {
                                  ...propertyForm.location!,
                                  neighborhood: e.target.value,
                                },
                              })
                            }
                            className="w-full px-8 py-6 bg-white border border-slate-100 rounded-3xl text-sm font-bold text-slate-700 focus:ring-4 outline-none transition-all shadow-sm"
                            onFocus={(e) =>
                              (e.target.style.borderColor =
                                settings.primaryColor)
                            }
                            onBlur={(e) => (e.target.style.borderColor = '')}
                            placeholder={t(
                              'submit_modal.field_neighborhood_placeholder',
                              'Ex: Jardim Botânico'
                            )}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeStep === 4 && (
                  <div className="animate-in fade-in slide-in-from-right-4 duration-500 space-y-10">
                    <div>
                      <h3
                        className="text-3xl font-bold italic uppercase tracking-tighter mb-2"
                        style={{ color: settings.secondaryColor }}
                      >
                        <InlineEditable textKey="submit_modal.step4_title">
                          {t(
                            'submit_modal.step4_title',
                            'Visuais & Galeria'
                          )}
                        </InlineEditable>
                      </h3>
                      <p className="text-black/60 font-medium">
                        <InlineEditable textKey="submit_modal.step4_subtitle">
                          {t(
                            'submit_modal.step4_subtitle',
                            'Bons visuais aumentam a conversão em até 80%.'
                          )}
                        </InlineEditable>
                      </p>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                      {propertyForm.images?.map((img, idx) => (
                        <div
                          key={idx}
                          className="relative aspect-[4/5] rounded-[2rem] overflow-hidden group border-2 border-white shadow-xl hover:scale-[1.02] transition-all"
                        >
                          <img
                            src={img}
                            className="w-full h-full object-cover"
                          />
                          <div
                            className="absolute inset-0 bg-red-500/90 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all cursor-pointer"
                            onClick={() =>
                              onFormChange({
                                ...propertyForm,
                                images: propertyForm.images?.filter(
                                  (_, i) => i !== idx
                                ),
                              })
                            }
                          >
                            <Trash2 size={24} />
                          </div>
                        </div>
                      ))}
                      <label
                        className="aspect-[4/5] border-3 border-dashed border-slate-200 rounded-[2rem] flex flex-col items-center justify-center text-slate-400 hover:border-slate-950 transition-all bg-white cursor-pointer group shadow-sm"
                        style={{ borderColor: 'transparent' }}
                        onMouseEnter={(e) =>
                          (e.currentTarget.style.borderColor =
                            settings.secondaryColor)
                        }
                        onMouseLeave={(e) =>
                          (e.currentTarget.style.borderColor = '')
                        }
                      >
                        {uploadingImage ? (
                          <Loader2
                            className="animate-spin"
                            size={32}
                            style={{ color: settings.secondaryColor }}
                          />
                        ) : (
                          <>
                            <div
                              className="w-16 h-16 bg-slate-50 rounded-3xl flex items-center justify-center mb-4 group-hover:text-white transition-all"
                              style={
                                {
                                  backgroundColor: 'var(--hover-bg, #f8fafc)',
                                } as any
                              }
                              onMouseEnter={(e) =>
                                (e.currentTarget.style.backgroundColor =
                                  settings.secondaryColor)
                              }
                              onMouseLeave={(e) =>
                                (e.currentTarget.style.backgroundColor = '')
                              }
                            >
                              <Plus size={24} />
                            </div>
                            <span className="text-[10px] font-bold uppercase tracking-widest text-center px-4">
                              <InlineEditable textKey="submit_modal.add_photos">
                                {t(
                                  'submit_modal.add_photos',
                                  'Adicionar Fotografias'
                                )}
                              </InlineEditable>
                            </span>
                          </>
                        )}
                        <input
                          type="file"
                          multiple
                          accept="image/*"
                          className="hidden"
                          onChange={onImageUpload}
                        />
                      </label>
                    </div>
                  </div>
                )}
              </div>

              {/* Navigation Buttons */}
              <div className="mt-20 pt-10 border-t border-slate-100 flex justify-between items-center bg-white/50 backdrop-blur-sm -mx-8 md:-mx-20 px-8 md:px-20 pb-10 sticky bottom-0">
                <button
                  type="button"
                  onClick={() =>
                    activeStep > 1 && onStepChange(activeStep - 1)
                  }
                  disabled={activeStep === 1}
                  className="text-[11px] font-bold uppercase tracking-widest text-slate-400 hover:text-black disabled:opacity-0 transition-all flex items-center gap-2"
                >
                  <ChevronRight className="rotate-180" size={16} />{' '}
                  <InlineEditable textKey="submit_modal.nav_back">
                    {t('submit_modal.nav_back', 'Voltar')}
                  </InlineEditable>
                </button>

                {activeStep < 4 ? (
                  <button
                    type="button"
                    onClick={() => onStepChange(activeStep + 1)}
                    className="px-12 py-5 text-white rounded-full font-bold uppercase text-[11px] tracking-[0.3em] shadow-2xl hover:scale-105 active:scale-95 transition-all flex items-center gap-3 group"
                    style={{
                      backgroundColor: settings.primaryColor,
                      color: getContrastColor(settings.primaryColor),
                    }}
                  >
                    <InlineEditable textKey="submit_modal.nav_continue">
                      {t(
                        'submit_modal.nav_continue',
                        'Continuar para Passo 0'
                      )}
                    </InlineEditable>{' '}
                    {activeStep + 1}
                    <ChevronRight
                      size={16}
                      className="group-hover:translate-x-1 transition-transform"
                    />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={onSubmit}
                    disabled={isSubmitting}
                    className="px-16 py-5 text-white rounded-full font-bold uppercase text-[11px] tracking-[0.3em] shadow-[0_20px_40px_-10px_rgba(0,0,0,0.3)] hover:scale-105 active:scale-95 transition-all flex items-center gap-3 group disabled:opacity-50"
                    style={{
                      backgroundColor: settings.primaryColor,
                      color: getContrastColor(settings.primaryColor),
                    }}
                  >
                    {isSubmitting ? (
                      <Loader2 className="animate-spin" size={18} />
                    ) : (
                      <Sparkles size={18} />
                    )}
                    <InlineEditable textKey="submit_modal.nav_finish">
                      {t('submit_modal.nav_finish', 'Finalizar Submissão')}
                    </InlineEditable>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PropertySubmissionModal;
