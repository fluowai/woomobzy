import React, { useState, useEffect } from 'react';
import { Sparkles, X, ArrowRight, CheckCircle2 } from 'lucide-react';

interface TourStep {
  title: string;
  description: string;
  target?: string;
}

const steps: TourStep[] = [
  {
    title: "Bem-vindo à sua Máquina 360",
    description: "Este é o seu centro de comando. Aqui você vê leads, contratos e o financeiro de forma unificada.",
  },
  {
    title: "Hub de Comunicação",
    description: "Acompanhe as últimas mensagens do seu WhatsApp em tempo real e responda leads sem trocar de aba.",
  },
  {
    title: "Fintech Integrada",
    description: "Gerencie cobranças e veja seu VGV provisionado com integração direta ao Asaas.",
  },
];

const WelcomeTour: React.FC = () => {
  const [show, setShow] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    const hasSeenTour = localStorage.getItem('imobzy_tour_seen');
    if (!hasSeenTour) {
      const timer = setTimeout(() => setShow(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleClose = () => {
    setShow(false);
    localStorage.setItem('imobzy_tour_seen', 'true');
  };

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleClose();
    }
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose} />
      
      <div className="relative bg-bg-card border border-brand/30 w-full max-w-md rounded-[2.5rem] p-10 shadow-2xl animate-in zoom-in duration-300">
        <div className="absolute -top-12 left-1/2 -translate-x-1/2">
          <div className="w-24 h-24 bg-gradient-to-tr from-brand to-brand-hover rounded-full flex items-center justify-center shadow-2xl shadow-brand/20 animate-float text-white">
            <Sparkles size={40} />
          </div>
        </div>

        <button 
          onClick={handleClose}
          className="absolute top-6 right-6 text-tertiary hover:text-text-primary transition-colors"
        >
          <X size={20} />
        </button>

        <div className="mt-8 text-center">
          <span className="badge badge-primary mb-4">Etapa {currentStep + 1} de {steps.length}</span>
          <h2 className="text-2xl font-black text-text-primary mb-4 leading-tight">
            {steps[currentStep].title}
          </h2>
          <p className="text-secondary font-medium leading-relaxed mb-10">
            {steps[currentStep].description}
          </p>

          <div className="flex gap-4">
            <button 
              onClick={handleClose}
              className="flex-1 btn btn-secondary h-14"
            >
              Pular
            </button>
            <button 
              onClick={nextStep}
              className="flex-1 btn btn-primary h-14 shadow-xl shadow-brand/20 group"
            >
              {currentStep === steps.length - 1 ? (
                <>Começar Agora <CheckCircle2 size={18} /></>
              ) : (
                <>Próximo <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" /></>
              )}
            </button>
          </div>

          <div className="mt-8 flex justify-center gap-2">
            {steps.map((_, i) => (
              <div 
                key={i} 
                className={`h-1.5 rounded-full transition-all duration-300 ${i === currentStep ? 'w-8 bg-brand' : 'w-2 bg-border'}`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default WelcomeTour;
