import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { supabase } from '../../services/supabase';
import { woosignService } from '../../services/woosign';
import { uploadFile } from '../../services/storage';
import type { CreateEnvelopeInput } from '../../services/woosign';

const WooSignCreateEnvelope: React.FC = () => {
  const [title, setTitle] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [sending, setSending] = useState(false);
  const [recipients, setRecipients] = useState<Array<{ email: string; name: string }>>([
    { email: '', name: '' },
  ]);

  const addRecipient = () => {
    setRecipients([...recipients, { email: '', name: '' }]);
  };

  const removeRecipient = (index: number) => {
    setRecipients(recipients.filter((_, i) => i !== index));
  };

  const updateRecipient = (index: number, field: 'email' | 'name', value: string) => {
    const updated = [...recipients];
    updated[index][field] = value;
    setRecipients(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Usuário não autenticado');
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id, team_id')
        .eq('id', user.id)
        .single();

      if (!profile) {
        toast.error('Perfil não encontrado');
        return;
      }

      let pdfUrl: string | undefined;

      if (file) {
        setUploading(true);
        pdfUrl = (await uploadFile(file, 'documents', `woosign/${user.id}`)) || undefined;
        setUploading(false);

        if (!pdfUrl) {
          toast.error('Erro ao fazer upload do PDF');
          return;
        }
      }

      const validRecipients = recipients.filter((r) => r.email && r.name);

      if (validRecipients.length === 0) {
        toast.error('Adicione pelo menos um destinatário');
        return;
      }

      const input: CreateEnvelopeInput = {
        whiteLabelId: 'default',
        organizationId: profile.organization_id,
        teamId: profile.team_id || undefined,
        userId: user.id,
        title,
        pdfUrl,
        recipients: validRecipients.map((recipient, index) => ({
          email: recipient.email,
          name: recipient.name,
          role: 'SIGNER',
          signingOrder: index + 1,
        })),
        idempotencyKey: `envelope-${Date.now()}-${user.id}`,
      };

      const envelope = await woosignService.createEnvelope(input);

      await woosignService.reserveCredit(
        'default',
        envelope.id,
        1,
        input.idempotencyKey
      );

      await woosignService.sendEnvelope(envelope.id);

      toast.success('Envelope criado e enviado com sucesso!');
      setTitle('');
      setFile(null);
      setRecipients([{ email: '', name: '' }]);
    } catch (error) {
      toast.error('Erro ao criar envelope');
    } finally {
      setSending(false);
      setUploading(false);
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Novo Envelope</h1>

      <form onSubmit={handleSubmit} className="max-w-2xl space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Título do documento</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-lg border border-slate-200 px-3 py-2"
            placeholder="Ex: Contrato de prestação de serviços"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">PDF do documento</label>
          <input
            type="file"
            accept="application/pdf"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="w-full rounded-lg border border-slate-200 px-3 py-2"
          />
          {file && (
            <p className="text-xs text-slate-500 mt-1">
              {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
            </p>
          )}
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium">Destinatários</label>
            <button
              type="button"
              onClick={addRecipient}
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              + Adicionar
            </button>
          </div>

          {recipients.map((recipient, index) => (
            <div key={index} className="grid grid-cols-2 gap-2 mb-2">
              <input
                type="text"
                value={recipient.name}
                onChange={(e) => updateRecipient(index, 'name', e.target.value)}
                className="rounded-lg border border-slate-200 px-3 py-2"
                placeholder="Nome"
                required
              />
              <div className="flex gap-2">
                <input
                  type="email"
                  value={recipient.email}
                  onChange={(e) => updateRecipient(index, 'email', e.target.value)}
                  className="flex-1 rounded-lg border border-slate-200 px-3 py-2"
                  placeholder="E-mail"
                  required
                />
                {recipients.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeRecipient(index)}
                    className="text-red-600 hover:text-red-700"
                  >
                    ×
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        <button
          type="submit"
          disabled={sending || uploading}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {sending || uploading ? 'Processando...' : 'Criar e enviar envelope'}
        </button>
      </form>
    </div>
  );
};

export default WooSignCreateEnvelope;
