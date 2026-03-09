import React from 'react';
import { Phone, CheckCircle, ArrowRight, ShieldCheck, TrendingUp, FileCheck } from 'lucide-react';
import { BrokerCardBlockConfig } from '../../types/landingPage';

interface BrokerCardBlockProps {
  config: BrokerCardBlockConfig;
  theme: any;
  settings?: any;
}

const BrokerCardBlock: React.FC<BrokerCardBlockProps> = ({ config, theme, settings }) => {
  // Dados principais com fallback para settings
  const name = config.name || settings?.agencyName || 'Especialista em Propriedades Rurais';
  const photo = config.photoUrl || settings?.logoUrl;
  const phone = config.phone || settings?.whatsapp;
  const creci = config.creci || settings?.creci || '';
  const description = config.description || 'Conectamos investidores e produtores rurais às melhores oportunidades em fazendas e sítios produtivos. Nossa experiência no agronegócio brasileiro garante segurança e rentabilidade em cada transação.';
  const specialty = config.specialty || 'ESPECIALISTA';
  
  // Cores
  const primaryColor = theme.primaryColor || '#1e40af';
  const secondaryColor = theme.secondaryColor || '#1e293b';

  const normalizePhone = (phone: string) => phone?.replace(/\D/g, '');

  return (
    <div className="w-full max-w-7xl mx-auto px-4 md:px-8 py-12">
      <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-20">
        
        {/* LEFTSIDE: Image & Badge */}
        <div className="w-full lg:w-1/2 relative">
          <div className="relative z-10 rounded-3xl overflow-hidden shadow-2xl border-8 border-white">
            {photo ? (
              <img 
                src={photo} 
                alt={name} 
                className="w-full h-auto object-cover"
              />
            ) : (
              <div className="w-full aspect-[4/5] bg-gray-100 flex items-center justify-center">
                <span className="text-gray-300 text-6xl">Foto</span>
              </div>
            )}
            
            {/* Badge Overlay */}
            <div className="absolute bottom-6 left-6 right-6 bg-white/95 backdrop-blur-sm rounded-2xl p-4 md:p-6 shadow-xl">
              <div className="flex items-center gap-4">
                <div 
                  className="w-12 h-12 rounded-full flex items-center justify-center text-white shrink-0"
                  style={{ backgroundColor: primaryColor }}
                >
                  <ShieldCheck size={24} />
                </div>
                <div>
                  <p className="text-xs font-black uppercase tracking-wider text-slate-400">Especialista Certificado</p>
                  <p className="text-sm font-bold text-slate-900">
                    {creci ? `CRECI: ${creci}` : 'CRECI Ativo'} • 20+ Anos
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          {/* Floating Stats Card (Hidden on mobile) */}
          <div className="absolute -right-8 top-1/4 hidden lg:block z-20">
            <div className="bg-white rounded-2xl shadow-xl p-6 w-40 animate-pulse-slow">
              <p className="text-3xl font-black mb-1" style={{ color: primaryColor }}>500+</p>
              <p className="text-xs font-bold text-slate-600">Propriedades Vendidas</p>
            </div>
          </div>

          {/* Background Decor */}
          <div className="absolute -top-10 -left-10 w-full h-full bg-gray-100 rounded-3xl -z-10 transform -rotate-3"></div>
        </div>

        {/* RIGHTSIDE: Content */}
        <div className="w-full lg:w-1/2">
          <span 
            className="text-xs font-black uppercase tracking-[0.3em] mb-4 block"
            style={{ color: primaryColor }}
          >
            {specialty}
          </span>
          
          <h2 
            className="text-4xl md:text-5xl font-black uppercase leading-tight mb-6"
            style={{ color: secondaryColor, fontFamily: theme.headingFontFamily }}
          >
            {name}
          </h2>
          
          <p className="text-lg text-slate-600 mb-8 leading-relaxed">
            {description}
          </p>

          {/* Features List */}
          <div className="space-y-4 mb-10">
             {/* Feature 1 */}
            <div className="flex items-start gap-4 p-4 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors">
              <div 
                className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-white" 
                style={{ backgroundColor: primaryColor }}
              >
                <TrendingUp size={20} />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 mb-1">Análise Técnica Completa</h4>
                <p className="text-sm text-slate-600">Avaliação de solo, recursos hídricos e potencial produtivo</p>
              </div>
            </div>

            {/* Feature 2 */}
            <div className="flex items-start gap-4 p-4 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors">
              <div 
                className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-white" 
                style={{ backgroundColor: primaryColor }}
              >
                <FileCheck size={20} />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 mb-1">Regularização Completa</h4>
                <p className="text-sm text-slate-600">Documentação fundiária e licenciamento ambiental</p>
              </div>
            </div>

            {/* Feature 3 */}
            <div className="flex items-start gap-4 p-4 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors">
              <div 
                className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-white" 
                style={{ backgroundColor: primaryColor }}
              >
                <CheckCircle size={20} />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 mb-1">Suporte Financeiro</h4>
                <p className="text-sm text-slate-600">Assessoria em crédito rural e financiamento</p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4">
            {phone && (
              <a 
                href={`https://wa.me/55${normalizePhone(phone)}`}
                target="_blank" 
                rel="noopener noreferrer"
                className="px-8 py-4 text-white text-sm font-black uppercase tracking-wider hover:opacity-90 transition-all rounded-xl shadow-lg flex items-center justify-center gap-2"
                style={{ backgroundColor: primaryColor }}
              >
                <Phone size={20} />
                Falar com Especialista
              </a>
            )}
            
            <button 
              className="px-8 py-4 border-2 text-sm font-black uppercase tracking-wider transition-all rounded-xl flex items-center justify-center gap-2 hover:bg-slate-900 hover:text-white"
              style={{ borderColor: secondaryColor, color: secondaryColor }}
            >
              Ver Propriedades
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BrokerCardBlock;
