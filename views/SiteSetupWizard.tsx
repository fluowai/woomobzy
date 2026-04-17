import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../services/supabase';
import { geminiService } from '../services/geminiService';
import { landingPageService } from '../services/landingPages';
import { LANDING_PAGE_TEMPLATES, generateBlocksFromTemplate } from '../services/landingPageTemplates';
import { useNavigate } from 'react-router-dom';
import { 
  Sparkles, 
  ArrowRight, 
  ArrowLeft, 
  CheckCircle, 
  Image as ImageIcon, 
  Loader2, 
  Globe, 
  Palette, 
  DownloadCloud, 
  Check 
} from 'lucide-react';

const SiteSetupWizard: React.FC = () => {
  const { profile, user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  
  // Dados do Wizard
  const [siteData, setSiteData] = useState({
    title: '',
    description: '',
    metaTitle: '',
    selectedTemplateId: '',
    primaryColor: '#2563eb',
    secondaryColor: '#10b981',
    logoBase64: '',
    migrationUrl: '',
    domainSlug: '',
    extractedProperties: [] as any[]
  });

  const [aiGenerating, setAiGenerating] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const [migrating, setMigrating] = useState(false);
  const [migrationLogs, setMigrationLogs] = useState<string[]>([]);
  const [finishing, setFinishing] = useState(false);

  useEffect(() => {
    // Carregar infos iniciais
    const fetchOrgData = async () => {
      if (!profile?.organization_id) {
        setLoading(false);
        return;
      }
      
      const { data } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', profile.organization_id)
        .single();
        
      if (data) {
        setSiteData(prev => ({
          ...prev, 
          domainSlug: data.slug || 'meusite',
          title: `Imóveis | ${data.name}`
        }));
      }
      setLoading(false);
    };
    
    fetchOrgData();
  }, [profile]);

  const updateData = (key: string, value: any) => {
    setSiteData(prev => ({ ...prev, [key]: value }));
  };

  // ===================================
  // PASSO 1: COPY COM IA
  // ===================================
  const generateCopyWithAI = async () => {
    setAiGenerating(true);
    try {
      const orgName = siteData.title.split('|')[1]?.trim() || "Imobiliária";
      const prompt = `Gere dados de marketing poderosos para o novo site de uma imobiliária chamada "${orgName}". 
      Retorne APENAS um JSON:
      {
        "heroTitle": "Título impactante principal",
        "description": "Texto descritivo de 2 frases focado em conversão e confiança"
      }`;
      const response = await geminiService.generateText(prompt);
      const cleanJson = response.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleanJson);
      
      if (parsed.heroTitle) updateData('title', parsed.heroTitle);
      if (parsed.description) updateData('description', parsed.description);
    } catch (e) {
      console.error(e);
      alert('Erro ao gerar com IA, por favor digite manualmente.');
    } finally {
      setAiGenerating(false);
    }
  };

  // ===================================
  // PASSO 2: LOGO E CORES (IA)
  // ===================================
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    
    setLogoUploading(true);
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async () => {
      const base64 = reader.result as string;
      updateData('logoBase64', base64);
      
      try {
        const colors = await geminiService.extractColorsFromLogo(base64, file.type);
        updateData('primaryColor', colors.primaryColor);
        updateData('secondaryColor', colors.secondaryColor);
      } catch (err) {
        console.error('Erro na extracao de cor', err);
      } finally {
        setLogoUploading(false);
      }
    };
  };

  // ===================================
  // PASSO 3: MIGRAÇÃO (PORTAIS)
  // ===================================
  const handleStartMigration = async () => {
    if (!siteData.migrationUrl) return;
    setMigrating(true);
    setMigrationLogs(["Conectando ao sistema de importação...", "Validando URL: " + siteData.migrationUrl]);
    
    try {
      const response = await fetch('http://localhost:3002/api/import/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: siteData.migrationUrl, organizationId: profile?.organization_id }),
      });

      if (!response.ok) {
        setMigrationLogs(prev => [...prev, "❌ Erro: O servidor de extração não respondeu ou URL inválida."]);
      } else {
         const data = await response.json();
         updateData('extractedProperties', data.properties || []);
         setMigrationLogs(prev => [...prev, `✅ Extração concluída! Mostrando ${data.properties?.length || 0} imóveis abaixo.`]);
      }
    } catch (e) {
      setMigrationLogs(prev => [...prev, "❌ Falha severa (O robô local pode estar offline)."]);
    } finally {
      // Deixa a barra carregar um pouquinho pro feedback ficar legal
      setTimeout(() => setMigrating(false), 2000);
    }
  };

  // ===================================
  // PASSO 4: FINALIZAÇÃO
  // ===================================
  const handlePublish = async () => {
    if (!profile?.organization_id || !user?.id) return;
    setFinishing(true);
    
    try {
      const template = LANDING_PAGE_TEMPLATES.find(t => t.id === siteData.selectedTemplateId) 
                         || LANDING_PAGE_TEMPLATES[0];
                         
      // Aplica as cores escolhidas em themeConfig
      const newTheme = {
        ...template.themeConfig,
        primaryColor: siteData.primaryColor,
        secondaryColor: siteData.secondaryColor
      };

      // Tenta atualizar a logo globalmente (silencioso)
      if (siteData.logoBase64) {
         try {
           await supabase.from('site_settings').upsert({
              organization_id: profile.organization_id,
              logo: siteData.logoBase64
           }, { onConflict: 'organization_id' });
         } catch(e) {}
      }

      // Cria a Landing Page Principal
      const newPage = await landingPageService.create({
        organizationId: profile.organization_id,
        userId: user.id,
        name: 'Site Principal',
        slug: siteData.domainSlug || 'home',
        title: siteData.title || template.name,
        description: siteData.description,
        templateId: template.id,
        themeConfig: newTheme,
        blocks: generateBlocksFromTemplate(template.blocks),
        status: 'published' as any, // LandingPageStatus.PUBLISHED
      });

      // Salva os imóveis migrados (se existirem)
      if (siteData.extractedProperties && siteData.extractedProperties.length > 0) {
        try {
           await fetch('http://localhost:3002/api/import/finalize', {
             method: 'POST',
             headers: { 'Content-Type': 'application/json' },
             body: JSON.stringify({ properties: siteData.extractedProperties, organizationId: profile.organization_id }),
           });
           console.log('✅ Imóveis importados salvos com sucesso.');
        } catch (e) {
           console.error('❌ Erro ao salvar imóveis importados no banco.', e);
        }
      }

      alert('🎉 Site gerado com sucesso!');
      
      // Envia pra edição visual nativa
      const baseRoute = profile.role === 'rural_broker' ? 'rural' : 'urban';
      navigate(`/${baseRoute}/visual-editor`);
      
    } catch (error) {
       console.error("Erro ao gerar site", error);
       alert("Houve um pequeno problema ao finalizar a criação. Tente novamente.");
       setFinishing(false);
    }
  };

  if (loading) {
    return (
       <div className="min-h-screen bg-slate-900 flex items-center justify-center">
         <Loader2 className="animate-spin text-indigo-500" size={48} />
       </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center py-10 px-4 sm:px-6 lg:px-8 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]">
       
       <div className="max-w-5xl w-full bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row min-h-[600px]">
          
          {/* Lado Esquerdo Informativo */}
          <div className="bg-slate-900 text-white md:w-1/3 p-10 flex flex-col items-start relative overflow-hidden">
             <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-indigo-600/20 to-purple-800/40 z-0"/>
             
             <div className="z-10 relative">
               <div className="flex items-center gap-2 mb-10">
                 <Globe className="text-indigo-400" size={28}/>
                 <h1 className="text-2xl font-black tracking-tight">Site Express</h1>
               </div>

               <div className="space-y-8">
                 {[
                   { n: 1, text: 'Identidade & Textos', icon: Sparkles },
                   { n: 2, text: 'O Tema Perfeito', icon: Palette },
                   { n: 3, text: 'A Carga do Acervo', icon: DownloadCloud },
                   { n: 4, text: 'Lançamento!', icon: CheckCircle }
                 ].map((s) => (
                   <div key={s.n} className={`flex items-center gap-4 transition-all duration-300 ${step === s.n ? 'opacity-100 scale-105 ml-2' : step > s.n ? 'opacity-60' : 'opacity-30'}`}>
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${step === s.n ? 'bg-indigo-600 shadow-[0_0_15px_rgba(79,70,229,0.5)]' : step > s.n ? 'bg-green-500 text-slate-900' : 'bg-slate-800'}`}>
                        {step > s.n ? <Check size={18}/> : s.n}
                      </div>
                      <div className="font-semibold text-sm uppercase tracking-wider">{s.text}</div>
                   </div>
                 ))}
               </div>
             </div>
             
             <div className="mt-auto z-10 relative text-slate-400 text-xs">
                A IA vai poupar horas da sua vida. ✨
             </div>
          </div>

          {/* Área Dinâmica Frontal */}
          <div className="md:w-2/3 p-10 bg-white flex flex-col">
            
            {/* --- STEP 1 --- */}
            {step === 1 && (
              <div className="flex-1 animate-fadeIn">
                <h2 className="text-3xl font-black text-slate-800 mb-2">Quem é você online?</h2>
                <p className="text-slate-500 mb-8">Vamos preencher a essência do seu novo site. Use nossa IA para criar algo irresistível se estiver sem criatividade.</p>
                
                <div className="space-y-5">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Título do Site (Hero)</label>
                    <input 
                      type="text" 
                      value={siteData.title}
                      onChange={e => updateData('title', e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 outline-none p-4 rounded-xl text-slate-800 focus:ring-2 ring-indigo-500 transition-shadow"
                      placeholder="Ex: Encontre o imóvel com a melhor..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Subtítulo / Descrição</label>
                    <textarea 
                      value={siteData.description}
                      onChange={e => updateData('description', e.target.value)}
                      rows={4}
                      className="w-full bg-slate-50 border border-slate-200 outline-none p-4 rounded-xl text-slate-800 focus:ring-2 ring-indigo-500 transition-shadow resize-none"
                      placeholder="Mais de 10 anos realizando sonhos na região de SP..."
                    />
                  </div>
                </div>

                <div className="mt-6 p-4 bg-indigo-50 rounded-xl border border-indigo-100 flex items-center justify-between">
                   <div className="text-sm font-medium text-indigo-900 w-2/3">
                     Poupe tempo! Deixe a nossa inteligência entender sua empresa e redigir o marketing por você.
                   </div>
                   <button 
                     onClick={generateCopyWithAI}
                     disabled={aiGenerating}
                     className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-bold flex items-center gap-2 hover:bg-indigo-700 transition"
                   >
                     {aiGenerating ? <Loader2 className="animate-spin" size={16}/> : <Sparkles size={16}/>}
                     Gerar Copy Cativante
                   </button>
                </div>
              </div>
            )}

            {/* --- STEP 2 --- */}
            {step === 2 && (
              <div className="flex-1 animate-fadeIn flex flex-col h-full">
                <h2 className="text-3xl font-black text-slate-800 mb-2">A Roupa do Site</h2>
                <p className="text-slate-500 mb-6">Suba sua Logo (a IA arruma as cores) e escolha o template matador.</p>
                
                {/* Upload Logo Zone */}
                <div className="border-2 border-dashed border-slate-300 rounded-2xl p-6 mb-6 flex items-center gap-6 group hover:border-indigo-400 transition-colors relative">
                   <input type="file" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" onChange={handleLogoUpload} disabled={logoUploading}/>
                   <div className="w-20 h-20 rounded-full bg-indigo-50 flex items-center justify-center flex-shrink-0 group-hover:bg-indigo-100 transition-colors">
                      {logoUploading ? <Loader2 className="animate-spin text-indigo-500"/> : siteData.logoBase64 ? <img src={siteData.logoBase64} className="w-12 h-12 object-contain" /> : <ImageIcon className="text-indigo-400" size={32}/>}
                   </div>
                   <div>
                     <h3 className="font-bold text-slate-800 text-lg">Conectar Identidade Visual</h3>
                     <p className="text-sm text-slate-500">A Inteligência Artificial varre o arquivo e puxa as cores dominantes em HEX.</p>
                   </div>
                </div>

                {/* Cores Extraídas */}
                <div className="flex gap-4 mb-6">
                   <div className="flex-1 p-3 border border-slate-100 rounded-xl flex items-center gap-3 bg-slate-50">
                      <input type="color" value={siteData.primaryColor} onChange={e => updateData('primaryColor', e.target.value)} className="w-10 h-10 p-0 border-0 rounded cursor-pointer" />
                      <div><p className="text-xs text-slate-500 font-bold uppercase">Cor Primária</p><p className="font-mono text-sm">{siteData.primaryColor}</p></div>
                   </div>
                   <div className="flex-1 p-3 border border-slate-100 rounded-xl flex items-center gap-3 bg-slate-50">
                      <input type="color" value={siteData.secondaryColor} onChange={e => updateData('secondaryColor', e.target.value)} className="w-10 h-10 p-0 border-0 rounded cursor-pointer" />
                      <div><p className="text-xs text-slate-500 font-bold uppercase">Cor Secundária</p><p className="font-mono text-sm">{siteData.secondaryColor}</p></div>
                   </div>
                </div>

                {/* Vitrine de Modelos Premium */}
                <div className="flex-1 mt-6">
                   <p className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-1 mb-3">Modelos Premium ({window.location.pathname.includes('/rural') ? 'Rural' : 'Urbano'})</p>
                   <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 overflow-y-auto pr-2 custom-scrollbar pb-6" style={{ maxHeight: 'calc(100vh - 400px)' }}>
                     {LANDING_PAGE_TEMPLATES.filter(t => window.location.pathname.includes('/rural') ? t.category !== 'Urban' : t.category === 'Urban').slice(0, 5).map((t, idx) => (
                       <div 
                         key={t.id} 
                         onClick={() => updateData('selectedTemplateId', t.id)} 
                         className={`relative rounded-2xl cursor-pointer group transition-all duration-300 overflow-hidden ${siteData.selectedTemplateId === t.id ? 'ring-4 ring-indigo-500 shadow-xl scale-[1.02]' : 'border border-slate-200 hover:border-slate-300 hover:shadow-lg'}`}
                       >
                          {/* Preview Fotográfico do Tema */}
                          <div className="h-44 w-full bg-slate-100 relative flex flex-col justify-start overflow-hidden">
                             {/* Fundo imitando imagem realística do template */}
                             <div 
                               className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-110"
                               style={{ 
                                 backgroundImage: `url(${
                                   t.id === 'sonho-rural-premium' ? 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80' :
                                   t.id === 'vida-rural-autentica' ? 'https://images.unsplash.com/photo-1590001155093-a3c66ab0c3ff?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80' :
                                   t.id === 'investimento-garantido' ? 'https://images.unsplash.com/photo-1423483641154-5411ec9c0e0b?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80' :
                                   t.id === 'urban-elegance' ? 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80' :
                                   t.id === 'lar-doce-lar' ? 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80' :
                                   t.id === 'metropole-smart' ? 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80' :
                                   t.id === 'classic-real-estate' ? 'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80' :
                                   t.id === 'modern-minimalist' ? 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80' :
                                   'https://images.unsplash.com/photo-1472214103451-9374bd1c798e?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80' // default
                                 })` 
                               }}
                             />
                             {/* Overlay para escurecer */}
                             <div className="absolute inset-0 bg-black/40 z-0"></div>
                             
                             {/* Miniatura Glassmorphism da "Interface" do site */}
                             <div className="z-10 w-full p-2 flex justify-between items-center bg-white/20 backdrop-blur-md border-b border-white/10">
                                <div className="text-xl filter drop-shadow-lg">{t.thumbnail}</div>
                                <div className="flex gap-2">
                                  <div className="w-4 h-1 rounded bg-white/70"></div>
                                  <div className="w-4 h-1 rounded bg-white/70"></div>
                                  <div className="w-4 h-1 rounded bg-white/70"></div>
                                </div>
                             </div>

                             {/* Simulação de texto Hero na Imagem */}
                             <div className="z-10 flex-1 flex flex-col justify-center items-center p-4">
                                <div className="w-3/4 h-2 rounded bg-white/90 mb-2 shadow-lg"></div>
                                <div className="w-1/2 h-2 rounded bg-white/60 mb-4 shadow-lg"></div>
                                <div className="w-1/3 h-6 rounded border border-white/40 flex items-center justify-center backdrop-blur-md shadow-xl" style={{ backgroundColor: `${t.themeConfig.primaryColor}80` }}>
                                   <div className="w-1/2 h-1 rounded bg-white/80"></div>
                                </div>
                             </div>

                             {siteData.selectedTemplateId === t.id && (
                               <div className="absolute top-2 left-2 w-7 h-7 rounded-full bg-emerald-500 shadow-lg flex items-center justify-center text-white z-20 border-2 border-white">
                                 <Check size={16} strokeWidth={3}/>
                               </div>
                             )}
                          </div>
                          
                          {/* Rodapé do Card */}
                          <div className="p-4 bg-white border-t border-slate-100">
                             <h4 className="font-bold text-slate-800 text-sm mb-1">{t.name}</h4>
                             <p className="text-xs text-slate-500 line-clamp-1">{t.description || t.category}</p>
                             
                             {/* Preview de Cores reais */}
                             <div className="flex items-center gap-1 mt-3">
                               <div className="w-4 h-4 rounded-full border border-slate-200" style={{ backgroundColor: siteData.selectedTemplateId === t.id && siteData.primaryColor !== '#2563eb' ? siteData.primaryColor : t.themeConfig.primaryColor }} />
                               <div className="w-4 h-4 rounded-full border border-slate-200" style={{ backgroundColor: siteData.selectedTemplateId === t.id && siteData.secondaryColor !== '#10b981' ? siteData.secondaryColor : t.themeConfig.secondaryColor }} />
                             </div>
                          </div>
                       </div>
                     ))}
                   </div>
                </div>
              </div>
            )}

            {/* --- STEP 3 --- */}
            {step === 3 && (
              <div className="flex-1 animate-fadeIn">
                <h2 className="text-3xl font-black text-slate-800 mb-2">Preenchendo as prateleiras</h2>
                <p className="text-slate-500 mb-8">Já tem propriedades em outro sistema ou portal? Nós puxamos quase tudo pra você começar com site cheio!</p>
                
                <div className="mb-6">
                   <label className="block text-sm font-bold text-slate-700 mb-2">URL de Origem (do portal externo ou site antigo)</label>
                   <input 
                      type="url" 
                      value={siteData.migrationUrl}
                      onChange={e => updateData('migrationUrl', e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 outline-none p-4 rounded-xl text-slate-800 font-mono focus:ring-2 ring-emerald-500 transition-shadow"
                      placeholder="https://suaimobiliaria.com.br/imoveis"
                    />
                </div>

                <button 
                  onClick={handleStartMigration}
                  disabled={migrating || !siteData.migrationUrl}
                  className={`w-full p-4 rounded-xl font-bold flex items-center justify-center gap-2 transition ${!siteData.migrationUrl ? 'bg-slate-100 text-slate-400' : migrating ? 'bg-emerald-100 text-emerald-600' : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-xl shadow-emerald-200'}`}
                >
                  {migrating ? <Loader2 className="animate-spin"/> : <DownloadCloud />}
                  {migrating ? 'Conectando Robô...' : 'Disparar Importação Automática'}
                </button>

                {migrationLogs.length > 0 && (
                  <div className="mt-6 p-4 bg-slate-900 border border-slate-800 rounded-xl">
                    <p className="text-xs uppercase tracking-widest text-slate-500 font-bold mb-2">Terminal de Execução</p>
                    <div className="space-y-1 font-mono text-xs">
                       {migrationLogs.map((log, i) => (
                         <div key={i} className={`flex items-start gap-2 ${log.includes('❌') ? 'text-red-400' : log.includes('✅') ? 'text-green-400' : 'text-slate-300'}`}>
                           <span className="opacity-50">❯</span> {log}
                         </div>
                       ))}
                    </div>
                  </div>
                )}

                {/* Vitrine de Extração */}
                {siteData.extractedProperties && siteData.extractedProperties.length > 0 && (
                  <div className="mt-8 bg-slate-50 p-6 rounded-2xl border border-slate-200">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-bold text-slate-800">Visualização Extraída ({siteData.extractedProperties.length}):</h4>
                      <button 
                         onClick={async () => {
                           if (!profile?.organization_id) return;
                           try {
                             await fetch('http://localhost:3002/api/import/finalize', {
                               method: 'POST',
                               headers: { 'Content-Type': 'application/json' },
                               body: JSON.stringify({ properties: siteData.extractedProperties, organizationId: profile.organization_id }),
                             });
                             alert('🎉 Todos os ' + siteData.extractedProperties.length + ' imóveis foram importados e salvos no seu banco com sucesso!');
                           } catch (e) { alert('Erro ao salvar no banco'); }
                         }}
                         className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-transform active:scale-95 shadow-lg shadow-indigo-200/50"
                      >
                         <CheckCircle size={16}/> Salvar {siteData.extractedProperties.length} Imóveis Agora
                      </button>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-h-96 overflow-y-auto custom-scrollbar pr-2 pb-4">
                      {siteData.extractedProperties.map((prop: any, idx: number) => (
                        <div key={idx} className="bg-white rounded-2xl overflow-hidden border border-slate-100 shadow-sm flex flex-col">
                          <div className="h-28 bg-slate-200 relative">
                            {prop.images && prop.images[0] ? (
                              <img src={prop.images[0]} alt={prop.title} className="w-full h-full object-cover" />
                            ) : (
                               <div className="w-full h-full flex items-center justify-center text-slate-400">Sem Foto</div>
                            )}
                            <div className="absolute top-2 right-2 bg-black/60 text-white px-2 py-1 rounded-md text-[10px] font-bold">
                              {prop.status}
                            </div>
                          </div>
                          <div className="p-3 flex-1 flex flex-col">
                             <p className="text-xs font-bold text-slate-800 line-clamp-1" title={prop.title}>{prop.title}</p>
                             <p className="text-[10px] text-slate-500 mt-1 mb-2 line-clamp-1">{prop.city} - {prop.state}</p>
                             <p className="text-indigo-600 font-black text-sm mt-auto">
                               {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(prop.price)}
                             </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* BARRA DE NAVEGAÇÃO INFERIOR */}
            {step < 4 && (
               <div className="mt-auto pt-6 flex flex-row-reverse items-center justify-between border-t border-slate-100">
                  <button 
                    onClick={() => {
                      if (step === 2 && !siteData.selectedTemplateId) {
                         alert("Lembre-se de clicar num modelo na lista antes de avançar!"); 
                         return;
                      }
                      setStep(step + 1);
                    }}
                    className="px-6 py-3 bg-slate-900 text-white rounded-xl font-bold flex items-center gap-2 hover:bg-black transition-all hover:scale-105"
                  >
                    {step === 3 ? 'Pular / Continuar' : 'Próxima Etapa'} <ArrowRight size={18}/>
                  </button>
                  {step > 1 && (
                    <button onClick={() => setStep(step - 1)} className="px-6 py-3 text-slate-500 font-bold hover:bg-slate-50 rounded-xl transition-colors">
                      Voltar
                    </button>
                  )}
               </div>
            )}

            {/* --- STEP 4 --- */}
            {step === 4 && (
              <div className="flex-1 animate-fadeIn flex flex-col items-center justify-center text-center">
                <div className="w-24 h-24 bg-gradient-to-tr from-green-400 to-emerald-600 rounded-full flex items-center justify-center shadow-2xl shadow-green-200 mb-8 animate-bounce">
                   <Sparkles size={40} className="text-white"/>
                </div>
                <h2 className="text-4xl font-black text-slate-900 mb-4">Que Rufem os Tambores...</h2>
                <p className="text-slate-500 max-w-md mx-auto mb-10 text-lg leading-relaxed">
                  Tudo parametrizado. Vamos montar cada bloco meticulosamente do seu novo website de alta conversão.
                </p>

                <button 
                  onClick={handlePublish}
                  disabled={finishing}
                  className="px-10 py-5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-lg rounded-2xl font-black flex items-center gap-3 hover:shadow-[0_0_40px_rgba(79,70,229,0.4)] transition-all hover:scale-105"
                >
                  {finishing ? <Loader2 className="animate-spin"/> : <Globe size={24}/>}
                  {finishing ? 'Publicando...' : 'LANÇAR SITE AGORA!'}
                </button>
              </div>
            )}
            
          </div>
       </div>

    </div>
  );
};

export default SiteSetupWizard;
