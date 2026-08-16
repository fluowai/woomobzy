import { useState } from 'react';
import { Loader2, MessageCirclePlus, Phone, UserRound, X } from 'lucide-react';
import { toast } from 'sonner';

interface NewConversationModalProps {
  onClose: () => void;
  onCreate: (phone: string, name?: string) => Promise<unknown>;
}

export function NewConversationModal({
  onClose,
  onCreate,
}: NewConversationModalProps) {
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [creating, setCreating] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const normalizedPhone = phone.replace(/\D/g, '');
    if (normalizedPhone.length < 12 || normalizedPhone.length > 13) {
      toast.error('Informe o telefone com DDI e DDD. Ex.: +55 11 99999-9999.');
      return;
    }
    setCreating(true);
    try {
      await onCreate(normalizedPhone, name.trim() || undefined);
      toast.success('Conversa pronta para atendimento.');
      onClose();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Não foi possível criar a conversa.'
      );
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="wa-center-modal-backdrop" onMouseDown={onClose}>
      <form
        className="wa-center-modal"
        onSubmit={submit}
        onMouseDown={(event) => event.stopPropagation()}
        aria-labelledby="new-conversation-title"
      >
        <div className="wa-center-modal-head">
          <span className="wa-center-modal-icon">
            <MessageCirclePlus size={20} />
          </span>
          <div>
            <h2 id="new-conversation-title">Nova conversa</h2>
            <p>Inicie um atendimento pelo WhatsApp.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Fechar">
            <X size={18} />
          </button>
        </div>

        <label className="wa-center-field">
          <span>Nome do contato</span>
          <div>
            <UserRound size={17} />
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Ex.: Marina Lopes"
              autoFocus
            />
          </div>
        </label>

        <label className="wa-center-field">
          <span>WhatsApp</span>
          <div>
            <Phone size={17} />
            <input
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder="+55 11 99999-9999"
              inputMode="tel"
              required
            />
          </div>
        </label>

        <div className="wa-center-modal-actions">
          <button type="button" className="secondary" onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" className="primary" disabled={creating}>
            {creating ? (
              <Loader2 size={17} className="animate-spin" />
            ) : (
              <MessageCirclePlus size={17} />
            )}
            Iniciar conversa
          </button>
        </div>
      </form>
    </div>
  );
}
