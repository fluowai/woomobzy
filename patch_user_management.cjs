const fs = require('fs');
const file = 'views/admin/UserManagement.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Add lucide imports for tabs
content = content.replace(
  "UserCheck,\n} from 'lucide-react';",
  "UserCheck,\n  CreditCard,\n  FileText,\n  Wallet,\n} from 'lucide-react';"
);

// 2. Add state variables for the new fields
const oldStates = `  // Invite Modal States
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');`;

const newStates = `  // Invite Modal States
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteActiveTab, setInviteActiveTab] = useState<'basic' | 'finance'>('basic');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [invitePhone, setInvitePhone] = useState('');
  const [inviteCreci, setInviteCreci] = useState('');
  const [inviteCommission, setInviteCommission] = useState('');
  const [invitePixType, setInvitePixType] = useState('cpf_cnpj');
  const [invitePixKey, setInvitePixKey] = useState('');
  const [inviteBank, setInviteBank] = useState('');
  const [inviteAgency, setInviteAgency] = useState('');
  const [inviteAccount, setInviteAccount] = useState('');
  const [inviteSubmitting, setInviteSubmitting] = useState(false);`;

content = content.replace(oldStates, newStates);

// 3. Replace handleInvite with actual API call
const oldHandleInvite = `  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail || !inviteName) return;

    try {
      toast.success(
        \`Convite enviado para \${inviteEmail}. O corretor receberá um link para configurar a senha.\`
      );
      setIsInviteModalOpen(false);
      setInviteEmail('');
      setInviteName('');
    } catch (err) {
      toast.error('Erro ao enviar convite.');
    }
  };`;

const newHandleInvite = `  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail || !inviteName) return;

    setInviteSubmitting(true);
    try {
      const payload = {
        email: inviteEmail,
        name: inviteName,
        phone: invitePhone,
        creci: inviteCreci,
        commission_rate: inviteCommission ? parseFloat(inviteCommission) : 0,
        payment_info: {
          pix_type: invitePixType,
          pix_key: invitePixKey,
          bank: inviteBank,
          agency: inviteAgency,
          account: inviteAccount
        }
      };

      const res = await callApi('/api/admin/users/invite', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      if (!res.success) {
        throw new Error(res.error || 'Erro ao convidar corretor.');
      }

      toast.success(
        \`Convite enviado para \${inviteEmail}. Perfil criado com sucesso!\`
      );
      setIsInviteModalOpen(false);
      setInviteEmail('');
      setInviteName('');
      setInvitePhone('');
      setInviteCreci('');
      setInviteCommission('');
      setInvitePixKey('');
      setInviteBank('');
      setInviteAgency('');
      setInviteAccount('');
      
      // Refresh list
      fetchUsers();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao enviar convite.');
    } finally {
      setInviteSubmitting(false);
    }
  };`;

content = content.replace(oldHandleInvite, newHandleInvite);

// 4. Replace Modal JSX
const oldModalJSX = `{/* Invite Modal */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900">
                Convidar Corretor
              </h3>
              <button
                onClick={() => setIsInviteModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 text-xs font-bold uppercase"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleInvite} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">
                  Nome Completo
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: João Silva"
                  className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">
                  E-mail
                </label>
                <input
                  type="email"
                  required
                  placeholder="corretor@imobzy.com"
                  className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                />
              </div>

              <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-100">
                <p className="text-xs text-indigo-700 leading-relaxed font-medium">
                  <strong>Aviso:</strong> O convidado receberá um e-mail com
                  instruções para ativar sua conta na plataforma.
                </p>
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  className="w-full py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-bold shadow-lg shadow-indigo-100 transition-all flex items-center justify-center gap-2"
                >
                  <UserCheck size={20} /> Enviar Convite
                </button>
              </div>
            </form>
          </div>
        </div>
      )}`;

