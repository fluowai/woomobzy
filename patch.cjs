const fs = require('fs');
const file = 'views/CRM/KanbanBoard/LeadDetailsModal.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Add imports
content = content.replace('import {', 'import { Pencil, Save, X as XIcon, ');

// 2. Add state
const stateInsert = `
  const [isEditingSidebar, setIsEditingSidebar] = useState(false);
  const [sidebarForm, setSidebarForm] = useState({
    phone: '',
    email: '',
    budget: '',
    type: '',
    neighborhood: '',
    aptitude_interest: '',
  });
  const [savingSidebar, setSavingSidebar] = useState(false);

  useEffect(() => {
    if (lead) {
      setSidebarForm({
        phone: lead.phone || '',
        email: lead.email || '',
        budget: lead.budget ? lead.budget.toString() : '',
        type: lead.preferences?.type || '',
        neighborhood: lead.preferences?.neighborhood || '',
        aptitude_interest: (lead.aptitude_interest || []).join(', '),
      });
    }
  }, [lead]);

  const handleSaveSidebar = async () => {
    if (!lead?.id) return;
    setSavingSidebar(true);
    try {
      const budget = sidebarForm.budget ? parseFloat(sidebarForm.budget.replace(/[^0-9.-]+/g, '')) : null;
      const aptitude_interest = sidebarForm.aptitude_interest.split(',').map(s => s.trim()).filter(Boolean);
      const preferences = {
        ...(lead.preferences || {}),
        type: sidebarForm.type,
        neighborhood: sidebarForm.neighborhood
      };
      
      const payload = {
        phone: sidebarForm.phone,
        email: sidebarForm.email,
        budget,
        preferences,
        aptitude_interest
      };

      const { error } = await supabase.from('leads').update(payload).eq('id', lead.id);
      if (error) throw error;
      
      toast.success('Informações atualizadas com sucesso');
      setIsEditingSidebar(false);
      if (onUpdateLead) {
        onUpdateLead({ ...lead, ...payload });
      } else {
        window.location.reload();
      }
    } catch (err) {
      toast.error('Erro ao salvar as informações');
    } finally {
      setSavingSidebar(false);
    }
  };
`;
content = content.replace(
  'const [appointments, setAppointments] = useState<any[]>([]);',
  stateInsert +
    '\n  const [appointments, setAppointments] = useState<any[]>([]);'
);

// 3. Replace the sidebar rendering
const sidebarStart = '{/* Sidebar Esquerda (Informações do Lead) */}';
const sidebarEnd = '{/* Área Principal (Conteúdo das Abas) */}';
const sidebarRegex = new RegExp(
  sidebarStart.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&') +
    '[\\s\\S]*?' +
    sidebarEnd.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')
);

