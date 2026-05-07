import React, { useState } from 'react';
import {
  ChevronRight,
  Shield,
  Zap,
  Layout,
  MessageSquare,
  BarChart3,
  Globe,
  Database,
  Cpu,
  CheckCircle2,
  Calendar,
  ArrowRight,
  Play,
  Users,
  Building2,
  Tractor,
} from 'lucide-react';
import { leadService } from '../services/leads';
import { toast } from 'sonner';

const SystemSalesPage: React.FC = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    interest: 'Consultoria de Implementação',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await leadService.create({
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        source: 'Página de Vendas - Consultoria',
        notes: `Empresa: ${formData.company} | Interesse: ${formData.interest}`,
      } as any);
      toast.success('Solicitação enviada com sucesso! Entraremos em contato em breve.');
      setFormData({ name: '', email: '', phone: '', company: '', interest: 'Consultoria de Implementação' });
    } catch (error) {
      toast.error('Erro ao enviar solicitação. Tente novamente ou use o WhatsApp.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 selection:bg-indigo-500/30 font-sans">
      {/* Glow Effects */}
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600/20 blur-[120px] rounded-full animate-pulse"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-violet-600/10 blur-[120px] rounded-full"></div>
      </div>

      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 border-b border-white/5 bg-[#020617]/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <span className="text-white font-black text-xl italic">I</span>
            </div>
            <span className="text-2xl font-black tracking-tighter text-white">IMOBZY</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-400">
            <a href="#features" className="hover:text-white transition-colors">Funcionalidades</a>
            <a href="#specialization" className="hover:text-white transition-colors">Especialização</a>
            <a href="#consulting" className="hover:text-white transition-colors">Consultoria</a>
          </div>
          <button 
            onClick={() => document.getElementById('consulting')?.scrollIntoView({ behavior: 'smooth' })}
            className="px-6 py-2.5 rounded-full bg-white text-black font-bold text-sm hover:bg-slate-200 transition-all shadow-lg shadow-white/5"
          >
            Agendar Agora
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-40 pb-20 px-6 overflow-hidden">
        <div className="max-w-7xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-bold uppercase tracking-widest mb-8">
            <Zap size={14} />
            Ecosystem v4.0 Active
          </div>
          <h1 className="text-6xl md:text-8xl font-black text-white mb-8 tracking-tighter leading-[0.9] uppercase italic">
            A Nova Era da <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-violet-400 to-cyan-400">
              Gestão Imobiliária
            </span>
          </h1>
          <p className="text-xl text-slate-400 max-w-3xl mx-auto mb-12 leading-relaxed">
            O primeiro sistema imobiliário que integra Inteligência Artificial Generativa, CRM de alta performance e sites ultra-personalizáveis em uma única plataforma white-label.
          </p>
          <div className="flex flex-col md:flex-row items-center justify-center gap-6">
            <button 
              onClick={() => document.getElementById('consulting')?.scrollIntoView({ behavior: 'smooth' })}
              className="group px-10 py-5 rounded-2xl bg-indigo-600 text-white font-black uppercase tracking-widest hover:bg-indigo-500 transition-all shadow-xl shadow-indigo-600/20 flex items-center gap-3"
            >
              Agendar Consultoria de Implementação
              <ArrowRight className="group-hover:translate-x-1 transition-transform" />
            </button>
            <button className="px-10 py-5 rounded-2xl bg-white/5 border border-white/10 text-white font-black uppercase tracking-widest hover:bg-white/10 transition-all flex items-center gap-3">
              <Play size={18} className="fill-white" />
              Ver Demo
            </button>
          </div>

          {/* Mockup Preview */}
          <div className="mt-24 relative max-w-5xl mx-auto">
            <div className="absolute inset-0 bg-indigo-500/20 blur-[100px] rounded-full scale-90 opacity-50"></div>
            <div className="relative bg-slate-900 rounded-3xl border border-white/10 p-4 shadow-2xl">
              <img 
                src="https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1200&q=80" 
                alt="Dashboard Preview" 
                className="rounded-2xl w-full border border-white/5"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-20 border-y border-white/5 bg-white/[0.02]">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-12">
          {[
            { label: 'Transações Anuais', value: 'R$ 2Bi+' },
            { label: 'Corretores Ativos', value: '1.5k+' },
            { label: 'Imóveis Rural/Urbano', value: '50k+' },
            { label: 'ROI Médio', value: '310%' },
          ].map((stat, i) => (
            <div key={i} className="text-center">
              <div className="text-4xl font-black text-white mb-2">{stat.value}</div>
              <div className="text-xs font-bold uppercase tracking-widest text-slate-500">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-32 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-24">
            <h2 className="text-4xl md:text-5xl font-black text-white mb-6 uppercase italic tracking-tighter">
              Tecnologia de Ponta para <br />
              <span className="text-indigo-500">Resultados Exponenciais</span>
            </h2>
            <div className="w-24 h-1.5 bg-indigo-500 mx-auto rounded-full"></div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: <Cpu size={32} />,
                title: 'IA Generativa',
                desc: 'Análise automática de propriedades, criação de descrições persuasivas e chatbot inteligente para leads.',
                color: 'text-indigo-400'
              },
              {
                icon: <Layout size={32} />,
                title: 'Editor Visual',
                desc: 'Crie Landing Pages e Sites ultra-rápidos sem tocar em uma linha de código. Totalmente white-label.',
                color: 'text-violet-400'
              },
              {
                icon: <Database size={32} />,
                title: 'CRM 360º',
                desc: 'Gestão completa de leads, funil de vendas, Kanban personalizado e automação de contratos.',
                color: 'text-cyan-400'
              },
              {
                icon: <MessageSquare size={32} />,
                title: 'WhatsApp Automation',
                desc: 'Integração direta com WhatsApp para disparos automáticos e gestão de conversas centralizada.',
                color: 'text-emerald-400'
              },
              {
                icon: <BarChart3 size={32} />,
                title: 'BI & Analytics',
                desc: 'Dashboards completos para visão rural e urbana, com métricas de performance em tempo real.',
                color: 'text-amber-400'
              },
              {
                icon: <Globe size={32} />,
                title: 'Multi-Tenancy',
                desc: 'Gerencie múltiplas unidades ou marcas dentro da mesma plataforma com domínios customizados.',
                color: 'text-rose-400'
              }
            ].map((feat, i) => (
              <div key={i} className="group p-8 rounded-3xl bg-white/5 border border-white/10 hover:bg-white/[0.08] transition-all hover:border-indigo-500/50">
                <div className={`${feat.color} mb-6 transform group-hover:scale-110 transition-transform`}>
                  {feat.icon}
                </div>
                <h3 className="text-xl font-bold text-white mb-4 uppercase">{feat.title}</h3>
                <p className="text-slate-400 leading-relaxed">{feat.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Specialization Section */}
      <section id="specialization" className="py-32 px-6 bg-indigo-600/5 overflow-hidden">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
          <div className="relative">
            <div className="absolute -top-20 -left-20 w-64 h-64 bg-indigo-600/20 blur-[100px] rounded-full"></div>
            <h2 className="text-5xl font-black text-white mb-10 leading-[0.9] uppercase italic tracking-tighter">
              Especialista em <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-violet-400">
                Imóveis Rurais e Urbanos
              </span>
            </h2>
            <div className="space-y-8">
              <div className="flex gap-6">
                <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shrink-0">
                  <Tractor className="text-indigo-400" />
                </div>
                <div>
                  <h4 className="text-lg font-bold text-white mb-2 uppercase">Ecossistema Rural</h4>
                  <p className="text-slate-400">Dossiês inteligentes, geointeligência, Due Diligence automatizada e BI rural especializado em hectares e aptidões.</p>
                </div>
              </div>
              <div className="flex gap-6">
                <div className="w-16 h-16 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center shrink-0">
                  <Building2 className="text-violet-400" />
                </div>
                <div>
                  <h4 className="text-lg font-bold text-white mb-2 uppercase">Foco Urbano High-End</h4>
                  <p className="text-slate-400">Gestão de lançamentos, loteamentos, contratos complexos e integração com grandes portais imobiliários.</p>
                </div>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <img src="https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=400&q=80" alt="Rural" className="rounded-2xl border border-white/10 mt-8" />
            <img src="https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=400&q=80" alt="Urban" className="rounded-2xl border border-white/10" />
          </div>
        </div>
      </section>

      {/* Consulting Section */}
      <section id="consulting" className="py-32 px-6 relative">
        <div className="max-w-7xl mx-auto">
          <div className="bg-gradient-to-br from-indigo-900/40 to-violet-900/40 border border-white/10 rounded-[3rem] p-8 md:p-16 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-1/2 h-full bg-indigo-500/10 blur-[120px] rounded-full translate-x-1/2"></div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 relative z-10">
              <div>
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-white text-xs font-bold uppercase tracking-widest mb-8">
                  <Calendar size={14} className="text-indigo-400" />
                  Implementation Consulting
                </div>
                <h2 className="text-5xl font-black text-white mb-8 leading-[0.9] uppercase italic tracking-tighter">
                  Sua Jornada de <br />
                  <span className="text-indigo-400">Implementação Guiada</span>
                </h2>
                <p className="text-lg text-slate-300 mb-10 leading-relaxed">
                  Não apenas um software, mas uma transformação digital completa. Nossa consultoria de implementação garante que você extraia 100% do poder do IMOBZY desde o primeiro dia.
                </p>
                
                <ul className="space-y-4 mb-10">
                  {[
                    'Migração assistida de dados do sistema antigo',
                    'Configuração White-Label e Domínios Customizados',
                    'Treinamento de Equipe em CRM e IA',
                    'Setup de Automações de WhatsApp e Contratos',
                    'Consultoria Estratégica de Marketing Digital'
                  ].map((item, i) => (
                    <li key={i} className="flex items-center gap-3 text-slate-300">
                      <CheckCircle2 size={18} className="text-indigo-400" />
                      {item}
                    </li>
                  ))}
                </ul>

                <div className="flex items-center gap-6">
                  <div className="flex -space-x-4">
                    {[1,2,3,4].map(i => (
                      <div key={i} className="w-12 h-12 rounded-full border-2 border-[#020617] bg-slate-800 flex items-center justify-center overflow-hidden">
                        <img src={`https://i.pravatar.cc/100?img=${i+10}`} alt="Expert" />
                      </div>
                    ))}
                  </div>
                  <div>
                    <div className="text-white font-bold text-lg">+150 Imobiliárias</div>
                    <div className="text-slate-500 text-sm">Implementadas com sucesso este ano</div>
                  </div>
                </div>
              </div>

              <div className="bg-[#020617]/50 backdrop-blur-xl border border-white/10 rounded-3xl p-8 md:p-10">
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-3">Nome</label>
                      <input 
                        type="text" 
                        required
                        value={formData.name}
                        onChange={e => setFormData({...formData, name: e.target.value})}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-5 py-4 text-white focus:outline-none focus:border-indigo-500 transition-all"
                        placeholder="Ex: João Silva"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-3">Empresa</label>
                      <input 
                        type="text" 
                        required
                        value={formData.company}
                        onChange={e => setFormData({...formData, company: e.target.value})}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-5 py-4 text-white focus:outline-none focus:border-indigo-500 transition-all"
                        placeholder="Nome da Imobiliária"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-3">Email Corporativo</label>
                    <input 
                      type="email" 
                      required
                      value={formData.email}
                      onChange={e => setFormData({...formData, email: e.target.value})}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-5 py-4 text-white focus:outline-none focus:border-indigo-500 transition-all"
                      placeholder="seu@email.com"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-3">WhatsApp</label>
                    <input 
                      type="tel" 
                      required
                      value={formData.phone}
                      onChange={e => setFormData({...formData, phone: e.target.value})}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-5 py-4 text-white focus:outline-none focus:border-indigo-500 transition-all"
                      placeholder="(00) 00000-0000"
                    />
                  </div>
                  <button 
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-5 rounded-xl bg-indigo-600 text-white font-black uppercase tracking-widest hover:bg-indigo-500 disabled:bg-indigo-600/50 transition-all shadow-xl shadow-indigo-600/20 flex items-center justify-center gap-3"
                  >
                    {isSubmitting ? 'Enviando...' : 'Solicitar Consultoria'}
                    {!isSubmitting && <ArrowRight size={20} />}
                  </button>
                  <p className="text-[10px] text-center text-slate-500 uppercase tracking-widest">
                    Ao enviar, você concorda com nossos termos de privacidade.
                  </p>
                </form>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-20 border-t border-white/5 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-10">
          <div>
            <div className="flex items-center gap-2 mb-6">
              <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-black italic">I</span>
              </div>
              <span className="text-xl font-black tracking-tighter text-white">IMOBZY</span>
            </div>
            <p className="text-slate-500 text-sm max-w-sm">
              The next generation of real estate management. Built for high performance teams in rural and urban markets.
            </p>
          </div>
          <div className="flex items-center gap-8">
            <a href="#" className="text-slate-400 hover:text-white transition-colors text-sm font-medium">Privacidade</a>
            <a href="#" className="text-slate-400 hover:text-white transition-colors text-sm font-medium">Termos</a>
            <a href="#" className="text-slate-400 hover:text-white transition-colors text-sm font-medium">Suporte</a>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 border border-white/10">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
              <span className="text-xs font-bold uppercase tracking-widest text-slate-300">Sistemas Online</span>
            </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto mt-20 pt-10 border-t border-white/5 text-center text-slate-600 text-xs uppercase tracking-[0.3em]">
          © 2026 IMOBZY Ecosystem • All Rights Reserved
        </div>
      </footer>
    </div>
  );
};

export default SystemSalesPage;
