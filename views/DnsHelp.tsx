import React from 'react';
import { AlertTriangle, CheckCircle2, Copy, Globe, Mail, Server } from 'lucide-react';
import { PLATFORM_IP } from '../utils/platform';

const DnsHelp: React.FC = () => {
  const copy = (value: string) => navigator.clipboard?.writeText(value);

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900">
      <div className="mx-auto max-w-4xl space-y-6">
        <header className="rounded-lg border border-slate-200 bg-white p-6">
          <div className="flex items-center gap-3">
            <span className="rounded-lg bg-red-50 p-2 text-red-600">
              <Globe size={24} />
            </span>
            <div>
              <h1 className="text-2xl font-bold">Guia DNS ImobFluow</h1>
              <p className="text-sm text-slate-500">
                Como apontar apenas o site do cliente para o servidor, sem mexer no e-mail.
              </p>
            </div>
          </div>
        </header>

        <section className="rounded-lg border border-slate-200 bg-white p-6">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-bold">
            <Server size={18} /> IP do servidor
          </h2>
          <div className="flex flex-col gap-3 rounded-lg bg-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between">
            <code className="font-mono text-lg font-bold text-slate-950">{PLATFORM_IP}</code>
            <button
              type="button"
              onClick={() => copy(PLATFORM_IP)}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 py-2 text-sm font-bold text-white"
            >
              <Copy size={15} /> Copiar IP
            </button>
          </div>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-6">
          <h2 className="mb-4 text-lg font-bold">Registros que devem apontar para a ImobFluow</h2>
          <div className="overflow-hidden rounded-lg border border-slate-200">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-100 text-xs font-bold uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Nome</th>
                  <th className="px-4 py-3">Tipo</th>
                  <th className="px-4 py-3">Valor</th>
                  <th className="px-4 py-3">Uso</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr>
                  <td className="px-4 py-3 font-mono">@ ou dominio raiz</td>
                  <td className="px-4 py-3 font-mono">A</td>
                  <td className="px-4 py-3 font-mono">{PLATFORM_IP}</td>
                  <td className="px-4 py-3">Abre exemplo.com.br</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-mono">www</td>
                  <td className="px-4 py-3 font-mono">A</td>
                  <td className="px-4 py-3 font-mono">{PLATFORM_IP}</td>
                  <td className="px-4 py-3">Abre www.exemplo.com.br</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-sm text-slate-600">
            Alternativa: o registro <span className="font-mono">www</span> pode ser CNAME para o dominio raiz,
            desde que o dominio raiz esteja apontando para o IP acima.
          </p>
        </section>

        <section className="rounded-lg border border-amber-200 bg-amber-50 p-6">
          <h2 className="mb-3 flex items-center gap-2 text-lg font-bold text-amber-950">
            <Mail size={18} /> Nao altere registros de e-mail
          </h2>
          <p className="text-sm leading-relaxed text-amber-900">
            Para manter o e-mail funcionando na hospedagem atual, nao mexa em registros MX, TXT SPF, DKIM,
            mail, smtp, pop, webmail, ftp, ns1 ou ns2. Altere apenas o A do dominio raiz e o A/CNAME do www.
          </p>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border border-slate-200 bg-white p-5">
            <h3 className="mb-3 flex items-center gap-2 font-bold">
              <CheckCircle2 size={17} className="text-green-600" /> Quando estiver correto
            </h3>
            <p className="text-sm text-slate-600">
              O DNS checker vai mostrar o IP encontrado como {PLATFORM_IP}. Depois disso o certificado SSL pode levar
              alguns minutos para ficar pronto no servidor.
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-5">
            <h3 className="mb-3 flex items-center gap-2 font-bold">
              <AlertTriangle size={17} className="text-amber-600" /> Quando ainda estiver errado
            </h3>
            <p className="text-sm text-slate-600">
              Se aparecer outro IP, como o IP da hospedagem antiga, edite o registro A correspondente. O TTL 3600 pode
              levar ate algumas horas para propagar.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
};

export default DnsHelp;
