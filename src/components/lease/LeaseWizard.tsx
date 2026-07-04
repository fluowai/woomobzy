import React from 'react';
import {
  User, ShieldCheck, Briefcase, Building2, Home, Lock,
  DollarSign, ClipboardCheck, FileText, PenTool, CheckCircle,
  ChevronLeft, ChevronRight, Save, AlertCircle,
} from 'lucide-react';
import { useLeaseWizard } from '../../hooks/lease/useLeaseWizard';
import { useAutoSave } from '../../hooks/lease/useAutoSave';
import { WIZARD_STEPS, LEASE_STATUS_LABELS } from '../../types/lease';
import type { Lease } from '../../types/lease';

// Step components
import { StepTenantData } from './steps/StepTenantData';
import { StepCadastralAnalysis } from './steps/StepCadastralAnalysis';
import { StepIncomeDocs } from './steps/StepIncomeDocs';
import { StepProperty } from './steps/StepProperty';
import { StepOwnerData } from './steps/StepOwnerData';
import { StepGuarantee } from './steps/StepGuarantee';
import { StepCommercialTerms } from './steps/StepCommercialTerms';
import { StepInspection } from './steps/StepInspection';
import { StepContractGeneration } from './steps/StepContractGeneration';
import { StepDigitalSignature } from './steps/StepDigitalSignature';
import { StepReview } from './steps/StepReview';

const STEP_ICONS = [
  User, ShieldCheck, Briefcase, Building2, Home,
  Lock, DollarSign, ClipboardCheck, FileText, PenTool, CheckCircle,
];

interface LeaseWizardProps {
  existingLease?: Lease;
  onComplete?: () => void;
  onCancel?: () => void;
}

export const LeaseWizard: React.FC<LeaseWizardProps> = ({ existingLease, onComplete, onCancel }) => {
  const {
    lease, wizard, updateField, updateFields,
    goToStep, completeStep, nextStep, prevStep,
    saveDraft, clearDraft,
  } = useLeaseWizard(existingLease);

  useAutoSave(saveDraft, wizard.isDirty, 30000);

  const progressPercent = ((wizard.currentStep - 1) / (WIZARD_STEPS.length - 1)) * 100;

  const stepComponents = [
    StepTenantData, StepCadastralAnalysis, StepIncomeDocs,
    StepProperty, StepOwnerData, StepGuarantee, StepCommercialTerms,
    StepInspection, StepContractGeneration, StepDigitalSignature, StepReview,
  ];

  const CurrentStepComponent = stepComponents[wizard.currentStep - 1];

  const handleNext = () => {
    completeStep(wizard.currentStep);
    nextStep();
  };

  const handleSaveAndExit = async () => {
    await saveDraft();
    onCancel?.();
  };

  return (
    <div className="flex h-full bg-slate-50 rounded-3xl overflow-hidden border border-slate-200">
      {/* Sidebar */}
      <aside className="hidden lg:flex flex-col w-72 bg-white border-r border-slate-100 shrink-0">
        <div className="p-6 border-b border-slate-100">
          <h2 className="text-lg font-bold text-black uppercase italic tracking-tighter">
            Nova <span className="text-blue-600">Locação</span>
          </h2>
          <p className="text-xs text-slate-400 font-medium mt-1">
            {wizard.leaseId ? `#${lease.contract_number || wizard.leaseId.slice(0, 8)}` : 'Rascunho novo'}
          </p>
          {lease.tenant_name && (
            <p className="text-sm font-bold text-slate-700 mt-2 truncate">
              {lease.tenant_name}
            </p>
          )}
        </div>

        <nav className="flex-1 overflow-y-auto p-4 space-y-1">
          {WIZARD_STEPS.map((step, idx) => {
            const Icon = STEP_ICONS[idx];
            const isActive = wizard.currentStep === step.id;
            const isCompleted = wizard.completedSteps.includes(step.id);

            return (
              <button
                key={step.id}
                onClick={() => goToStep(step.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all ${
                  isActive
                    ? 'bg-blue-50 text-blue-700 shadow-sm'
                    : isCompleted
                    ? 'text-emerald-600 hover:bg-slate-50'
                    : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
                }`}
              >
                <div className={`p-1.5 rounded-lg ${
                  isActive ? 'bg-blue-600 text-white' :
                  isCompleted ? 'bg-emerald-100 text-emerald-600' :
                  'bg-slate-100 text-slate-400'
                }`}>
                  <Icon size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-xs font-bold uppercase tracking-wider ${
                    isActive ? 'text-blue-700' : isCompleted ? 'text-emerald-600' : 'text-slate-400'
                  }`}>
                    Etapa {step.id}
                  </p>
                  <p className="text-sm font-bold truncate">{step.label}</p>
                </div>
                {isCompleted && <CheckCircle size={14} className="text-emerald-500 shrink-0" />}
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Progress Bar */}
        <div className="h-1.5 bg-slate-200 shrink-0">
          <div
            className="h-full bg-blue-600 transition-all duration-500 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-white shrink-0">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-bold text-slate-900">
              {WIZARD_STEPS[wizard.currentStep - 1].label}
            </h3>
            <span className="text-xs text-slate-400 font-medium">
              Etapa {wizard.currentStep} de {WIZARD_STEPS.length}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {wizard.isSaving && (
              <span className="flex items-center gap-1.5 text-xs text-slate-400">
                <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Salvando...
              </span>
            )}
            {wizard.lastSavedAt && !wizard.isSaving && (
              <span className="text-xs text-emerald-600 font-medium">
                Salvo às {new Date(wizard.lastSavedAt).toLocaleTimeString('pt-BR')}
              </span>
            )}
            <button
              onClick={handleSaveAndExit}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-all"
            >
              <Save size={14} /> Salvar e Sair
            </button>
          </div>
        </div>

        {/* Step Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <CurrentStepComponent
            lease={lease}
            updateField={updateField}
            updateFields={updateFields}
          />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-white shrink-0">
          <button
            onClick={onCancel}
            className="px-4 py-2.5 text-sm font-bold text-slate-500 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-all"
          >
            Cancelar
          </button>
          <div className="flex items-center gap-3">
            {wizard.currentStep > 1 && (
              <button
                onClick={prevStep}
                className="flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all"
              >
                <ChevronLeft size={16} /> Voltar
              </button>
            )}
            {wizard.currentStep < WIZARD_STEPS.length ? (
              <button
                onClick={handleNext}
                className="flex items-center gap-2 px-6 py-2.5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-xl shadow-lg shadow-blue-600/20 transition-all"
              >
                Próximo <ChevronRight size={16} />
              </button>
            ) : (
              <button
                onClick={onComplete}
                className="flex items-center gap-2 px-6 py-2.5 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl shadow-lg shadow-emerald-600/20 transition-all"
              >
                <CheckCircle size={16} /> Ativar Contrato
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
