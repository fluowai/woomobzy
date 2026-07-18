import React, { useState, useEffect } from 'react';
import { X, Play, StopCircle } from 'lucide-react';
import { toast } from 'sonner';
import { leadService } from '../../services/leads';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  leadId: string;
}

export const DripCampaignModal: React.FC<Props> = ({
  isOpen,
  onClose,
  leadId,
}) => {
  const [templates, setTemplates] = useState<any[]>([]);
  const [activeCampaigns, setActiveCampaigns] = useState<any[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingActive, setLoadingActive] = useState(false);

  useEffect(() => {
    if (isOpen && leadId) {
      loadTemplates();
      loadActiveCampaigns();
    }
  }, [isOpen, leadId]);

  const loadTemplates = async () => {
    try {
      const data = await leadService.getDripTemplates();
      setTemplates(data);
      if (data.length > 0) setSelectedTemplate(data[0].key);
    } catch (error) {
      toast.error('Erro ao carregar templates de campanha.');
    }
  };

  const loadActiveCampaigns = async () => {
    setLoadingActive(true);
    try {
      const data = await leadService.getLeadDripCampaigns(leadId);
      setActiveCampaigns(data);
    } catch (error) {
      toast.error('Erro ao carregar campanhas ativas.');
    } finally {
      setLoadingActive(false);
    }
  };

  const handleStart = async () => {
    if (!selectedTemplate) return;
    setLoading(true);
    try {
      await leadService.startDripCampaign(leadId, selectedTemplate, {});
      toast.success('Campanha Drip iniciada!');
      loadActiveCampaigns();
    } catch (error: any) {
      toast.error(error.message || 'Erro ao iniciar campanha.');
    } finally {
      setLoading(false);
    }
  };

  const handleStop = async () => {
    setLoading(true);
    try {
      await leadService.cancelDripCampaigns(leadId);
      toast.success('Campanhas canceladas com sucesso!');
      loadActiveCampaigns();
    } catch (error: any) {
      toast.error(error.message || 'Erro ao cancelar campanhas.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-semibold text-slate-900">
            Automação de E-mails (Drip)
          </h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-100 rounded-md text-slate-400"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {loadingActive ? (
            <div className="text-sm text-slate-500">Carregando...</div>
          ) : activeCampaigns.length > 0 ? (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
              <h4 className="text-sm font-bold text-emerald-800 mb-2">
                Campanha em Andamento
              </h4>
              {activeCampaigns.map((camp: any, idx) => (
                <div key={idx} className="text-xs text-emerald-700">
                  Template: {camp.template_key} | Status: {camp.status}
                </div>
              ))}
              <button
                onClick={handleStop}
                disabled={loading}
                className="mt-3 w-full flex items-center justify-center gap-2 rounded bg-white py-1.5 text-xs font-bold text-rose-600 border border-rose-200 hover:bg-rose-50"
              >
                <StopCircle size={14} />
                Parar Automação
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-slate-600">
                Selecione uma sequência de e-mails para nutrir este lead
                automaticamente.
              </p>

              <div className="space-y-2">
                {templates.map((tpl) => (
                  <label
                    key={tpl.key}
                    className={`flex flex-col p-3 border rounded-lg cursor-pointer transition-colors ${
                      selectedTemplate === tpl.key
                        ? 'border-primary bg-primary/5'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center">
                      <input
                        type="radio"
                        name="template"
                        value={tpl.key}
                        checked={selectedTemplate === tpl.key}
                        onChange={(e) => setSelectedTemplate(e.target.value)}
                        className="mr-3"
                      />
                      <span className="text-sm font-medium text-slate-800">
                        {tpl.name}
                      </span>
                    </div>
                    <div className="ml-7 mt-1 text-xs text-slate-500">
                      {tpl.steps} passos • Duração: {tpl.durationHours}h
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="p-5 bg-slate-50 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-200 rounded-lg"
          >
            Fechar
          </button>
          {!activeCampaigns.length && (
            <button
              onClick={handleStart}
              disabled={loading || !selectedTemplate}
              className="px-4 py-2 text-sm font-semibold text-white bg-primary hover:bg-primary-hover rounded-lg flex items-center gap-2"
            >
              {loading ? 'Iniciando...' : 'Iniciar Campanha'}
              {!loading && <Play size={14} />}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
