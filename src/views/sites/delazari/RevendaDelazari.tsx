import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Menu, X, CheckCircle2, ArrowRight, Home, Users, MessageSquare, 
  FileText, TrendingUp, Key, BarChart3, Smartphone, Clock, Building, Instagram
} from 'lucide-react';

const INOVE_URL = "https://inovebrokers.com.br/";

export default function RevendaDelazari() {
  return (
    <div className="min-h-screen bg-white font-sans text-slate-900 overflow-x-hidden selection:bg-blue-100 selection:text-blue-900">
      <Navbar />
      <main>
        <HeroSection />
        <SocialProof />
        <FeaturesGrid />
        <DataAutomations />
        <PipelineSection />
        <MetricsSection />
        <Testimonials />
        <PricingSection />
        <ContactSection />
      </main>
      <Footer />
    </div>
  );
}

function Navbar() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100">
      <div className="container mx-auto px-4 h-20 flex items-center justify-between max-w-7xl">
        <a href={INOVE_URL} className="flex items-center gap-2 z-50 relative">
          {/* Logo mock for Delazari / Inove */}
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-xl leading-none">D</span>
          </div>
          <span className="font-bold text-xl tracking-tight text-slate-800">DELAZARI<span className="text-blue-600 text-sm align-top ml-1">IMÓVEIS</span></span>
        </a>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-8">
          <a href="#solucoes" className="text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors">Soluções</a>
          <a href="#recursos" className="text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors">Recursos</a>
          <a href="#planos" className="text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors">Planos</a>
          <a href="#clientes" className="text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors">Clientes</a>
        </nav>

        <div className="hidden md:flex items-center gap-4">
          <a href={INOVE_URL} className="text-sm font-medium text-slate-700 hover:text-slate-900">Entrar no painel</a>
          <a href={INOVE_URL} className="px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-full hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20">
            Agendar demonstração
          </a>
        </div>

        {/* Mobile Toggle */}
        <button className="md:hidden z-50 relative p-2" onClick={() => setIsOpen(!isOpen)}>
          {isOpen ? <X size={24} className="text-slate-900"/> : <Menu size={24} className="text-slate-900"/>}
        </button>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed inset-0 z-40 bg-white pt-24 px-4 flex flex-col gap-6"
        >
          <a href="#solucoes" onClick={() => setIsOpen(false)} className="text-xl font-semibold border-b border-slate-100 pb-4">Soluções</a>
          <a href="#recursos" onClick={() => setIsOpen(false)} className="text-xl font-semibold border-b border-slate-100 pb-4">Recursos</a>
          <a href="#planos" onClick={() => setIsOpen(false)} className="text-xl font-semibold border-b border-slate-100 pb-4">Planos</a>
          <div className="mt-auto pb-8 flex flex-col gap-4">
            <a href={INOVE_URL} className="w-full py-4 text-center border border-slate-200 rounded-xl font-medium">Entrar no painel</a>
            <a href={INOVE_URL} className="w-full py-4 text-center bg-blue-600 text-white rounded-xl font-medium">Agendar demonstração</a>
          </div>
        </motion.div>
      )}
    </header>
  );
}

