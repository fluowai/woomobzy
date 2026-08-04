import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '../../services/supabase';
import { woosignService } from '../../services/woosign';
import type { Wallet, CreditPackage } from '../../services/woosign';

const WooSignWallets: React.FC = () => {
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [packages, setPackages] = useState<CreditPackage[]>([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [walletsData, packagesData] = await Promise.all([
        woosignService.listWallets(),
        woosignService.listCreditPackages(),
      ]);
      setWallets(walletsData);
      setPackages(packagesData);
    } catch (error) {
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="p-6 space-y-8">
      <div>
        <h1 className="text-2xl font-bold">WooSign</h1>
        <p className="text-slate-500 text-sm">Wallets e pacotes de crédito</p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-semibold">Wallets</h2>
          <button
            onClick={load}
            className="text-sm text-blue-600 hover:text-blue-700"
          >
            Atualizar
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="text-left px-4 py-3">ID</th>
                <th className="text-left px-4 py-3">Organização</th>
                <th className="text-right px-4 py-3">Saldo</th>
                <th className="text-right px-4 py-3">Reservado</th>
                <th className="text-right px-4 py-3">Moeda</th>
              </tr>
            </thead>
            <tbody>
              {wallets.map((wallet) => (
                <tr key={wallet.id} className="border-t border-slate-100">
                  <td className="px-4 py-3 font-mono text-xs">{wallet.id}</td>
                  <td className="px-4 py-3">{wallet.organizationId}</td>
                  <td className="px-4 py-3 text-right">{wallet.balance}</td>
                  <td className="px-4 py-3 text-right">{wallet.reservedBalance}</td>
                  <td className="px-4 py-3 text-right">{wallet.currency}</td>
                </tr>
              ))}
              {!loading && wallets.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-slate-500">
                    Nenhuma wallet encontrada.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h2 className="font-semibold">Pacotes de crédito</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="text-left px-4 py-3">Nome</th>
                <th className="text-left px-4 py-3">Créditos</th>
                <th className="text-right px-4 py-3">Preço</th>
                <th className="text-left px-4 py-3">Moeda</th>
                <th className="text-left px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {packages.map((pkg) => (
                <tr key={pkg.id} className="border-t border-slate-100">
                  <td className="px-4 py-3 font-medium">{pkg.name}</td>
                  <td className="px-4 py-3">{pkg.creditAmount}</td>
                  <td className="px-4 py-3 text-right">{pkg.price}</td>
                  <td className="px-4 py-3">{pkg.currency}</td>
                  <td className="px-4 py-3">{pkg.isActive ? 'Ativo' : 'Inativo'}</td>
                </tr>
              ))}
              {!loading && packages.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-slate-500">
                    Nenhum pacote encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default WooSignWallets;
