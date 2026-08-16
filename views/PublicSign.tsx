import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PenTool, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface SignatureData {
  signature: {
    id: string;
    signer_name: string;
    signer_type: string;
    signer_email?: string;
    signer_phone?: string;
    signer_cpf?: string;
    status: string;
    invitation_method?: string;
    signed_at?: string;
    signature_hash?: string;
    signature_provider?: string;
    provider_signature_id?: string;
  };
  lease: {
    id: string;
    property_title?: string;
    contract_number?: string;
    signed_document_url?: string;
    pdf_url?: string;
  } | null;
}

export const PublicSign = () => {
  const { signatureId } = useParams<{ signatureId: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<SignatureData | null>(null);
  const [loading, setLoading] = useState(true);
  const [signing, setSigning] = useState(false);
  const [formData, setFormData] = useState({
    signer_name: '',
    signer_cpf: '',
    acceptance_method: 'digital',
  });

  useEffect(() => {
    if (!signatureId) return;

    fetch(`/api/locacao/public/signature/${signatureId}`)
      .then((res) => res.json())
      .then((res) => {
        if (res.success && res.data) {
          setData(res.data);
          setFormData((prev) => ({
            ...prev,
            signer_name: res.data.signature.signer_name || '',
            signer_cpf: res.data.signature.signer_cpf || '',
          }));
        } else {
          toast.error(res.error || 'Assinatura não encontrada');
        }
      })
      .catch(() => toast.error('Erro ao carregar assinatura'))
      .finally(() => setLoading(false));
  }, [signatureId]);

  const handleSign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signatureId) return;

    setSigning(true);
    try {
      const signatureHash = btoa(
        `${formData.signer_name}-${formData.signer_cpf}-${Date.now()}`
      );

      const res = await fetch(
        `/api/locacao/public/signature/${signatureId}/sign`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...formData,
            signature_hash: signatureHash,
          }),
        }
      );

      const result = await res.json();
      if (result.success) {
        toast.success('Documento assinado com sucesso!');
        setTimeout(() => navigate('/'), 3000);
      } else {
        toast.error(result.error || 'Erro ao assinar');
      }
    } catch {
      toast.error('Erro ao processar assinatura');
    } finally {
      setSigning(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-slate-600">Carregando documento...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-slate-800 mb-2">
            Assinatura não encontrada
          </h1>
          <p className="text-slate-600">
            Verifique o link ou entre em contato com o remetente.
          </p>
        </div>
      </div>
    );
  }

  if (data.signature.status === 'signed') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-slate-800 mb-2">
            Documento já assinado
          </h1>
          <p className="text-slate-600">
            Este documento já foi assinado em{' '}
            {new Date(data.signature.signed_at || '').toLocaleString('pt-BR')}.
          </p>
        </div>
      </div>
    );
  }

  const documentUrl =
    data.lease?.pdf_url || data.lease?.signed_document_url || '#';

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 bg-blue-50 rounded-xl text-blue-600">
              <PenTool size={24} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-800">
                Assinatura Digital
              </h1>
              <p className="text-sm text-slate-500">
                {data.lease?.property_title || 'Contrato de Locação'}
              </p>
            </div>
          </div>

          {data.lease?.contract_number && (
            <p className="text-xs text-slate-400 uppercase tracking-wider">
              Contrato: {data.lease.contract_number}
            </p>
          )}
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 mb-6">
          <h2 className="text-sm font-bold uppercase tracking-widest text-slate-800 mb-4">
            Documento para Assinatura
          </h2>
          {documentUrl && documentUrl !== '#' ? (
            <iframe
              src={documentUrl}
              className="w-full h-[600px] rounded-xl border border-slate-200"
              title="Documento para assinatura"
            />
          ) : (
            <div className="p-8 bg-slate-50 rounded-xl text-center text-slate-500">
              Documento não disponível para preview. Entre em contato com o
              remetente.
            </div>
          )}
        </div>

        <form
          onSubmit={handleSign}
          className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6"
        >
          <h2 className="text-sm font-bold uppercase tracking-widest text-slate-800 mb-4">
            Confirmar Assinatura
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
                Nome completo *
              </label>
              <input
                type="text"
                value={formData.signer_name}
                onChange={(e) =>
                  setFormData({ ...formData, signer_name: e.target.value })
                }
                className="w-full px-4 py-2 rounded-lg border border-slate-200 text-sm outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
                CPF
              </label>
              <input
                type="text"
                value={formData.signer_cpf}
                onChange={(e) =>
                  setFormData({ ...formData, signer_cpf: e.target.value })
                }
                className="w-full px-4 py-2 rounded-lg border border-slate-200 text-sm outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
                Método de aceite
              </label>
              <select
                value={formData.acceptance_method}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    acceptance_method: e.target.value,
                  })
                }
                className="w-full px-4 py-2 rounded-lg border border-slate-200 text-sm outline-none"
              >
                <option value="digital">Assinatura Digital</option>
                <option value="clickwrap">Clickwrap</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={signing}
              className="w-full py-3 px-6 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {signing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Processando...
                </>
              ) : (
                <>
                  <CheckCircle size={18} />
                  Assinar Documento
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PublicSign;
