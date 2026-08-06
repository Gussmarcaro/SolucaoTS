import { useEffect, useState } from 'react';
import { Loader2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { formatarMoeda, nomeMes } from '@/lib/masks';
import { extrairMensagemErro } from '@/services/http';
import { importarPlano, limparPlano, listarPlano } from '@/services/ajusteCsv.service';
import type { PlanoItem } from '@/types/ajusteCsv';
import { ImportadorCsv } from './ImportadorCsv';
import { ConfirmarExclusao } from './TermosAditivosTab';

export function PlanoAplicacaoTab({ ajusteId }: { ajusteId: string }) {
  const [lista, setLista] = useState<PlanoItem[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [confirmarLimpar, setConfirmarLimpar] = useState(false);

  useEffect(() => {
    let vivo = true;
    setCarregando(true);
    listarPlano(ajusteId)
      .then((r) => vivo && setLista(r))
      .catch((e) => vivo && setErro(extrairMensagemErro(e, 'Falha ao carregar o plano.')))
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
        dica="CSV com colunas: categoria; subcategoria; ano; mês; valor; descrição (opcional)."
        onImportar={(f) => importarPlano(ajusteId, f)}
        onConcluido={recarregar}
      />

      <div className="flex items-center justify-between">
        <p className="text-sm text-ink-500 dark:text-ink-400">
          {lista.length > 0 ? `${lista.length} item(ns) · total ${formatarMoeda(total)}` : 'Nenhum item importado.'}
        </p>
        {lista.length > 0 && (
          <Button variant="secondary" size="sm" onClick={() => setConfirmarLimpar(true)}>
            <Trash2 className="h-4 w-4" />
            Limpar tudo
          </Button>
        )}
      </div>

      <div className="overflow-x-auto rounded-xl border border-ink-200/70 dark:border-ink-800/70">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b border-ink-100 text-xs font-semibold text-ink-500 dark:border-ink-800 dark:text-ink-400">
              <th className="px-4 py-2.5">Categoria</th>
              <th className="px-4 py-2.5">Subcategoria</th>
              <th className="px-4 py-2.5">Competência</th>
              <th className="px-4 py-2.5 text-right">Valor</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-100 dark:divide-ink-800">
            {carregando ? (
              <tr>
                <td colSpan={4} className="py-10 text-center">
                  <Loader2 className="mx-auto h-5 w-5 animate-spin text-brand-500" />
                </td>
              </tr>
            ) : erro ? (
              <tr>
                <td colSpan={4} className="py-10 text-center text-sm text-red-500">{erro}</td>
              </tr>
            ) : lista.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-10 text-center text-sm text-ink-400">
                  Importe um CSV para preencher o plano de aplicação.
                </td>
              </tr>
            ) : (
              lista.map((i) => (
                <tr key={i.id} className="hover:bg-ink-50/70 dark:hover:bg-ink-800/40">
                  <td className="px-4 py-2.5 text-ink-700 dark:text-ink-200" title={i.categoria}>{i.categoria}</td>
                  <td className="px-4 py-2.5 text-ink-600 dark:text-ink-300" title={i.subcategoria}>
                    {i.subcategoria}
                    {i.descricao && <span className="ml-1 text-xs text-ink-400">· {i.descricao}</span>}
                  </td>
                  <td className="px-4 py-2.5 text-ink-600 dark:text-ink-300">{nomeMes(i.mes)}/{i.ano}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-ink-700 dark:text-ink-200">{formatarMoeda(i.valor)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <ConfirmarExclusao
        aberto={confirmarLimpar}
        rotulo="todo o plano de aplicação deste ajuste"
        onCancel={() => setConfirmarLimpar(false)}
        onConfirm={async () => {
          await limparPlano(ajusteId);
          setConfirmarLimpar(false);
          recarregar();
        }}
      />
    </div>
  );
}