const newModalJSX = `{/* Invite Modal */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between shrink-0">
              <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <UserPlus className="text-indigo-600" size={24} />
                Ficha de Cadastro do Corretor
              </h3>
              <button
                onClick={() => setIsInviteModalOpen(false)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex border-b border-gray-100 px-6 pt-2 shrink-0">
              <button
                onClick={() => setInviteActiveTab('basic')}
                className={\`flex items-center gap-2 px-4 py-3 font-semibold text-sm border-b-2 transition-colors \${
                  inviteActiveTab === 'basic'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }\`}
              >
                <FileText size={18} />
                Dados Básicos
              </button>
              <button
                onClick={() => setInviteActiveTab('finance')}
                className={\`flex items-center gap-2 px-4 py-3 font-semibold text-sm border-b-2 transition-colors \${
                  inviteActiveTab === 'finance'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }\`}
              >
                <Wallet size={18} />
                Financeiro
              </button>
            </div>

            <form onSubmit={handleInvite} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-6 overflow-y-auto flex-1 space-y-6">
                {inviteActiveTab === 'basic' ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="col-span-2 sm:col-span-1">
                        <label className="block text-sm font-bold text-gray-700 mb-1">
                          Nome Completo *
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="Ex: João Silva"
                          className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                          value={inviteName}
                          onChange={(e) => setInviteName(e.target.value)}
                        />
                      </div>
                      <div className="col-span-2 sm:col-span-1">
                        <label className="block text-sm font-bold text-gray-700 mb-1">
                          E-mail *
                        </label>
                        <input
                          type="email"
                          required
                          placeholder="corretor@imobzy.com"
                          className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                          value={inviteEmail}
                          onChange={(e) => setInviteEmail(e.target.value)}
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="col-span-2 sm:col-span-1">
                        <label className="block text-sm font-bold text-gray-700 mb-1">
                          Telefone / WhatsApp
                        </label>
                        <input
                          type="text"
                          placeholder="(00) 00000-0000"
                          className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                          value={invitePhone}
                          onChange={(e) => setInvitePhone(e.target.value)}
                        />
                      </div>
                      <div className="col-span-2 sm:col-span-1">
                        <label className="block text-sm font-bold text-gray-700 mb-1">
                          CRECI
                        </label>
                        <input
                          type="text"
                          placeholder="Ex: 12345-F"
                          className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                          value={inviteCreci}
                          onChange={(e) => setInviteCreci(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div>
                      <h4 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                        <CreditCard size={16} className="text-indigo-500" />
                        Comissionamento Padrão
                      </h4>
                      <div className="w-1/2">
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                          Taxa de Comissão (%)
                        </label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.1"
                          placeholder="Ex: 50"
                          className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                          value={inviteCommission}
                          onChange={(e) => setInviteCommission(e.target.value)}
                        />
                      </div>
                    </div>
                    
                    <hr className="border-gray-100" />
                    
                    <div>
                      <h4 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                        <Wallet size={16} className="text-indigo-500" />
                        Dados de Pagamento (PIX)
                      </h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2 sm:col-span-1">
                          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                            Tipo de Chave
                          </label>
                          <select
                            className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                            value={invitePixType}
                            onChange={(e) => setInvitePixType(e.target.value)}
                          >
                            <option value="cpf_cnpj">CPF/CNPJ</option>
                            <option value="email">E-mail</option>
                            <option value="phone">Telefone</option>
                            <option value="random">Chave Aleatória</option>
                          </select>
                        </div>
                        <div className="col-span-2 sm:col-span-1">
                          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                            Chave PIX
                          </label>
                          <input
                            type="text"
                            placeholder="Insira a chave"
                            className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                            value={invitePixKey}
                            onChange={(e) => setInvitePixKey(e.target.value)}
                          />
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                        <Wallet size={16} className="text-gray-400" />
                        Dados Bancários (Opcional)
                      </h4>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="col-span-3 sm:col-span-1">
                          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                            Banco
                          </label>
                          <input
                            type="text"
                            placeholder="Ex: Itaú"
                            className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                            value={inviteBank}
                            onChange={(e) => setInviteBank(e.target.value)}
                          />
                        </div>
                        <div className="col-span-3 sm:col-span-1">
                          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                            Agência
                          </label>
                          <input
                            type="text"
                            placeholder="Ex: 0001"
                            className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                            value={inviteAgency}
                            onChange={(e) => setInviteAgency(e.target.value)}
                          />
                        </div>
                        <div className="col-span-3 sm:col-span-1">
                          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                            Conta
                          </label>
                          <input
                            type="text"
                            placeholder="Ex: 12345-6"
                            className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                            value={inviteAccount}
                            onChange={(e) => setInviteAccount(e.target.value)}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-100 flex gap-3 items-start mt-6">
                  <Info size={20} className="text-indigo-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-indigo-700 leading-relaxed font-medium">
                    O corretor receberá um e-mail com um link para ativar a conta e configurar sua própria senha.
                  </p>
                </div>
              </div>

              <div className="p-6 border-t border-gray-100 bg-gray-50 rounded-b-2xl shrink-0 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsInviteModalOpen(false)}
                  className="px-6 py-2.5 text-gray-600 font-bold hover:bg-gray-200 rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={inviteSubmitting}
                  className="px-8 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-bold shadow-lg shadow-indigo-100 transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  {inviteSubmitting ? (
                    <>Enviando...</>
                  ) : (
                    <><UserCheck size={20} /> Salvar e Convidar</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}`;

content = content.replace(oldModalJSX, newModalJSX);

fs.writeFileSync(file, content);