function HeroSection() {
  return (
    <section className="relative pt-32 pb-20 lg:pt-40 lg:pb-28 overflow-hidden">
      {/* Background blobs */}
      <div className="absolute top-0 right-0 -mr-20 -mt-20 w-[600px] h-[600px] bg-blue-50 rounded-full blur-3xl opacity-60 z-0"></div>
      <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-[400px] h-[400px] bg-blue-50/50 rounded-full blur-3xl opacity-60 z-0"></div>
      
      <div className="container mx-auto px-4 max-w-7xl relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">
          
          {/* Text Content */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="max-w-2xl"
          >
            <p className="text-blue-600 font-semibold tracking-wider text-sm mb-4 uppercase">A NOVA ERA DA GESTÃO IMOBILIÁRIA</p>
            <h1 className="text-5xl lg:text-6xl font-extrabold text-[#0B1A40] leading-[1.1] mb-6">
              O sistema imobiliário 360º para quem <span className="text-blue-600">quer crescer.</span>
            </h1>
            <p className="text-lg text-slate-600 mb-8 leading-relaxed">
              CRM, imóveis, leads, atendimento, contratos, locação, marketing e inteligência artificial em uma única plataforma.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 mb-12">
              <a href={INOVE_URL} className="px-8 py-4 bg-blue-600 text-white text-center font-medium rounded-full hover:bg-blue-700 transition-all shadow-xl shadow-blue-600/20 flex items-center justify-center gap-2">
                Agendar demonstração <ArrowRight size={18} />
              </a>
              <a href="#recursos" className="px-8 py-4 bg-white text-slate-700 border border-slate-200 text-center font-medium rounded-full hover:bg-slate-50 transition-all">
                Conhecer recursos
              </a>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={20} className="text-blue-500 flex-shrink-0" />
                <span className="text-sm text-slate-600 font-medium">Plataforma completa<br/>100% integrada</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 size={20} className="text-blue-500 flex-shrink-0" />
                <span className="text-sm text-slate-600 font-medium">Segurança e<br/>conformidade total</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 size={20} className="text-blue-500 flex-shrink-0" />
                <span className="text-sm text-slate-600 font-medium">Suporte humano<br/>especializado</span>
              </div>
            </div>
          </motion.div>

          {/* Image/Mockup */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="relative"
          >
            <div className="relative rounded-2xl shadow-2xl overflow-hidden border border-slate-200/50 bg-[#0B1A40]">
              {/* Fake UI Header */}
              <div className="h-12 border-b border-white/10 flex items-center px-4 gap-2">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                </div>
                <div className="ml-4 font-semibold text-white text-sm flex items-center gap-2">
                   <div className="w-5 h-5 bg-blue-600 rounded flex items-center justify-center text-[10px]">IN</div>
                   INOVE
                </div>
              </div>
              {/* Fake UI Body */}
              <div className="p-6 grid grid-cols-12 gap-6 h-[400px]">
                {/* Sidebar */}
                <div className="col-span-3 space-y-4">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className={`h-8 rounded-md flex items-center px-3 ${i===0 ? 'bg-blue-600 text-white' : 'text-slate-400'}`}>
                      <div className="w-4 h-4 rounded bg-current opacity-70 mr-3"></div>
                      <div className={`h-2 rounded ${i===0 ? 'bg-white/80 w-16' : 'bg-slate-600 w-20'}`}></div>
                    </div>
                  ))}
                </div>
                {/* Main */}
                <div className="col-span-9 space-y-6">
                  <div className="flex justify-between items-end">
                    <div>
                      <h3 className="text-white font-semibold text-lg">Dashboard</h3>
                      <p className="text-slate-400 text-xs">Visão geral da sua imobiliária</p>
                    </div>
                    <div className="px-3 py-1.5 bg-white/10 rounded border border-white/10 text-white text-xs">
                      Últimos 30 dias
                    </div>
                  </div>
                  {/* KPI Cards */}
                  <div className="grid grid-cols-4 gap-4">
                    {[1240, 532, 1032, 287].map((num, i) => (
                      <div key={i} className="bg-white/5 rounded-lg p-4 border border-white/5">
                        <div className="text-slate-400 text-[10px] mb-1">Métrica {i+1}</div>
                        <div className="text-white text-xl font-bold">{num}</div>
                      </div>
                    ))}
                  </div>
                  {/* Chart Area */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white/5 rounded-lg p-4 border border-white/5 h-32 flex flex-col justify-between">
                       <div className="text-slate-400 text-xs mb-2">Funil de vendas</div>
                       <div className="space-y-2">
                         <div className="h-2 bg-blue-600 rounded w-full"></div>
                         <div className="h-2 bg-blue-500 rounded w-4/5"></div>
                         <div className="h-2 bg-blue-400 rounded w-3/5"></div>
                         <div className="h-2 bg-blue-300 rounded w-2/5"></div>
                       </div>
                    </div>
                    <div className="bg-white/5 rounded-lg p-4 border border-white/5 h-32 flex items-center justify-center">
                       <div className="w-20 h-20 rounded-full border-4 border-blue-600 border-t-blue-400 border-r-blue-300"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Floating badges */}
            <div className="absolute -bottom-6 -left-6 bg-white p-4 rounded-xl shadow-xl border border-slate-100 flex items-center gap-4 animate-bounce" style={{animationDuration: '3s'}}>
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center text-green-600">
                <TrendingUp size={24} />
              </div>
              <div>
                <div className="text-sm text-slate-500">Conversão</div>
                <div className="text-xl font-bold text-slate-800">em tempo real</div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

function SocialProof() {
  return (
    <section className="py-12 border-y border-slate-100 bg-white">
      <div className="container mx-auto px-4 max-w-7xl text-center">
        <p className="text-sm font-semibold tracking-wider text-slate-400 uppercase mb-8">Tecnologia para imobiliárias de todos os portes</p>
        <div className="flex flex-wrap justify-center items-center gap-12 md:gap-24 opacity-60 grayscale hover:grayscale-0 transition-all duration-500">
          <div className="font-bold text-xl flex items-center gap-2"><div className="w-6 h-6 bg-current rounded-full"></div> SOLARIS</div>
          <div className="font-bold text-xl flex items-center gap-2"><div className="w-6 h-6 bg-current rounded-sm"></div> LUMINA</div>
          <div className="font-bold text-xl flex items-center gap-2"><div className="w-6 h-6 bg-current rotate-45"></div> NOVIA</div>
          <div className="font-bold text-xl flex items-center gap-2"><div className="w-6 h-6 border-[3px] border-current rounded-full"></div> VERDEMAR</div>
          <div className="font-bold text-xl flex items-center gap-2"><div className="w-6 h-6 bg-current rounded-tl-xl rounded-br-xl"></div> PRIME</div>
        </div>
      </div>
    </section>
  );
}

function FeaturesGrid() {
  const features = [
    { icon: <Home size={24} />, title: "Gestão de imóveis", desc: "Cadastro completo, fotos, características, valores e disponibilidade em tempo real." },
    { icon: <Users size={24} />, title: "CRM e funil de leads", desc: "Organize leads, acompanhe o funil de vendas e aumente suas conversões." },
    { icon: <MessageSquare size={24} />, title: "Atendimento omnichannel", desc: "Centralize WhatsApp, e-mail, chat e ligações em um único lugar." },
    { icon: <FileText size={24} />, title: "Contratos e documentos", desc: "Crie, envie, assine e armazene contratos com segurança e validade jurídica." },
    { icon: <TrendingUp size={24} />, title: "Marketing imobiliário", desc: "Campanhas, landing pages, disparo de e-mails e gestão de anúncios integrada." },
    { icon: <Key size={24} />, title: "Locação simplificada", desc: "Controle de locações, vistorias, reajustes, renovações e boletos em poucos cliques." },
    { icon: <BarChart3 size={24} />, title: "Relatórios inteligentes", desc: "Dashboards completos para tomar decisões com base em dados reais." },
    { icon: <Smartphone size={24} />, title: "Aplicativo mobile", desc: "Acesse tudo de onde estiver e mantenha sua equipe sempre conectada." },
  ];

  return (
    <section id="recursos" className="py-24 bg-slate-50">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <p className="text-blue-600 font-semibold tracking-wider text-sm mb-4 uppercase">SOLUÇÕES COMPLETAS</p>
          <h2 className="text-3xl md:text-4xl font-bold text-[#0B1A40]">Tudo o que sua imobiliária precisa em um só lugar.</h2>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feat, i) => (
            <motion.div 
              key={i}
              whileHover={{ y: -5 }}
              className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 hover:shadow-xl hover:border-blue-100 transition-all"
            >
              <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mb-6">
                {feat.icon}
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-3">{feat.title}</h3>
              <p className="text-slate-600 text-sm leading-relaxed">{feat.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function DataAutomations() {
  return (
    <section className="py-24 bg-[#0B1A40] text-white overflow-hidden relative">
      {/* Decorative lines */}
      <div className="absolute inset-0 opacity-10" style={{backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '40px 40px'}}></div>
      
      <div className="container mx-auto px-4 max-w-7xl relative z-10">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <div>
            <p className="text-blue-400 font-semibold tracking-wider text-sm mb-4 uppercase">TECNOLOGIA E AUTOMAÇÃO</p>
            <h2 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">
              Inteligência que transforma <span className="text-blue-400">dados</span> em negócios.
            </h2>
            <p className="text-slate-300 text-lg mb-8 leading-relaxed">
              Utilizamos automações e inteligência artificial para otimizar seu tempo, aumentar a produtividade do time e melhorar a experiência do cliente.
            </p>
            
            <ul className="space-y-4">
              {["Automação de tarefas e follow-ups", "Score inteligente de leads", "Sugestões automáticas de imóveis", "Integração com os principais portais"].map((item, i) => (
                <li key={i} className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400">
                    <CheckCircle2 size={16} />
                  </div>
                  <span className="text-slate-200">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="relative">
            {/* Main Card (Apartment) */}
            <div className="bg-slate-800 rounded-2xl overflow-hidden shadow-2xl border border-slate-700 relative z-10 aspect-video lg:aspect-square max-h-[400px]">
              <img 
                src="https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80" 
                alt="Mansão" 
                className="w-full h-full object-cover opacity-80 mix-blend-overlay"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0B1A40] via-transparent to-transparent"></div>
              
              <div className="absolute bottom-6 left-6 right-6">
                <div className="uppercase tracking-widest text-xs font-bold text-white mb-2">APARTAMENTO</div>
                <h3 className="text-3xl font-light text-white mb-1">SEU IMÓVEL</h3>
                <p className="text-slate-300 text-sm mb-4">EXEMPLO DE VITRINE</p>
                <div className="flex gap-2 mb-4">
                   <span className="text-xs px-2 py-1 bg-white/20 rounded backdrop-blur text-white">90m²</span>
                   <span className="text-xs px-2 py-1 bg-white/20 rounded backdrop-blur text-white">2 vagas</span>
                   <span className="text-xs px-2 py-1 bg-white/20 rounded backdrop-blur text-white">Lazer completo</span>
                </div>
                <button className="px-4 py-2 bg-white text-[#0B1A40] text-sm font-semibold rounded hover:bg-slate-100 transition">
                  Ver detalhes
                </button>
              </div>
            </div>

            {/* Floating Score Card */}
            <motion.div 
              initial={{ y: 20, opacity: 0 }}
              whileInView={{ y: 0, opacity: 1 }}
              viewport={{ once: true }}
              className="absolute -right-8 top-12 bg-[#0B1A40] p-6 rounded-2xl border border-blue-500/30 shadow-2xl shadow-blue-900/50 z-20 w-64"
            >
              <div className="text-center">
                <p className="text-xs font-semibold tracking-wider text-slate-400 mb-4 uppercase">SCORE DO LEAD</p>
                <div className="w-32 h-32 mx-auto relative flex items-center justify-center">
                  <svg className="absolute inset-0 w-full h-full transform -rotate-90">
                    <circle cx="64" cy="64" r="60" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="6" />
                    <circle cx="64" cy="64" r="60" fill="none" stroke="#3b82f6" strokeWidth="6" strokeDasharray="377" strokeDashoffset="75" strokeLinecap="round" />
                  </svg>
                  <div className="text-center">
                    <span className="text-4xl font-bold text-white">92</span>
                    <p className="text-[10px] text-blue-400 font-medium uppercase tracking-widest mt-1">MUITO QUENTE</p>
                  </div>
                </div>
                <p className="text-xs text-slate-400 mt-6 pt-4 border-t border-white/10">
                  Alta probabilidade de fechamento
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}

function PipelineSection() {
  const columns = [
    { title: "Novo lead", count: "Exemplo", color: "bg-slate-100" },
    { title: "Em atendimento", count: "Exemplo", color: "bg-blue-50" },
    { title: "Visita agendada", count: "Exemplo", color: "bg-amber-50" },
    { title: "Proposta", count: "Exemplo", color: "bg-purple-50" },
    { title: "Fechado", count: "Exemplo", color: "bg-green-50" },
  ];

  return (
    <section className="py-24 bg-white overflow-x-hidden">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <p className="text-blue-600 font-semibold tracking-wider text-sm mb-4 uppercase">FUNIL DE VENDAS VISUAL E EFICIENTE</p>
          <h2 className="text-3xl md:text-4xl font-bold text-[#0B1A40]">Acompanhe cada etapa do seu funil em tempo real.</h2>
        </div>

        {/* Fake Kanban Board */}
        <div className="flex gap-4 overflow-x-auto pb-8 hide-scrollbar">
          {columns.map((col, i) => (
            <div key={i} className={`flex-1 min-w-[280px] rounded-xl p-4 ${col.color} border border-slate-100`}>
              <div className="flex justify-between items-center mb-4">
                <h4 className="font-semibold text-slate-800 text-sm">{col.title}</h4>
                <span className="text-xs font-medium text-slate-500 bg-white px-2 py-1 rounded shadow-sm">{col.count}</span>
              </div>
              
              <div className="space-y-3">
                {[1, 2, 3].map(card => (
                  <div key={card} className="bg-white p-3 rounded-lg shadow-sm border border-slate-100 cursor-grab active:cursor-grabbing hover:border-blue-300 transition-colors">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-8 h-8 rounded-full bg-slate-200 flex-shrink-0 overflow-hidden">
                        <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${col.title}${card}`} alt="avatar ilustrativo" />
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-slate-800">Lead exemplo</div>
                        <div className="text-[10px] text-slate-500 flex items-center gap-1"><Smartphone size={10}/> WhatsApp</div>
                      </div>
                    </div>
                    <div className="text-xs text-slate-600 bg-slate-50 p-2 rounded truncate">
                      Interesse em um imóvel da sua vitrine
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <p className="text-center text-[11px] text-slate-400 mt-6">
          Exemplo ilustrativo do funil do produto — os dados exibidos não são reais.
        </p>

        {/* Bottom Metrics Bar */}
        <div className="mt-8 flex flex-wrap gap-4 justify-between bg-white border border-slate-200 rounded-2xl p-6 shadow-xl shadow-slate-100">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center"><CheckCircle2 size={20} /></div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Conversão acompanhada</p>
              <p className="text-xl font-bold text-slate-800">em cada etapa</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center"><Clock size={20} /></div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Atendimento centralizado</p>
              <p className="text-xl font-bold text-slate-800">WhatsApp, e-mail e chat</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center"><Users size={20} /></div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Gestão de negociações</p>
              <p className="text-xl font-bold text-slate-800">funil completo</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center"><TrendingUp size={20} /></div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Relatórios financeiros</p>
              <p className="text-xl font-bold text-green-600">dados em tempo real</p>
            </div>
          </div>
        </div>
        <p className="text-center text-[11px] text-slate-400 mt-4">
          Interface ilustrativa do produto. Resultados dependem da operação de cada imobiliária.
        </p>
      </div>
    </section>
  );
}

function MetricsSection() {
  return (
    <section className="py-24 bg-slate-50">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <p className="text-blue-600 font-semibold tracking-wider text-sm mb-4 uppercase">RESULTADOS QUE IMPULSIONAM</p>
          <h2 className="text-3xl md:text-4xl font-bold text-[#0B1A40]">Mais eficiência, mais resultados, mais crescimento.</h2>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between h-full">
            <div>
              <h3 className="text-4xl font-bold text-blue-600 mb-2">+40%</h3>
              <p className="text-lg font-semibold text-slate-800 mb-4">mais produtividade</p>
              <p className="text-slate-500 text-sm">da média das imobiliárias que usam nossa plataforma.</p>
            </div>
            <div className="mt-8 flex items-end gap-2 h-16">
              {[30, 45, 60, 80, 100].map((h, i) => (
                <div key={i} className="w-8 bg-blue-100 rounded-t-sm relative group">
                  <div className="absolute bottom-0 w-full bg-blue-500 rounded-t-sm transition-all duration-1000 ease-out" style={{height: `${h}%`}}></div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between h-full">
            <div>
              <h3 className="text-4xl font-bold text-blue-600 mb-2">-35%</h3>
              <p className="text-lg font-semibold text-slate-800 mb-4">no tempo de resposta</p>
              <p className="text-slate-500 text-sm">para leads qualificados com atendimento centralizado.</p>
            </div>
            <div className="mt-8 flex justify-center text-blue-500">
               <Clock size={64} strokeWidth={1} />
            </div>
          </div>

          <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between h-full">
            <div>
              <h3 className="text-xl font-semibold text-slate-800 mb-2">Visão completa<br/>da operação</h3>
              <p className="text-slate-500 text-sm mt-4">Dashboards e relatórios para decisões estratégicas.</p>
            </div>
            <div className="mt-8 flex justify-center text-blue-500">
               <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                 <path d="M21.21 15.89A10 10 0 1 1 8 2.83" />
                 <path d="M22 12A10 10 0 0 0 12 2v10z" />
               </svg>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Testimonials() {
  const testimonials = [
    { text: "A plataforma transformou nossa rotina. Centralizamos tudo, respondemos mais rápido e aumentamos nossas vendas em 30%.", name: "Patrícia Alencar", role: "Diretora Comercial", company: "Lumina Imobiliária" },
    { text: "A automação e o funil de leads nos deram clareza do processo e mais previsibilidade no fechamento dos negócios.", name: "Ricardo Melo", role: "Gerente de Vendas", company: "Prime Imobiliária" },
    { text: "Relatórios inteligentes e atendimento integrado nos ajudam a tomar decisões melhores todos os dias.", name: "Juliana Ribeiro", role: "Sócia Proprietária", company: "Horizon Imóveis" },
  ];

  return (
    <section id="clientes" className="py-24 bg-white border-b border-slate-100">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <p className="text-blue-600 font-semibold tracking-wider text-sm mb-4 uppercase">HISTÓRIAS DE QUEM CRESCE COM A GENTE</p>
          <h2 className="text-3xl md:text-4xl font-bold text-[#0B1A40]">Histórias de quem cresce com a gente.</h2>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {testimonials.map((test, i) => (
            <div key={i} className="bg-slate-50 p-8 rounded-2xl border border-slate-100 relative">
              <div className="text-blue-500 mb-6">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
                </svg>
              </div>
              <p className="text-slate-700 italic mb-8 leading-relaxed">"{test.text}"</p>
              <div className="flex items-center gap-4 mt-auto">
                <div className="w-12 h-12 rounded-full bg-slate-300 overflow-hidden">
                  <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${test.name}`} alt={test.name} className="w-full h-full object-cover" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-800 text-sm">{test.name}</h4>
                  <p className="text-xs text-slate-500">{test.role}</p>
                  <p className="text-[10px] text-blue-600 font-semibold uppercase">{test.company}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function PricingSection() {
  return (
    <section id="planos" className="py-24 bg-slate-50">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <p className="text-blue-600 font-semibold tracking-wider text-sm mb-4 uppercase">PLANOS FLEXÍVEIS PARA SUA IMOBILIÁRIA</p>
          <h2 className="text-3xl md:text-4xl font-bold text-[#0B1A40]">Encontre o plano ideal para o seu negócio.</h2>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto items-center">
          {/* Plan 1 */}
          <div className="bg-white p-8 rounded-2xl border border-slate-200">
            <h3 className="text-2xl font-bold text-[#0B1A40] mb-2">Essencial</h3>
            <p className="text-sm text-slate-500 mb-6">Para começar a organizar e vender mais.</p>
            <div className="mb-6">
              <span className="text-sm text-slate-500">R$</span>
              <span className="text-4xl font-bold text-[#0B1A40]">199</span>
              <span className="text-sm text-slate-500">/mês</span>
            </div>
            <p className="text-xs text-slate-500 mb-6">Por usuário</p>
            <ul className="space-y-4 mb-8">
              {["CRM e funil de leads", "Gestão de imóveis", "Atendimento omnichannel", "Relatórios básicos"].map((f, i) => (
                <li key={i} className="flex items-center gap-3 text-sm text-slate-600">
                  <CheckCircle2 size={16} className="text-blue-500 flex-shrink-0" /> {f}
                </li>
              ))}
            </ul>
            <a href={INOVE_URL} className="block w-full py-3 text-center border-2 border-slate-200 text-slate-700 font-semibold rounded-xl hover:border-blue-600 hover:text-blue-600 transition-colors">
              Ver detalhes
            </a>
          </div>

          {/* Plan 2 (Highlighted) */}
          <div className="bg-white p-8 rounded-2xl border-2 border-blue-600 shadow-xl relative transform md:-translate-y-4">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-blue-600 text-white text-xs font-bold px-4 py-1 rounded-full uppercase tracking-wider">
              Mais Escolhido
            </div>
            <h3 className="text-2xl font-bold text-[#0B1A40] mb-2">Profissional</h3>
            <p className="text-sm text-slate-500 mb-6">Para imobiliárias que querem ganhar escala.</p>
            <div className="mb-6">
              <span className="text-sm text-slate-500">R$</span>
              <span className="text-4xl font-bold text-[#0B1A40]">349</span>
              <span className="text-sm text-slate-500">/mês</span>
            </div>
            <p className="text-xs text-slate-500 mb-6">Por usuário</p>
            <ul className="space-y-4 mb-8">
              {["Tudo do Essencial", "Marketing imobiliário", "Contratos e documentos", "Relatórios avançados", "Aplicativo mobile"].map((f, i) => (
                <li key={i} className="flex items-center gap-3 text-sm text-slate-600">
                  <CheckCircle2 size={16} className="text-blue-500 flex-shrink-0" /> {f}
                </li>
              ))}
            </ul>
            <a href={INOVE_URL} className="block w-full py-3 text-center bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20">
              Ver detalhes
            </a>
          </div>

          {/* Plan 3 */}
          <div className="bg-white p-8 rounded-2xl border border-slate-200">
            <h3 className="text-2xl font-bold text-[#0B1A40] mb-2">Performance</h3>
            <p className="text-sm text-slate-500 mb-6">Para equipes que buscam o máximo resultado.</p>
            <div className="mb-6">
              <span className="text-sm text-slate-500">R$</span>
              <span className="text-4xl font-bold text-[#0B1A40]">599</span>
              <span className="text-sm text-slate-500">/mês</span>
            </div>
            <p className="text-xs text-slate-500 mb-6">Por usuário</p>
            <ul className="space-y-4 mb-8">
              {["Tudo do Profissional", "Automações avançadas", "Integração com portais", "Suporte prioritário"].map((f, i) => (
                <li key={i} className="flex items-center gap-3 text-sm text-slate-600">
                  <CheckCircle2 size={16} className="text-blue-500 flex-shrink-0" /> {f}
                </li>
              ))}
            </ul>
            <a href={INOVE_URL} className="block w-full py-3 text-center border-2 border-slate-200 text-slate-700 font-semibold rounded-xl hover:border-blue-600 hover:text-blue-600 transition-colors">
              Ver detalhes
            </a>
          </div>
        </div>

        <div className="text-center mt-12">
          <a href={INOVE_URL} className="text-blue-600 font-semibold hover:underline inline-flex items-center gap-2">
            Ver planos completos <ArrowRight size={16} />
          </a>
        </div>
      </div>
    </section>
  );
}

function ContactSection() {
  return (
    <section className="py-24 bg-white">
      <div className="container mx-auto px-4 max-w-5xl">
        <div className="bg-[#0B1A40] rounded-3xl p-8 md:p-16 text-white grid md:grid-cols-2 gap-12 relative overflow-hidden">
           {/* Decorative background */}
           <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/20 rounded-full blur-3xl"></div>
           
           <div className="relative z-10">
             <p className="text-blue-400 font-semibold tracking-wider text-xs mb-4 uppercase">VAMOS CONVERSAR</p>
             <h2 className="text-3xl md:text-4xl font-bold mb-6">Pronto para elevar sua imobiliária ao próximo nível?</h2>
             <p className="text-slate-300 mb-8">Agende uma demonstração gratuita e descubra como nossa plataforma pode transformar seus resultados.</p>
             
             <div className="space-y-6">
               <div className="flex gap-4">
                 <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0 text-blue-400"><MessageSquare size={20}/></div>
                 <div>
                   <h4 className="font-semibold text-sm">Demonstração 1 a 1</h4>
                   <p className="text-xs text-slate-400">Apresentação personalizada da plataforma.</p>
                 </div>
               </div>
               <div className="flex gap-4">
                 <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0 text-blue-400"><CheckCircle2 size={20}/></div>
                 <div>
                   <h4 className="font-semibold text-sm">Sem compromisso</h4>
                   <p className="text-xs text-slate-400">Conheça o sistema antes de qualquer decisão.</p>
                 </div>
               </div>
             </div>
           </div>

           <div className="relative z-10 bg-white rounded-2xl p-6 md:p-8 text-slate-800">
             <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); window.location.href = INOVE_URL; }}>
               <div>
                 <label className="block text-xs font-medium text-slate-500 mb-1">Nome completo</label>
                 <input type="text" className="w-full border border-slate-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Seu nome" />
               </div>
               <div>
                 <label className="block text-xs font-medium text-slate-500 mb-1">E-mail profissional</label>
                 <input type="email" className="w-full border border-slate-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="seu@email.com" />
               </div>
               <div className="grid grid-cols-2 gap-4">
                 <div>
                   <label className="block text-xs font-medium text-slate-500 mb-1">WhatsApp</label>
                   <input type="tel" className="w-full border border-slate-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="(00) 00000-0000" />
                 </div>
                 <div>
                   <label className="block text-xs font-medium text-slate-500 mb-1">Imobiliária</label>
                   <input type="text" className="w-full border border-slate-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Nome da empresa" />
                 </div>
               </div>
               <div>
                 <label className="block text-xs font-medium text-slate-500 mb-1">Como podemos ajudar?</label>
                 <textarea rows={3} className="w-full border border-slate-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Conte-nos sobre seus desafios..."></textarea>
               </div>
               <button type="submit" className="w-full py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20">
                 Agendar demonstração
               </button>
             </form>
           </div>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="bg-[#0B1A40] pt-16 pb-8 border-t border-slate-800">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="grid md:grid-cols-4 gap-8 mb-12">
          <div className="col-span-1">
            <a href={INOVE_URL} className="flex items-center gap-2 mb-6">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xl leading-none">D</span>
              </div>
              <span className="font-bold text-xl tracking-tight text-white">DELAZARI<span className="text-blue-500 text-sm align-top ml-1">IMÓVEIS</span></span>
            </a>
            <p className="text-slate-400 text-sm mb-6">
              Plataforma completa de gestão imobiliária para aumentar produtividade, vendas e resultados da sua imobiliária.
            </p>
            <div className="flex gap-4 text-slate-400">
              <a href="#" className="hover:text-white transition-colors"><Instagram size={20} /></a>
              {/* Other socials */}
              <a href="#" className="hover:text-white transition-colors"><svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z"/></svg></a>
              <a href="#" className="hover:text-white transition-colors"><svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg></a>
            </div>
          </div>
          
          <div>
            <h4 className="font-semibold text-white mb-4">Soluções</h4>
            <ul className="space-y-2 text-sm text-slate-400">
              <li><a href="#" className="hover:text-white transition-colors">CRM e Leads</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Gestão de Imóveis</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Atendimento</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Marketing</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Locação</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Relatórios</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-white mb-4">Empresa</h4>
            <ul className="space-y-2 text-sm text-slate-400">
              <li><a href="#" className="hover:text-white transition-colors">Sobre nós</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Clientes</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Contato</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Carreiras</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Parceiros</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-white mb-4">Suporte</h4>
            <ul className="space-y-2 text-sm text-slate-400">
              <li><a href="#" className="hover:text-white transition-colors">Central de Ajuda</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Treinamentos</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Status do Sistema</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Fale Conosco</a></li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-slate-800 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-slate-500">
          <p>© {new Date().getFullYear()} Delazari Imóveis Revenda (Inove Brokers). Todos os direitos reservados.</p>
          <div className="flex gap-4">
            <a href="#" className="hover:text-white transition-colors">Política de Privacidade</a>
            <a href="#" className="hover:text-white transition-colors">Termos de Uso</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
