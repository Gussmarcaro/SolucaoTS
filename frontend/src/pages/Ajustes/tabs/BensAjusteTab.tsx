import { useEffect, useState } from 'react';
import { Loader2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { dataBr, formatarMoeda } from '@/lib/masks';
import { extrairMensagemErro } from '@/services/http';
import { importarBensAjuste, limparBensAjuste, listarBensAjuste } from '@/services/ajusteCsv.service';
import type { BemAjuste } from '@/types/ajusteCsv';
import { ImportadorCsv } from './ImportadorCsv';
import { ConfirmarExclusao } from './TermosAditivosTab';

export function BensAjusteTab({ ajusteId }: { ajusteId: string }) {
  const [lista, setLista] = useState<BemAjuste[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [confirmarLimpar, setConfirmarLimpar] = useState(false);

  useEffect(() => {
    let vivo = true;
    setCarregando(true);
    listarBensAjuste(ajusteId)
      .then((r) => vivo && setLista(r))
      .catch((e) => vivo && setErro(extrairMensagemErro(e, 'Falha ao carregar os bens.')))
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
        dica="CSV com colunas: identificador; data (DD/MM/AAAA); valor; código."
        onImportar={(f) => importarBensAjuste(ajusteId, f)}
        onConcluido={recarregar}
      />

      <div className="flex items-center justify-between">
        <p className="text-sm text-ink-500 dark:text-ink-400">
          {lista.length > 0 ? `${lista.length} bem(ns) · total ${formatarMoeda(total)}` : 'Nenhum bem importado.'}
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
              <th className="px-4 py-2.5">Identificador</th>
              <th className="px-4 py-2.5">Data</th>
              <th className="px-4 py-2.5">Código</th>
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
                  Importe um CSV para preencher os bens cedidos deste ajuste.
                </td>
              </tr>
            ) : (
              lista.map((b) => (
                <tr key={b.id} className="hover:bg-ink-50/70 dark:hover:bg-ink-800/40">
                  <td className="px-4 py-2.5 font-mono text-xs text-ink-800 dark:text-ink-100">{b.identificador}</td>
                  <td className="px-4 py-2.5 text-ink-600 dark:text-ink-300">{dataBr(b.data)}</td>
                  <td className="px-4 py-2.5 text-ink-600 dark:text-ink-300">{b.codigo}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-ink-700 dark:text-ink-200">{formatarMoeda(b.valor)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <ConfirmarExclusao
        aberto={confirmarLimpar}
        rotulo="todos os bens deste ajuste"
        onCancel={() => setConfirmarLimpar(false)}
        onConfirm={async () => {
          await limparBensAjuste(ajusteId);
          setConfirmarLimpar(false);
          recarregar();
        }}
      />
    </div>
  );
}
