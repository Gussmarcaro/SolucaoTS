import {
  Plus,
  Send,
  FileCheck2,
  FileClock,
  FileX2,
  RefreshCcw,
  ArrowRight,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatCard } from '@/components/ui/StatCard';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

type Estado = 'Armazenado' | 'Rejeitado' | 'Enviado' | 'Em elaboração';

const estadoTone: Record<Estado, 'success' | 'danger' | 'brand' | 'warning'> = {
  Armazenado: 'success',
  Rejeitado: 'danger',
  Enviado: 'brand',
  'Em elaboração': 'warning',
};

const prestacoes: { ajuste: string; entidade: string; periodo: string; protocolo: string; estado: Estado }[] = [
  { ajuste: 'Convênio 018/2025', entidade: 'Casa de Apoio Esperança', periodo: '2025 / mês 12', protocolo: '2025-7107-0093', estado: 'Armazenado' },
  { ajuste: 'Convênio 015/2025', entidade: 'Instituto Renascer', periodo: '2025 / mês 12', protocolo: '2025-7107-0088', estado: 'Rejeitado' },
  { ajuste: 'Termo Colab. 011/2025', entidade: 'APAE Adamantina', periodo: '2025 (anual)', protocolo: '2025-7107-0090', estado: 'Enviado' },
  { ajuste: 'Convênio 023/2025', entidade: 'Instituto Vida e Saúde', periodo: '2025 / mês 8', protocolo: '—', estado: 'Em elaboração' },
];

export function PrestacaoContas() {
  return (
    <>
      <PageHeader
        title="Prestação de Contas"
        subtitle="Montagem, validação e transmissão dos documentos à API do Audesp (TCESP)."
        actions={
          <Button>
            <Plus className="h-4 w-4" />
            Nova Prestação
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Armazenadas" value="21" icon={FileCheck2} tone="emerald" />
        <StatCard label="Em elaboração" value="2" icon={FileClock} tone="amber" />
        <StatCard label="Aguardando retorno" value="1" icon={RefreshCcw} tone="brand" />
        <StatCard label="Rejeitadas" value="1" icon={FileX2} tone="red" hint="Requer correção e reenvio" />
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Prestações recentes</CardTitle>
          <Button variant="ghost" size="sm">
            Ver todas
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </CardHeader>
        <CardBody className="pt-3">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="text-xs font-semibold uppercase tracking-wider text-ink-400">
                  <th className="px-2 py-3">Ajuste</th>
                  <th className="px-2 py-3">Entidade</th>
                  <th className="px-2 py-3">Período</th>
                  <th className="px-2 py-3">Protocolo</th>
                  <th className="px-2 py-3">Estado</th>
                  <th className="px-2 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100 dark:divide-ink-800">
                {prestacoes.map((p) => (
                  <tr key={p.ajuste + p.protocolo} className="transition-colors hover:bg-ink-50/70 dark:hover:bg-ink-800/40">
                    <td className="px-2 py-3.5 font-medium text-ink-800 dark:text-ink-100">{p.ajuste}</td>
                    <td className="px-2 py-3.5 text-ink-600 dark:text-ink-300">{p.entidade}</td>
                    <td className="px-2 py-3.5 text-ink-500 dark:text-ink-400">{p.periodo}</td>
                    <td className="px-2 py-3.5 font-mono text-xs text-ink-500 dark:text-ink-400">{p.protocolo}</td>
                    <td className="px-2 py-3.5">
                      <Badge tone={estadoTone[p.estado]}>{p.estado}</Badge>
                    </td>
                    <td className="px-2 py-3.5 text-right">
                      {p.estado === 'Em elaboração' ? (
                        <Button size="sm">
                          <Send className="h-3.5 w-3.5" />
                          Transmitir
                        </Button>
                      ) : p.estado === 'Rejeitado' ? (
                        <Button variant="secondary" size="sm">
                          <RefreshCcw className="h-3.5 w-3.5" />
                          Corrigir
                        </Button>
                      ) : (
                        <Button variant="ghost" size="sm">Detalhes</Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>
    </>
  );
}
