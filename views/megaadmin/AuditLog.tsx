import React, { useState, useEffect } from 'react';
import {
  ScrollText,
  Search,
  Filter,
  Calendar,
  User,
  Building2,
  Eye,
} from 'lucide-react';
import { supabase } from '../../services/supabase';

interface AuditEntry {
  id: string;
  organization_id: string;
  user_id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  old_data: any;
  new_data: any;
  ip_address: string;
  created_at: string;
}

const AuditLog: React.FC = () => {
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [filter, setFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState<AuditEntry | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data } = await supabase
        .from('audit_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      setLogs(data || []);
      setLoading(false);
    };
    load();
  }, []);

  const actionColors: Record<string, string> = {
    create: 'bg-emerald-100 text-emerald-700',
    update: 'bg-blue-100 text-blue-700',
    delete: 'bg-red-100 text-red-700',
    login: 'bg-purple-100 text-purple-700',
    export: 'bg-amber-100 text-amber-700',
  };

  const filteredLogs = logs.filter((l) => {
    const matchesSearch =
      !filter ||
      l.action.toLowerCase().includes(filter.toLowerCase()) ||
      l.entity_type?.toLowerCase().includes(filter.toLowerCase());
    const matchesAction = !actionFilter || l.action === actionFilter;
    return matchesSearch && matchesAction;
  });

  const actions = [...new Set(logs.map((l) => l.action))];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
          <ScrollText className="text-amber-600" size={28} />
          Audit Log
        </h1>
        <p className="text-gray-500 mt-1">
          Registro global de ações e mudanças na plataforma.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          {
            label: 'Total de Eventos',
            value: String(logs.length),
            color: 'bg-slate-500',
          },
          {
            label: 'Criações',
            value: String(logs.filter((l) => l.action === 'create').length),
            color: 'bg-emerald-500',
          },
          {
            label: 'Atualizações',
            value: String(logs.filter((l) => l.action === 'update').length),
            color: 'bg-blue-500',
          },
          {
            label: 'Exclusões',
            value: String(logs.filter((l) => l.action === 'delete').length),
            color: 'bg-red-500',
          },
        ].map((s, i) => (
          <div
            key={i}
            className="bg-white rounded-xl shadow-sm border border-gray-100 p-6"
          >
            <p className="text-sm font-medium text-gray-500 mb-1">{s.label}</p>
            <p className="text-2xl font-bold text-gray-900">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2 flex-1 min-w-[200px]">
          <Search size={18} className="text-gray-400" />
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Buscar ação ou entidade..."
            className="flex-1 outline-none text-sm"
          />
        </div>
        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="px-3 py-2 bg-gray-50 rounded-lg border border-gray-200 text-sm outline-none"
        >
          <option value="">Todas as ações</option>
          {actions.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
      </div>

      {/* Log Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-6 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">
                Data
              </th>
              <th className="text-left px-6 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">
                Ação
              </th>
              <th className="text-left px-6 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">
                Entidade
              </th>
              <th className="text-left px-6 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">
                IP
              </th>
              <th className="text-left px-6 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">
                Detalhes
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="text-center py-8 text-gray-400">
                  Carregando...
                </td>
              </tr>
            ) : filteredLogs.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-12 text-gray-400">
                  <ScrollText
                    className="mx-auto text-gray-300 mb-3"
                    size={40}
                  />
                  <p className="font-medium">Nenhum evento registrado</p>
                  <p className="text-xs mt-1">
                    O audit log registrará automaticamente as ações dos
                    usuários.
                  </p>
                </td>
              </tr>
            ) : (
              filteredLogs.map((log) => (
                <tr
                  key={log.id}
                  className="border-b border-gray-100 hover:bg-gray-50 transition-all"
                >
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {new Date(log.created_at).toLocaleString('pt-BR')}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`text-xs font-bold px-2 py-1 rounded-full uppercase tracking-wider ${actionColors[log.action] || 'bg-gray-100 text-gray-600'}`}
                    >
                      {log.action}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700 font-medium">
                    {log.entity_type || '—'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-400 font-mono">
                    {log.ip_address || '—'}
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => setSelectedLog(log)}
                      className="p-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-all"
                    >
                      <Eye size={16} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Detail Modal */}
      {selectedLog && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={() => setSelectedLog(null)}
        >
          <div
            className="bg-white rounded-2xl p-8 w-full max-w-lg shadow-2xl max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-bold text-gray-800 mb-4">
              Detalhes do Evento
            </h3>
            <div className="space-y-3 text-sm">
              <div>
                <span className="font-bold text-gray-500">Ação:</span>{' '}
                <span className="text-gray-800">{selectedLog.action}</span>
              </div>
              <div>
                <span className="font-bold text-gray-500">Entidade:</span>{' '}
                <span className="text-gray-800">{selectedLog.entity_type}</span>
              </div>
              <div>
                <span className="font-bold text-gray-500">ID:</span>{' '}
                <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                  {selectedLog.entity_id}
                </code>
              </div>
              <div>
                <span className="font-bold text-gray-500">Data:</span>{' '}
                <span className="text-gray-800">
                  {new Date(selectedLog.created_at).toLocaleString('pt-BR')}
                </span>
              </div>
              {selectedLog.old_data && (
                <div>
                  <span className="font-bold text-gray-500">
                    Dados Anteriores:
                  </span>
                  <pre className="mt-1 bg-red-50 p-3 rounded-lg text-xs overflow-x-auto">
                    {JSON.stringify(selectedLog.old_data, null, 2)}
                  </pre>
                </div>
              )}
              {selectedLog.new_data && (
                <div>
                  <span className="font-bold text-gray-500">Dados Novos:</span>
                  <pre className="mt-1 bg-green-50 p-3 rounded-lg text-xs overflow-x-auto">
                    {JSON.stringify(selectedLog.new_data, null, 2)}
                  </pre>
                </div>
              )}
            </div>
            <button
              onClick={() => setSelectedLog(null)}
              className="w-full mt-6 bg-gray-100 text-gray-600 py-3 rounded-xl font-bold text-sm hover:bg-gray-200 transition-all"
            >
              Fechar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AuditLog;