const newSidebar = `{/* Sidebar Esquerda (Informações do Lead) */}
          <div className="w-full md:w-80 bg-white border-r border-slate-200 overflow-y-auto custom-scrollbar p-6 shrink-0 flex flex-col gap-6">
            <div className="flex items-center justify-between">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Informações</h3>
              {!isEditingSidebar ? (
                <button
                  onClick={() => setIsEditingSidebar(true)}
                  className="flex items-center gap-1.5 px-2 py-1 bg-indigo-50 text-indigo-600 rounded-lg text-[10px] font-bold hover:bg-indigo-100 transition-colors"
                >
                  <Pencil size={12} /> Editar
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsEditingSidebar(false)}
                    className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg"
                  >
                    <XIcon size={14} />
                  </button>
                  <button
                    onClick={handleSaveSidebar}
                    disabled={savingSidebar}
                    className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500 text-white rounded-lg text-[10px] font-bold hover:bg-emerald-600 transition-colors disabled:opacity-50"
                  >
                    <Save size={12} /> {savingSidebar ? '...' : 'Salvar'}
                  </button>
                </div>
              )}
            </div>

            {/* Contato */}
            <div className="space-y-3">
              <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                Contato
              </h4>
              <div className="flex flex-col gap-3">
                {isEditingSidebar ? (
                  <>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Telefone</p>
                      <input
                        value={sidebarForm.phone}
                        onChange={e => setSidebarForm(p => ({ ...p, phone: e.target.value }))}
                        className="w-full h-10 px-3 rounded-lg border border-slate-300 text-sm font-bold bg-white focus:border-indigo-500 outline-none"
                      />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">E-mail</p>
                      <input
                        value={sidebarForm.email}
                        onChange={e => setSidebarForm(p => ({ ...p, email: e.target.value }))}
                        className="w-full h-10 px-3 rounded-lg border border-slate-300 text-sm font-bold bg-white focus:border-indigo-500 outline-none"
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <a
                      href={\`tel:\${lead.phone}\`}
                      className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100 hover:border-indigo-200 hover:bg-indigo-50/50 group transition-colors"
                    >
                      <div className="bg-white p-2 rounded-lg shadow-sm group-hover:text-indigo-600 text-slate-500">
                        <Phone size={16} />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase">
                          Telefone
                        </p>
                        <p className="text-sm font-bold text-slate-800">
                          {lead.phone || 'Não informado'}
                        </p>
                      </div>
                    </a>
                    <a
                      href={\`mailto:\${lead.email}\`}
                      className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100 hover:border-indigo-200 hover:bg-indigo-50/50 group transition-colors"
                    >
                      <div className="bg-white p-2 rounded-lg shadow-sm group-hover:text-indigo-600 text-slate-500">
                        <Mail size={16} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] font-bold text-slate-400 uppercase">
                          E-mail
                        </p>
                        <p className="text-sm font-bold text-slate-800 truncate">
                          {lead.email || 'Não informado'}
                        </p>
                      </div>
                    </a>
                  </>
                )}
              </div>
            </div>

            {/* Perfil e Interesses */}
            <div className="space-y-3">
              <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                Perfil de Interesse
              </h4>
              <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm space-y-4">
                {isEditingSidebar ? (
                  <div className="space-y-4">
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Orçamento Estimado</p>
                      <input
                        type="number"
                        value={sidebarForm.budget}
                        onChange={e => setSidebarForm(p => ({ ...p, budget: e.target.value }))}
                        className="w-full h-10 px-3 rounded-lg border border-slate-300 text-sm font-bold bg-white focus:border-indigo-500 outline-none"
                      />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Tipo de Imóvel</p>
                      <input
                        value={sidebarForm.type}
                        onChange={e => setSidebarForm(p => ({ ...p, type: e.target.value }))}
                        className="w-full h-10 px-3 rounded-lg border border-slate-300 text-sm font-bold bg-white focus:border-indigo-500 outline-none"
                        placeholder="Ex: Apartamento, Casa"
                      />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Bairro</p>
                      <input
                        value={sidebarForm.neighborhood}
                        onChange={e => setSidebarForm(p => ({ ...p, neighborhood: e.target.value }))}
                        className="w-full h-10 px-3 rounded-lg border border-slate-300 text-sm font-bold bg-white focus:border-indigo-500 outline-none"
                      />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Aptidões (separado por vírgula)</p>
                      <textarea
                        value={sidebarForm.aptitude_interest}
                        onChange={e => setSidebarForm(p => ({ ...p, aptitude_interest: e.target.value }))}
                        className="w-full h-16 px-3 py-2 rounded-lg border border-slate-300 text-sm font-bold bg-white focus:border-indigo-500 outline-none"
                        placeholder="Ex: Piscina, Varanda"
                      />
                    </div>
                  </div>
                ) : (
                  <>
                    <div>
                      <div className="flex items-center gap-2 text-slate-500 mb-1">
                        <Wallet size={14} />
                        <span className="text-xs font-bold">
                          Orçamento Estimado
                        </span>
                      </div>
                      <p className="text-lg font-black text-emerald-700">
                        {lead.budget
                          ? lead.budget.toLocaleString('pt-BR', {
                              style: 'currency',
                              currency: 'BRL',
                            })
                          : 'Não definido'}
                      </p>
                    </div>

                    {lead.preferences && (
                      <div className="pt-3 border-t border-slate-100 grid grid-cols-2 gap-3">
                        {lead.preferences.type && (
                          <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase mb-0.5">
                              Tipo
                            </p>
                            <p className="text-xs font-bold text-slate-700">
                              {lead.preferences.type}
                            </p>
                          </div>
                        )}
                        {lead.preferences.neighborhood && (
                          <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase mb-0.5">
                              Bairro
                            </p>
                            <p
                              className="text-xs font-bold text-slate-700 truncate"
                              title={lead.preferences.neighborhood}
                            >
                              {lead.preferences.neighborhood}
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {lead.aptitude_interest && lead.aptitude_interest.length > 0 && (
                      <div className="pt-3 border-t border-slate-100">
                        <p className="text-[10px] font-bold text-slate-400 uppercase mb-1.5">
                          Aptidões
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {lead.aptitude_interest.map((apt) => (
                            <span
                              key={apt}
                              className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md text-[10px] font-bold"
                            >
                              {apt}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* SLA e Próximos Passos */}
            <div className="space-y-3">
              <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                SLA & IA
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1.5 mb-1">
                    <Clock size={12} /> SLA
                  </p>
                  <p className={\`text-xs font-bold \${sla.labelClass}\`}>
                    {sla.label || 'Em dia'}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1.5 mb-1">
                    <BrainCircuit size={12} /> Intenção
                  </p>
                  <p
                    className="text-xs font-bold text-slate-700 truncate"
                    title={lead.ai_profile?.intent || 'Desconhecida'}
                  >
                    {lead.ai_profile?.intent || 'N/A'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Área Principal (Conteúdo das Abas) */}`;

content = content.replace(sidebarRegex, newSidebar);
fs.writeFileSync(file, content);
