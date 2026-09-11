import { useEffect, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { GradeSimples } from '@/components/ui/GradeSimples';
import type { ColunaDef } from '@/hooks/useResizableColumns';
import { formatarMoeda, nomeMes } from '@/lib/masks';
import { extrairMensagemErro } from '@/services/http';
import { importarCronograma, limparCronograma, listarCronograma, listarPlano } from '@/services/ajusteCsv.service';
import type { PlanoItem } from '@/types/ajusteCsv';
import { CronogramaDigitado } from './CronogramaDigitado';
import type { CronogramaItem } from '@/types/ajusteCsv';
import { ImportadorCsv } from './ImportadorCsv';
import { ConfirmarExclusao } from './TermosAditivosTab';

const COLUNAS: ColunaDef[] = [
  { key: 'ano', label: 'Ano', width: 120, sortKey: 'ano' },
  { key: 'mes', label: 'Mês', width: 180, sortKey: 'mes' },
  { key: 'valor', label: 'Valor', width: 180, align: 'right', sortKey: 'valor' },
];

export function CronogramaTab({
  ajusteId,
  vigenciaInicial = null,
  vigenciaFinal = null,
}: {
  ajusteId: string;
  vigenciaInicial?: string | null;
  vigenciaFinal?: string | null;
}) {
  const [lista, setLista] = useState<CronogramaItem[]>([]);
  // O cronograma detalha as rubricas do plano — sem ele não há o que fracionar.
  const [plano, setPlano] = useState<PlanoItem[]>([]);
  const [modo, setModo] = useState<'digitar' | 'importar'>('digitar');
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [confirmarLimpar, setConfirmarLimpar] = useState(false);

  useEffect(() => {
    let vivo = true;
    setCarregando(true);
    Promise.all([listarCronograma(ajusteId), listarPlano(ajusteId)])
      .then(([c, p]) => {
        if (!vivo) return;
        setLista(c);
        setPlano(p);
      })
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
      {/* Digitar cobre o quadro do Plano de Trabalho; o CSV segue para quem
          tem o cronograma pronto noutro formato, ou agregado por mês. */}
      <div className="flex flex-wrap items-center gap-1 rounded-xl border border-ink-200 p-1 dark:border-ink-700">
        {(['digitar', 'importar'] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setModo(m)}
            className={`focus-ring flex-1 rounded-lg px-3 py-1.5 text-sm transition-colors ${
              modo === m
                ? 'bg-brand-500 font-medium text-white'
                : 'text-ink-600 hover:bg-ink-100 dark:text-ink-300 dark:hover:bg-ink-800'
            }`}
          >
            {m === 'digitar' ? 'Digitar (por rubrica e mês)' : 'Importar CSV'}
          </button>
        ))}
      </div>

      {modo === 'digitar' ? (
        <CronogramaDigitado
          ajusteId={ajusteId}
          plano={plano}
          cronograma={lista}
          vigenciaInicial={vigenciaInicial}
          vigenciaFinal={vigenciaFinal}
          onSalvo={recarregar}
        />
      ) : (
        <ImportadorCsv
          dica="CSV com colunas: ano; mês; valor (uma linha por competência)."
          onImportar={(f) => importarCronograma(ajusteId, f)}
          onConcluido={recarregar}
        />
      )}

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

      {/* Sem coluna de Ações: o conteúdo vem do CSV e não é editado linha a
          linha — a única ação é "Limpar tudo", no topo. */}
      <GradeSimples
        storageKey="@SolucaoTS:grid:cronograma:v1"
        colunas={COLUNAS}
        dados={lista}
        chave={(i) => i.id}
        carregando={carregando}
        erro={erro}
        vazio="Importe um CSV para preencher o cronograma de desembolso."
        valorOrdenacao={(campo, i) => {
          if (campo === 'ano') return i.ano;
          if (campo === 'mes') return i.ano * 100 + i.mes;
          if (campo === 'valor') return i.valor;
          return null;
        }}
        renderCell={(coluna, i) => {
          switch (coluna) {
            case 'ano':
              return <span className="block truncate text-ink-600 dark:text-ink-300">{i.ano}</span>;
            case 'mes':
              return <span className="block truncate text-ink-700 dark:text-ink-200">{nomeMes(i.mes)}</span>;
            case 'valor':
              return <span className="block truncate tabular-nums text-ink-700 dark:text-ink-200">{formatarMoeda(i.valor)}</span>;
            default:
              return null;
          }
        }}
      />

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
