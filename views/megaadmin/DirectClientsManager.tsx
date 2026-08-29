import { logger } from '@/utils/logger';
import React, { useEffect, useState } from 'react';
import { callApi } from '@/src/lib/api';
import {
  Building2,
  Search,
  Edit2,
  Ban,
  CheckCircle,
  Plus,
  X,
  Save,
  Trash2,
  Key,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'sonner';
import { useDialog } from '@/context/DialogContext';


interface DirectClient {
  id: string;
  name: string;
  slug?: string;
  status: string;
  owner_name?: string;
  owner_email?: string;
  created_at: string;
  niche?: string;
  tenant_count?: number;
                        } catch (err: any) {
                          logger.error(err);
                          toast.error(`Erro: ${err.message}`);
                        }
                      }}
                      className="p-1.5 text-purple-600 bg-purple-50 hover:bg-purple-100 rounded mr-2"
                      title="Acessar Como (Modo Suporte)"
                    >
                      <Key size={18} />
                    </button>
                    <button
                      onClick={() =>
                        deleteDirectClient(DirectClient.id, DirectClient.name)
                      }
                      className="p-1.5 text-red-500 rounded hover:bg-gray-100"
                      title="Excluir"
                    >
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-800">
                {setupInfo
                  ? 'Whitelabel Criado com Sucesso!'
                  : editingId
                    ? 'Editar DirectClient'
                    : 'Novo Whitelabel'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>

            {setupInfo ? (
              <div className="p-8 text-center space-y-6">
                <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle size={32} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">
                    Tudo pronto! Plataforma liberada.
                  </h3>
                  <p className="text-sm text-slate-500 mt-2">
                    O Whitelabel foi criado no plano{' '}
                    <strong className="text-purple-600">Enterprise</strong> com
                    todas as funções ativas.
                  </p>
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-left space-y-3">
                  <p className="text-xs font-bold text-slate-500 uppercase">
                    Link de Setup Guiado
                  </p>
                  <p className="text-sm text-slate-600 mb-2">
                    Envie este link para o dono do Whitelabel. Ele mesmo
                    configurará a senha, logo e cores:
                  </p>
                  <div className="flex items-center gap-2">
                    <input
                      readOnly
                      value={`${window.location.origin}/setup-whitelabel?email=${encodeURIComponent(setupInfo.email)}&t=${setupInfo.password}`}
                      className="flex-1 bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono text-slate-600 outline-none"
                    />
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(
                          `${window.location.origin}/setup-whitelabel?email=${encodeURIComponent(setupInfo.email)}&t=${setupInfo.password}`
                        );
                        toast.info('Link copiado!');
                      }}
                      className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm font-bold shrink-0"
                    >
                      Copiar
                    </button>
                  </div>
                </div>

                <button
                  onClick={() => setIsModalOpen(false)}
                  className="w-full py-3 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-xl font-bold transition-colors"
                >
                  Fechar Janela
                </button>
              </div>
            ) : (
              <form onSubmit={handleSave} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nome da Empresa *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                    placeholder="Ex: Imobiliária Central"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Slug (URL)
                  </label>
                  <input
                    type="text"
                    value={formData.slug}
                    onChange={(e) =>
                      setFormData({ ...formData, slug: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                    placeholder="ex: imob-central"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nome do Responsável
                  </label>
                  <input
                    type="text"
                    value={formData.owner_name}
                    onChange={(e) =>
                      setFormData({ ...formData, owner_name: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email do Responsável *
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.owner_email}
                    onChange={(e) =>
                      setFormData({ ...formData, owner_email: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                  />
                </div>

                {!editingId && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Senha Provisória (Opcional)
                    </label>
                    <input
                      type="text"
                      value={formData.password}
                      onChange={(e) =>
                        setFormData({ ...formData, password: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                      placeholder="Se vazio, será gerada automaticamente"
                    />
                    <p className="text-xs text-gray-400 mt-1">
                      Essa senha não precisa ser enviada. Usaremos um Link de
                      Ativação Guiado.
                    </p>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nicho Padrão
                  </label>
                  <select
                    value={formData.niche}
                    onChange={(e) =>
                      setFormData({ ...formData, niche: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                  >
                    <option value="both">
                      Ambos (Urbano e Rural) - Completo
                    </option>
                    <option value="traditional">
                      Apenas Urbano / Tradicional
                    </option>
                    <option value="rural">Apenas Rural</option>
                  </select>
                </div>

                {!editingId && (
                  <div className="bg-purple-50 border border-purple-100 rounded-xl p-4 flex gap-3 items-start">
                    <CheckCircle
                      size={20}
                      className="text-purple-600 shrink-0 mt-0.5"
                    />
                    <div>
                      <h4 className="text-sm font-bold text-purple-900">
                        Plano Enterprise Ativo
                      </h4>
                      <p className="text-xs text-purple-700 mt-1">
                        Ao criar, esta plataforma já nascerá com todas as
                        funcionalidades liberadas e sem restrições.
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg font-medium"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={formLoading}
                    className="flex items-center gap-2 px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium disabled:opacity-60"
                  >
                    <Save size={18} />
                    {formLoading
                      ? 'Processando...'
                      : editingId
                        ? 'Salvar'
                        : 'Criar & Gerar Link'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default DirectClientsManager;
