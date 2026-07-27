import { Plus, Search, SlidersHorizontal, MoreHorizontal } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

type Status = 'Em elaboração' | 'Enviado';
type Tipo = 'Convênio' | 'Termo de Colaboração' | 'Contrato de Gestão' | 'Termo de Fomento';

interface Ajuste {
  codigo: string;
  entidade: string;
  tipo: Tipo;
  valor: string;
  assinatura: string;
  status: Status;
}

const ajustes: Ajuste[] = [
  { codigo: '2025000000000023', entidade: 'Instituto Vida e Saúde', tipo: 'Convênio', valor: 'R$ 1.522.632,45', assinatura: '12/03/2025', status: 'Enviado' },
  { codigo: '2025000000000040', entidade: 'Lar São Vicente de Paulo', tipo: 'Convênio', valor: 'R$ 480.000,00', assinatura: '02/06/2025', status: 'Em elaboração' },
  { codigo: '2025000000000011', entidade: 'APAE Adamantina', tipo: 'Termo de Colaboração', valor: 'R$ 312.000,00', assinatura: '18/01/2025', status: 'Enviado' },
  { codigo: '2025000000000002', entidade: 'OS Saúde Regional', tipo: 'Contrato de Gestão', valor: 'R$ 8.900.000,00', assinatura: '05/01/2025', status: 'Enviado' },
  { codigo: '2025000000000031', entidade: 'Associação Bem Viver', tipo: 'Termo de Fomento', valor: 'R$ 155.400,00', assinatura: '22/04/2025', status: 'Em elaboração' },
];

const tipoTone: Record<Tipo, 'brand' | 'neutral' | 'success' | 'warning'> = {
  'Convênio': 'brand',
  'Termo de Colaboração': 'success',
  'Contrato de Gestão': 'warning',
  'Termo de Fomento': 'neutral',
};

export function Ajustes() {
  return (
    <>
      <PageHeader
        title="Ajustes"
        subtitle="Convênios, termos e contratos firmados com o Terceiro Setor."
        actions={
          <Button>
            <Plus className="h-4 w-4" />
            Novo Ajuste
          </Button>
        }
      />

      <Card>
        {/* Barra de filtros */}
        <div className="flex flex-col gap-3 border-b border-ink-100 p-4 dark:border-ink-800 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative max-w-xs flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
            <input
              type="text"
              placeholder="Buscar por entidade ou código..."
              className="focus-ring h-9 w-full rounded-lg border border-ink-200 bg-ink-50 pl-9 pr-3 text-sm text-ink-800 placeholder:text-ink-400 dark:border-ink-800 dark:bg-ink-900 dark:text-ink-100"
            />
          </div>
          <Button variant="secondary" size="sm">
            <SlidersHorizontal className="h-4 w-4" />
            Filtros
          </Button>
        </div>

        {/* Tabela */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="text-xs font-semibold uppercase tracking-wider text-ink-400">
                <th className="px-5 py-3 font-semibold">Código do Ajuste</th>
                <th className="px-5 py-3 font-semibold">Entidade</th>
                <th className="px-5 py-3 font-semibold">Tipo</th>
                <th className="px-5 py-3 font-semibold">Valor Global</th>
                <th className="px-5 py-3 font-semibold">Assinatura</th>
                <th className="px-5 py-3 font-semibold">Situação</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100 dark:divide-ink-800">
              {ajustes.map((a) => (
                <tr key={a.codigo} className="transition-colors hover:bg-ink-50/70 dark:hover:bg-ink-800/40">
                  <td className="px-5 py-3.5 font-mono text-xs text-ink-500 dark:text-ink-400">{a.codigo}</td>
                  <td className="px-5 py-3.5 font-medium text-ink-800 dark:text-ink-100">{a.entidade}</td>
                  <td className="px-5 py-3.5">
                    <Badge tone={tipoTone[a.tipo]}>{a.tipo}</Badge>
                  </td>
                  <td className="px-5 py-3.5 tabular-nums text-ink-700 dark:text-ink-200">{a.valor}</td>
                  <td className="px-5 py-3.5 text-ink-500 dark:text-ink-400">{a.assinatura}</td>
                  <td className="px-5 py-3.5">
                    <Badge tone={a.status === 'Enviado' ? 'success' : 'warning'}>{a.status}</Badge>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <button className="focus-ring rounded-lg p-1.5 text-ink-400 hover:bg-ink-100 hover:text-ink-700 dark:hover:bg-ink-800 dark:hover:text-ink-200">
                      <MoreHorizontal className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Rodapé da tabela */}
        <div className="flex items-center justify-between border-t border-ink-100 px-5 py-3 text-xs text-ink-400 dark:border-ink-800">
          <span>Mostrando 5 de 28 ajustes</span>
          <div className="flex gap-1">
            <Button variant="ghost" size="sm" disabled>Anterior</Button>
            <Button variant="secondary" size="sm">Próximo</Button>
          </div>
        </div>
      </Card>
    </>
  );
}
