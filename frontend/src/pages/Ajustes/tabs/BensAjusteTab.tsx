import { useEffect, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { GradeSimples } from '@/components/ui/GradeSimples';
import type { ColunaDef } from '@/hooks/useResizableColumns';
import { dataBr, formatarMoeda } from '@/lib/masks';
import { extrairMensagemErro } from '@/services/http';
import { importarBensAjuste, limparBensAjuste, listarBensAjuste } from '@/services/ajusteCsv.service';
import type { BemAjuste } from '@/types/ajusteCsv';
import { ImportadorCsv } from './ImportadorCsv';
import { ConfirmarExclusao } from './TermosAditivosTab';

const COLUNAS: ColunaDef[] = [
  { key: 'identificador', label: 'Identificador', width: 220, sortKey: 'identificador' },
  { key: 'data', label: 'Data', width: 140, sortKey: 'data' },
  { key: 'codigo', label: 'Código', width: 160, sortKey: 'codigo' },
  { key: 'valor', label: 'Valor', width: 170, align: 'right', sortKey: 'valor' },
];

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

      {/* Sem coluna de Ações: o conteúdo vem do CSV e não é editado linha a
          linha — a única ação é "Limpar tudo", no topo. */}
      <GradeSimples
        storageKey="@SolucaoTS:grid:bensAjuste:v1"
        colunas={COLUNAS}
        dados={lista}
        chave={(b) => b.id}
        carregando={carregando}
        erro={erro}
        vazio="Importe um CSV para preencher os bens cedidos deste ajuste."
        valorOrdenacao={(campo, b) => {
          if (campo === 'identificador') return b.identificador;
          if (campo === 'data') return b.data;
          if (campo === 'codigo') return b.codigo;
          if (campo === 'valor') return b.valor;
          return null;
        }}
        renderCell={(coluna, b) => {
          switch (coluna) {
            case 'identificador':
              return <span className="block truncate font-mono text-xs text-ink-800 dark:text-ink-100">{b.identificador}</span>;
            case 'data':
              return <span className="block truncate text-ink-600 dark:text-ink-300">{dataBr(b.data)}</span>;
            case 'codigo':
              return <span className="block truncate text-ink-600 dark:text-ink-300">{b.codigo}</span>;
            case 'valor':
              return <span className="block truncate tabular-nums text-ink-700 dark:text-ink-200">{formatarMoeda(b.valor)}</span>;
            default:
              return null;
          }
        }}
      />

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
