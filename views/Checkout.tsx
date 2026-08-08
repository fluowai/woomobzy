import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CreditCard, QrCode, Copy, CheckCircle2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { paymentService } from '@/services/paymentService';

type Step = 'method' | 'processing' | 'success' | 'error';
type Method = 'PIX' | 'BOLETO' | 'CREDIT_CARD';

const Checkout: React.FC = () => {
  const [searchParams] = useSearchParams();
  const planId = searchParams.get('planId');
  const [step, setStep] = useState<Step>('method');
  const [method, setMethod] = useState<Method>('PIX');
  const [loading, setLoading] = useState(false);
  const [payment, setPayment] = useState<any>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!planId) {
      toast.error('Plano nao informado');
    }
  }, [planId]);

  const handleCheckout = async () => {
    if (!planId) return;

    setLoading(true);
    setStep('processing');

    try {
      const result = await paymentService.createInvoice({
        amount: 0,
        dueDate: new Date().toISOString().split('T')[0],
        description: 'Assinatura',
        client: { name: '', email: '', cpfCnpj: planId },
      });

      if (result) {
        setPayment(result);
        setStep('success');
        toast.success('Cobranca gerada com sucesso');
      } else {
        throw new Error('Falha ao gerar cobranca');
      }
    } catch (error) {
      setStep('error');
      toast.error(
        error instanceof Error ? error.message : 'Erro ao processar pagamento'
      );
    } finally {
      setLoading(false);
    }
  };

  const copyPix = async () => {
    if (payment?.pixCode) {
      await navigator.clipboard.writeText(payment.pixCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!planId) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-900">
          Plano invalido. Retorne e selecione um plano.
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 p-4">
      <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl md:p-8">
        <h1 className="text-2xl font-bold text-slate-950">
          Finalizar Assinatura
        </h1>
        <p className="mt-1 text-sm font-medium text-slate-500">
          Escolha o metodo de pagamento para liberar o acesso.
        </p>

        {step === 'method' && (
          <div className="mt-6 space-y-3">
            {(['PIX', 'BOLETO', 'CREDIT_CARD'] as Method[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMethod(m)}
                className={`flex w-full items-center gap-3 rounded-2xl border p-4 text-left transition ${
                  method === m
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-slate-200 hover:border-blue-300'
                }`}
              >
                {m === 'PIX' && <QrCode className="text-blue-600" size={24} />}
                {m === 'BOLETO' && (
                  <CreditCard className="text-blue-600" size={24} />
                )}
                {m === 'CREDIT_CARD' && (
                  <CreditCard className="text-blue-600" size={24} />
                )}
                <span className="text-sm font-bold text-slate-950">{m}</span>
              </button>
            ))}

            <button
              type="button"
              onClick={handleCheckout}
              disabled={loading}
              className="mt-4 w-full rounded-2xl bg-blue-600 py-3 text-sm font-bold text-white transition hover:bg-blue-700 disabled:opacity-60"
            >
              {loading ? 'Processando...' : `Pagar com ${method}`}
            </button>
          </div>
        )}

        {step === 'processing' && (
          <div className="mt-10 flex flex-col items-center gap-3">
            <Loader2 className="animate-spin text-blue-600" size={48} />
            <p className="text-sm font-semibold text-slate-500">
              Processando pagamento...
            </p>
          </div>
        )}

        {step === 'success' && payment && (
          <div className="mt-6 space-y-4">
            <div className="flex items-center gap-2 text-green-700">
              <CheckCircle2 size={24} />
              <span className="text-lg font-bold">Pagamento gerado!</span>
            </div>

            {method === 'PIX' && payment.pixCode && (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold text-slate-500">
                  PIX Copia e Cola
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <code className="flex-1 break-all rounded-xl bg-white p-2 text-xs">
                    {payment.pixCode}
                  </code>
                  <button
                    type="button"
                    onClick={copyPix}
                    className="rounded-xl bg-blue-600 p-2 text-white transition hover:bg-blue-700"
                  >
                    {copied ? <CheckCircle2 size={18} /> : <Copy size={18} />}
                  </button>
                </div>
              </div>
            )}

            {method === 'BOLETO' && payment.bankSlipUrl && (
              <a
                href={payment.bankSlipUrl}
                target="_blank"
                rel="noreferrer"
                className="block rounded-2xl border border-slate-200 bg-slate-50 p-4 text-center text-sm font-bold text-blue-600 hover:underline"
              >
                Abrir Boleto
              </a>
            )}

            {payment.invoiceUrl && (
              <a
                href={payment.invoiceUrl}
                target="_blank"
                rel="noreferrer"
                className="block rounded-2xl border border-slate-200 bg-slate-50 p-4 text-center text-sm font-bold text-blue-600 hover:underline"
              >
                Ver Fatura
              </a>
            )}
          </div>
        )}

        {step === 'error' && (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-900">
            Nao foi possivel processar o pagamento. Tente novamente.
          </div>
        )}
      </div>
    </div>
  );
};

export default Checkout;
