import { useEffect, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { GradeSimples } from '@/components/ui/GradeSimples';
import type { ColunaDef } from '@/hooks/useResizableColumns';
import { formatarMoeda, nomeMes } from '@/lib/masks';
import { extrairMensagemErro } from '@/services/http';
import { importarPlano, limparPlano, listarPlano } from '@/services/ajusteCsv.service';
import type { PlanoItem } from '@/types/ajusteCsv';
import { ImportadorCsv } from './ImportadorCsv';
import { ConfirmarExclusao } from './TermosAditivosTab';

const COLUNAS: ColunaDef[] = [
  { key: 'categoria', label: 'Categoria', width: 220, sortKey: 'categoria' },
  { key: 'subcategoria', label: 'Subcategoria', width: 260, sortKey: 'subcategoria' },
  { key: 'competencia', label: 'Competência', width: 150, sortKey: 'competencia' },
  { key: 'valor', label: 'Valor', width: 170, align: 'right', sortKey: 'valor' },
];

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

      {/* Sem coluna de Ações: o conteúdo vem do CSV e não é editado linha a
          linha — a única ação é "Limpar tudo", no topo. */}
      <GradeSimples
        storageKey="@SolucaoTS:grid:planoAplicacao:v1"
        colunas={COLUNAS}
        dados={lista}
        chave={(i) => i.id}
        carregando={carregando}
        erro={erro}
        vazio="Importe um CSV para preencher o plano de aplicação."
        valorOrdenacao={(campo, i) => {
          if (campo === 'categoria') return i.categoria;
          if (campo === 'subcategoria') return i.subcategoria;
          if (campo === 'competencia') return i.ano * 100 + i.mes;
          if (campo === 'valor') return i.valor;
          return null;
        }}
        renderCell={(coluna, i) => {
          switch (coluna) {
            case 'categoria':
              return <span className="block truncate text-ink-700 dark:text-ink-200" title={i.categoria}>{i.categoria}</span>;
            case 'subcategoria':
              return (
                <div className="min-w-0">
                  <p className="truncate text-ink-600 dark:text-ink-300" title={i.subcategoria}>{i.subcategoria}</p>
                  {i.descricao && <p className="truncate text-xs text-ink-400" title={i.descricao}>{i.descricao}</p>}
                </div>
              );
            case 'competencia':
              return <span className="block truncate text-ink-600 dark:text-ink-300">{nomeMes(i.mes)}/{i.ano}</span>;
            case 'valor':
              return <span className="block truncate tabular-nums text-ink-700 dark:text-ink-200">{formatarMoeda(i.valor)}</span>;
            default:
              return null;
          }
        }}
      />

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
