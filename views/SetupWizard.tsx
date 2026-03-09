
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSettings } from '../context/SettingsContext';
import { Building, Palette, Image as ImageIcon, Check, ArrowRight, Loader2 } from 'lucide-react';
import { DEFAULT_SITE_SETTINGS } from '../constants';
import { uploadFile } from '../services/storage';
import { extractColorsFromImage } from '../utils/colors';

const SetupWizard: React.FC = () => {
  const navigate = useNavigate();
  const { updateSettings, settings } = useSettings();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  
  const [formData, setFormData] = useState({
    agencyName: '',
    contactEmail: '',
    contactPhone: '',
    primaryColor: DEFAULT_SITE_SETTINGS.primaryColor,
    secondaryColor: DEFAULT_SITE_SETTINGS.secondaryColor,
    logoUrl: '',
    whatsapp: ''
  });

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      const publicUrl = await uploadFile(file, 'agency-assets');
      if (publicUrl) {
        setFormData(prev => ({ ...prev, logoUrl: publicUrl }));
        
        // Smart Color Detection 🎨
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        img.src = publicUrl;
        
        // Tenta extrair as cores
        try {
          const colors = await extractColorsFromImage(img);
          setFormData(prev => ({
            ...prev,
            logoUrl: publicUrl,
            primaryColor: colors.primary,
            secondaryColor: colors.secondary
          }));
        } catch (colorError) {
          console.warn('Não foi possível extrair cores automaticamente:', colorError);
        }
      }
    } catch (error) {
      alert('Erro ao fazer upload da imagem.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleNext = () => {
    setStep(prev => prev + 1);
  };

  const handleFinish = async () => {
    setLoading(true);
    try {
      await updateSettings({
        ...DEFAULT_SITE_SETTINGS,
        agencyName: formData.agencyName,
        contactEmail: formData.contactEmail,
        contactPhone: formData.contactPhone,
        primaryColor: formData.primaryColor,
        secondaryColor: formData.secondaryColor,
        logoUrl: formData.logoUrl,
        socialLinks: {
          ...DEFAULT_SITE_SETTINGS.socialLinks,
          whatsapp: formData.whatsapp
        }
      });
      // Delay pro usuário ver o sucesso
      setTimeout(() => {
        navigate('/admin');
      }, 1500);
    } catch (error) {
      console.error(error);
      alert('Erro ao salvar configurações inicial. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="max-w-xl w-full bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-100">
        <div className="bg-indigo-600 p-8 text-center text-white relative overflow-hidden">
          <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
          <Building className="mx-auto mb-4 text-indigo-200" size={48} />
          <h1 className="text-2xl font-black uppercase tracking-wide relative z-10">Configuração Inicial</h1>
          <p className="text-indigo-100 text-sm mt-2 relative z-10">Vamos preparar o sistema para sua imobiliária</p>
          
          <div className="flex gap-2 justify-center mt-6">
            {[1, 2, 3].map(i => (
              <div key={i} className={`h-1.5 rounded-full transition-all duration-500 ${step >= i ? 'w-8 bg-white' : 'w-2 bg-white/30'}`}></div>
            ))}
          </div>
        </div>

        <div className="p-8">
          {step === 1 && (
            <div className="space-y-6 animate-fadeIn">
              <div className="text-center mb-6">
                <h2 className="text-lg font-bold text-slate-800">Dados da Empresa</h2>
                <p className="text-slate-500 text-sm">Como sua imobiliária se chama?</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nome da Imobiliária</label>
                  <input 
                    type="text" 
                    className="w-full p-4 bg-slate-50 rounded-xl border-2 border-slate-100 focus:border-indigo-500 focus:bg-white transition-colors outline-none font-bold text-slate-700"
                    placeholder="Ex: Imóveis Ouro Verde"
                    value={formData.agencyName}
                    onChange={e => setFormData({...formData, agencyName: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Email de Contato</label>
                  <input 
                    type="email" 
                    className="w-full p-4 bg-slate-50 rounded-xl border-2 border-slate-100 focus:border-indigo-500 focus:bg-white transition-colors outline-none text-slate-700"
                    placeholder="contato@exemplo.com"
                    value={formData.contactEmail}
                    onChange={e => setFormData({...formData, contactEmail: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">WhatsApp / Telefone</label>
                  <input 
                    type="tel" 
                    className="w-full p-4 bg-slate-50 rounded-xl border-2 border-slate-100 focus:border-indigo-500 focus:bg-white transition-colors outline-none text-slate-700"
                    placeholder="(00) 90000-0000"
                    value={formData.whatsapp}
                    onChange={e => setFormData({...formData, whatsapp: e.target.value, contactPhone: e.target.value})}
                  />
                </div>
              </div>

              <button 
                onClick={handleNext}
                disabled={!formData.agencyName}
                className="w-full mt-6 bg-slate-900 text-white p-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Próximo Passo <ArrowRight size={18} />
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6 animate-fadeIn">
              <div className="text-center mb-6">
                <h2 className="text-lg font-bold text-slate-800">Identidade Visual</h2>
                <p className="text-slate-500 text-sm">Escolha as cores principais do seu site.</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Cor Principal</label>
                  <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-xl border-2 border-slate-100">
                    <input 
                      type="color" 
                      className="w-10 h-10 rounded-lg cursor-pointer border-none"
                      value={formData.primaryColor}
                      onChange={e => setFormData({...formData, primaryColor: e.target.value})}
                    />
                    <span className="text-xs font-mono text-slate-500">{formData.primaryColor}</span>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Cor Secundária</label>
                  <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-xl border-2 border-slate-100">
                    <input 
                      type="color" 
                      className="w-10 h-10 rounded-lg cursor-pointer border-none"
                      value={formData.secondaryColor}
                      onChange={e => setFormData({...formData, secondaryColor: e.target.value})}
                    />
                    <span className="text-xs font-mono text-slate-500">{formData.secondaryColor}</span>
                  </div>
                </div>
              </div>

              <div>
                 <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Logo da Imobiliária</label>
                 <div className="flex gap-2 items-center">
                   {formData.logoUrl ? (
                     <div className="relative group flex flex-col items-center">
                       <div className="h-20 w-40 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-center p-2 mb-2">
                         <img 
                           src={formData.logoUrl} 
                           alt="Preview" 
                           className="max-h-full max-w-full object-contain"
                           onError={(e) => {
                             e.currentTarget.onerror = null; 
                             e.currentTarget.src = 'https://via.placeholder.com/150?text=Erro+Load';
                           }}
                         />
                       </div>
                       <button 
                         onClick={() => setFormData({...formData, logoUrl: ''})}
                         className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                       >
                         <div className="w-3 h-3 flex items-center justify-center font-bold text-[10px]">x</div>
                       </button>
                     </div>
                   ) : (
                     <label className="flex-1 cursor-pointer">
                        <div className="p-4 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/30 transition-all flex items-center justify-center gap-2 group">
                          {isUploading ? (
                              <Loader2 className="animate-spin text-indigo-500" size={20} />
                          ) : (
                              <>
                                <ImageIcon size={20} className="text-slate-400 group-hover:text-indigo-600" />
                                <span className="text-xs font-bold text-slate-500 group-hover:text-indigo-600">Carregar Logo</span>
                              </>
                          )}
                        </div>
                        <input 
                          type="file" 
                          accept="image/*"
                          className="hidden"
                          onChange={handleLogoUpload}
                          disabled={isUploading}
                        />
                     </label>
                   )}
                 </div>
              </div>

              <div className="flex gap-3">
                 <button 
                  onClick={() => setStep(1)}
                  className="flex-1 bg-white text-slate-700 border-2 border-slate-200 p-4 rounded-xl font-bold hover:bg-slate-50 transition-colors"
                >
                  Voltar
                </button>
                <button 
                  onClick={handleNext}
                  className="flex-[2] bg-slate-900 text-white p-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-black transition-colors"
                >
                  Pré-visualizar <ArrowRight size={18} />
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6 animate-fadeIn">
              <div className="text-center mb-6">
                <h2 className="text-lg font-bold text-slate-800">Tudo Pronto!</h2>
                <p className="text-slate-500 text-sm">Confirme as informações abaixo.</p>
              </div>

              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-white shadow-sm flex items-center justify-center text-indigo-600">
                    <Building size={24} />
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 uppercase font-bold">Imobiliária</p>
                    <p className="font-bold text-slate-800">{formData.agencyName}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-white shadow-sm flex items-center justify-center" style={{ color: formData.primaryColor }}>
                    <Palette size={24} />
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 uppercase font-bold">Cores</p>
                    <div className="flex gap-2 mt-1">
                      <div className="w-6 h-6 rounded-md shadow-sm" style={{ backgroundColor: formData.primaryColor }}></div>
                      <div className="w-6 h-6 rounded-md shadow-sm" style={{ backgroundColor: formData.secondaryColor }}></div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                 <button 
                  onClick={() => setStep(2)}
                  className="flex-1 bg-white text-slate-700 border-2 border-slate-200 p-4 rounded-xl font-bold hover:bg-slate-50 transition-colors"
                >
                  Voltar
                </button>
                <button 
                  onClick={handleFinish}
                  disabled={loading}
                  className="flex-[2] bg-green-500 text-white p-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-green-600 transition-colors shadow-green-200 shadow-lg"
                >
                  {loading ? <Loader2 className="animate-spin" /> : <Check size={20} />}
                  Começar Agora
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SetupWizard;
