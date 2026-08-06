import { useEffect, useState } from 'react';
import { Loader2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { formatarMoeda, nomeMes } from '@/lib/masks';
import { extrairMensagemErro } from '@/services/http';
import { importarCronograma, limparCronograma, listarCronograma } from '@/services/ajusteCsv.service';
import type { CronogramaItem } from '@/types/ajusteCsv';
import { ImportadorCsv } from './ImportadorCsv';
import { ConfirmarExclusao } from './TermosAditivosTab';

export function CronogramaTab({ ajusteId }: { ajusteId: string }) {
  const [lista, setLista] = useState<CronogramaItem[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [confirmarLimpar, setConfirmarLimpar] = useState(false);

  useEffect(() => {
    let vivo = true;
    setCarregando(true);
    listarCronograma(ajusteId)
      .then((r) => vivo && setLista(r))
      .catch((e) => vivo && setErro(extrairMensagemErro(e, 'Falha ao carregar o cronograma.')))
      .finally(() => vivo && setCarregando(false));
    return () => {
      vivo = false;
    };
  }, [ajusteId, refreshKey]);

  const recarregar = () => setRefreshKey((k) => k + 1);
  const total = lista.reduce((s, i) => s + i.valor, 0);

  return (
    <div className="space-y-4">
      <ImportadorCsv
        dica="CSV com colunas: ano; mês; valor (uma linha por competência)."
        onImportar={(f) => importarCronograma(ajusteId, f)}
        onConcluido={recarregar}
      />

      <div className="flex items-center justify-between">
        <p className="text-sm text-ink-500 dark:text-ink-400">
          {lista.length > 0 ? `${lista.length} competência(s) · total ${formatarMoeda(total)}` : 'Nenhuma competência importada.'}
        </p>
        {lista.length > 0 && (
          <Button variant="secondary" size="sm" onClick={() => setConfirmarLimpar(true)}>
            <Trash2 className="h-4 w-4" />
            Limpar tudo
          </Button>
        )}
      </div>

      <div className="overflow-hidden rounded-xl border border-ink-200/70 dark:border-ink-800/70">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-ink-100 text-xs font-semibold text-ink-500 dark:border-ink-800 dark:text-ink-400">
              <th className="px-4 py-2.5">Ano</th>
              <th className="px-4 py-2.5">Mês</th>
              <th className="px-4 py-2.5 text-right">Valor</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-100 dark:divide-ink-800">
            {carregando ? (
              <tr>
                <td colSpan={3} className="py-10 text-center">
                  <Loader2 className="mx-auto h-5 w-5 animate-spin text-brand-500" />
                </td>
              </tr>
            ) : erro ? (
              <tr>
                <td colSpan={3} className="py-10 text-center text-sm text-red-500">{erro}</td>
              </tr>
            ) : lista.length === 0 ? (
              <tr>
                <td colSpan={3} className="py-10 text-center text-sm text-ink-400">
                  Importe um CSV para preencher o cronograma de desembolso.
                </td>
              </tr>
            ) : (
              lista.map((i) => (
                <tr key={i.id} className="hover:bg-ink-50/70 dark:hover:bg-ink-800/40">
                  <td className="px-4 py-2.5 text-ink-600 dark:text-ink-300">{i.ano}</td>
                  <td className="px-4 py-2.5 text-ink-700 dark:text-ink-200">{nomeMes(i.mes)}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-ink-700 dark:text-ink-200">{formatarMoeda(i.valor)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <ConfirmarExclusao
        aberto={confirmarLimpar}
        rotulo="todo o cronograma deste ajuste"
        onCancel={() => setConfirmarLimpar(false)}
        onConfirm={async () => {
          await limparCronograma(ajusteId);
          setConfirmarLimpar(false);
          recarregar();
        }}
      />
    </div>
  );
}
