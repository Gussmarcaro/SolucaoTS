import { useEffect, useRef, useState } from 'react';
import { AlertCircle, Ban, Check, CheckCircle2, Loader2, RotateCcw, Upload } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { usePermissoes } from '@/contexts/PermissoesContext';
import { conciliacaoApi } from '@/services/conciliacao.service';
import { extrairMensagemErro } from '@/services/http';
import { dataBr, formatarMoeda } from '@/lib/masks';
import type { LinhaExtrato, ResultadoImportacaoOfx } from '@/types/conciliacao';

type Filtro = 'pendentes' | 'conciliados' | 'ignorados' | 'todos';

const FILTROS: { key: Filtro; label: string }[] = [
  { key: 'pendentes', label: 'A conciliar' },
  { key: 'conciliados', label: 'Conciliados' },
  { key: 'ignorados', label: 'Ignorados' },
  { key: 'todos', label: 'Todos' },
];

/**
 * Conciliação bancária.
 *
 * É a única tela do sistema que compara o que foi **lançado** com o que de fato
 * **aconteceu na conta**. Todo o resto — plano, cronograma, prestação — confia
 * no que alguém digitou; aqui o banco é a testemunha.
 *
 * Por isso ela revela duas coisas que nenhuma outra revela: o que saiu da conta
 * e ninguém lançou, e o que foi lançado duas vezes.
 *
 * A lista abre em **"A conciliar"** de propósito: o que já foi conferido não
 * pede atenção, e uma tela que mostra tudo misturado ensina a ignorá-la.
 */
export function Conciliacao() {
  const { pode } = usePermissoes();
  const podeEditar = pode('EXECUCAO_CONCILIACAO', 'EDICAO');

  const [linhas, setLinhas] = useState<LinhaExtrato[]>([]);
  const [filtro, setFiltro] = useState<Filtro>('pendentes');
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [resultado, setResultado] = useState<ResultadoImportacaoOfx | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [de, setDe] = useState('');
  const [ate, setAte] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [agindo, setAgindo] = useState<string | null>(null);
  const arquivo = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let vivo = true;
    setCarregando(true);
    conciliacaoApi
      .listar({ de: de || undefined, ate: ate || undefined })
      .then((r) => vivo && setLinhas(r))
      .catch((e) => vivo && setErro(extrairMensagemErro(e, 'Falha ao carregar o extrato.')))
      .finally(() => vivo && setCarregando(false));
    return () => {
      vivo = false;
    };
  }, [refreshKey, de, ate]);

  const recarregar = () => setRefreshKey((k) => k + 1);

  async function importar(file: File) {
    setErro(null);
    setResultado(null);
    setEnviando(true);
    try {
      setResultado(await conciliacaoApi.importar(file));
      recarregar();
    } catch (e) {
      setErro(extrairMensagemErro(e, 'Não foi possível importar o extrato.'));
    } finally {
      setEnviando(false);
      if (arquivo.current) arquivo.current.value = '';
    }
  }

  async function agir(id: string, dados: Parameters<typeof conciliacaoApi.conciliar>[1]) {
    setErro(null);
    setAgindo(id);
    try {
      await conciliacaoApi.conciliar(id, dados);
      recarregar();
    } catch (e) {
      setErro(extrairMensagemErro(e, 'Não foi possível atualizar a conciliação.'));
    } finally {
      setAgindo(null);
    }
  }

  const visiveis = linhas.filter((l) => {
    if (filtro === 'todos') return true;
    if (filtro === 'ignorados') return l.ignorado;
    if (filtro === 'conciliados') return !!l.conciliadoEm && !l.ignorado;
    return !l.conciliadoEm && !l.ignorado;
  });

  const pendentes = linhas.filter((l) => !l.conciliadoEm && !l.ignorado);
  const saldoPendente = pendentes.reduce((s, l) => s + l.valor, 0);

  return (
    <>
      <PageHeader
        title="Conciliação Bancária"
        subtitle="O extrato do banco confrontado com o que foi lançado. Importe o OFX e confirme os pares."
        actions={
          podeEditar && (
            <>
              <input
                ref={arquivo}
                type="file"
                accept=".ofx,.qfx"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && importar(e.target.files[0])}
              />
              <Button variant="success" onClick={() => arquivo.current?.click()} disabled={enviando}>
                {enviando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                {enviando ? 'Importando...' : 'Importar OFX'}
              </Button>
            </>
          )
        }
      />

      {erro && (
        <div className="mb-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{erro}</span>
        </div>
      )}

      {/* O resultado diz quantas já existiam: reimportar um período que se
          sobrepõe é o caso comum, e sem esse número o usuário acha que o
          arquivo não entrou. */}
      {resultado && (
        <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">
          <p>
            <strong>{resultado.novas}</strong> transação(ões) importada(s) de {resultado.lidas} lidas
            {resultado.repetidas > 0 && ` · ${resultado.repetidas} já existiam (não duplicadas)`}
            {resultado.periodo.inicial && ` · período ${dataBr(resultado.periodo.inicial)} a ${dataBr(resultado.periodo.final ?? resultado.periodo.inicial)}`}
          </p>
          {resultado.erros.length > 0 && (
            <ul className="mt-2 list-disc pl-5 text-xs">
              {resultado.erros.slice(0, 5).map((e, i) => (
                <li key={i}>{e}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="flex flex-wrap items-center gap-1 rounded-xl border border-ink-200 p-1 dark:border-ink-700">
          {FILTROS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFiltro(f.key)}
              className={`focus-ring rounded-lg px-3 py-1.5 text-sm transition-colors ${
                filtro === f.key
                  ? 'bg-brand-500 font-medium text-white'
                  : 'text-ink-600 hover:bg-ink-100 dark:text-ink-300 dark:hover:bg-ink-800'
              }`}
            >
              {f.label}
              {f.key === 'pendentes' && pendentes.length > 0 && ` (${pendentes.length})`}
            </button>
          ))}
        </div>
        <div className="w-40">
          <Input label="De" name="de" type="date" value={de} onChange={(e) => setDe(e.target.value)} />
        </div>
        <div className="w-40">
          <Input label="Até" name="ate" type="date" value={ate} onChange={(e) => setAte(e.target.value)} />
        </div>
      </div>

      {pendentes.length > 0 && (
        <p className="mb-3 text-sm text-ink-500 dark:text-ink-400">
          {pendentes.length} linha(s) a conciliar · saldo{' '}
          <strong className="text-ink-800 dark:text-ink-100">{formatarMoeda(saldoPendente)}</strong>
        </p>
      )}

      {carregando ? (
        <div className="py-12 text-center">
          <Loader2 className="mx-auto h-5 w-5 animate-spin text-brand-500" />
        </div>
      ) : visiveis.length === 0 ? (
        <div className="rounded-xl border border-ink-200 px-4 py-10 text-center text-sm text-ink-400 dark:border-ink-700">
          {linhas.length === 0
            ? 'Nenhum extrato importado. Baixe o OFX no internet banking e use o botão acima.'
            : filtro === 'pendentes'
              ? 'Nada a conciliar no período. Tudo conferido.'
              : 'Nenhuma linha neste filtro.'}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-ink-200 dark:border-ink-700">
          <table className="w-full min-w-[980px] text-sm">
            <thead className="bg-ink-50/70 text-left text-[11px] uppercase tracking-wide text-ink-400 dark:bg-ink-800/40">
              <tr>
                <th className="w-28 px-3 py-2 font-medium">Data</th>
                <th className="px-3 py-2 font-medium">Histórico do banco</th>
                <th className="w-36 px-3 py-2 text-right font-medium">Valor</th>
                <th className="px-3 py-2 font-medium">Lançamento no sistema</th>
                <th className="w-44 px-3 py-2 text-center font-medium">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100 dark:divide-ink-800">
              {visiveis.map((l) => (
                <tr key={l.id} className="hover:bg-ink-50/50 dark:hover:bg-ink-800/20">
                  <td className="px-3 py-2 tabular-nums text-ink-600 dark:text-ink-300">{dataBr(l.data)}</td>
                  <td className="px-3 py-2">
                    <span className="block truncate text-ink-800 dark:text-ink-100" title={l.descricao}>
                      {l.descricao}
                    </span>
                    {l.observacao && (
                      <span className="block truncate text-xs text-ink-400">{l.observacao}</span>
                    )}
                  </td>
                  <td
                    className={`px-3 py-2 text-right tabular-nums ${
                      l.valor < 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'
                    }`}
                  >
                    {formatarMoeda(l.valor)}
                  </td>
                  <td className="px-3 py-2">
                    {l.ignorado ? (
                      <Badge tone="neutral">Ignorado</Badge>
                    ) : l.conciliadoEm ? (
                      <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span className="text-xs">Conciliado</span>
                      </span>
                    ) : l.sugestao ? (
                      <span className="block truncate text-ink-600 dark:text-ink-300" title={l.sugestao.descricao}>
                        {l.sugestao.descricao}
                        <span className="ml-1 text-xs text-ink-400">
                          {formatarMoeda(l.sugestao.valor)} · {dataBr(l.sugestao.data)}
                        </span>
                      </span>
                    ) : (
                      /* Sem sugestão é informação, não falha: ou não há
                         lançamento correspondente — e aí falta lançar —, ou há
                         mais de um candidato idêntico e o sistema se cala de
                         propósito. */
                      <span className="text-xs text-amber-600 dark:text-amber-400">
                        Sem correspondência automática
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {podeEditar && (
                      <div className="flex items-center justify-center gap-1">
                        {agindo === l.id ? (
                          <Loader2 className="h-4 w-4 animate-spin text-brand-500" />
                        ) : l.conciliadoEm || l.ignorado ? (
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={() => agir(l.id, { pagamentoId: null, receitaId: null, ignorado: false })}
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                            Desfazer
                          </Button>
                        ) : (
                          <>
                            {l.sugestao && (
                              <Button
                                type="button"
                                size="sm"
                                onClick={() =>
                                  agir(
                                    l.id,
                                    l.sugestao!.tipo === 'PAGAMENTO'
                                      ? { pagamentoId: l.sugestao!.id }
                                      : { receitaId: l.sugestao!.id },
                                  )
                                }
                              >
                                <Check className="h-3.5 w-3.5" />
                                Conciliar
                              </Button>
                            )}
                            <Button
                              type="button"
                              variant="secondary"
                              size="sm"
                              onClick={() => agir(l.id, { ignorado: true })}
                              title="Tarifa, rendimento, transferência entre contas próprias"
                            >
                              <Ban className="h-3.5 w-3.5" />
                              Ignorar
                            </Button>
                          </>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-4 space-y-1 text-xs text-ink-400">
        <p>
          <strong>Reimportar é seguro.</strong> Cada transação tem o identificador do banco, e o
          sistema ignora as que já entraram — inclusive quando o período do novo extrato se sobrepõe
          ao anterior.
        </p>
        <p>
          <strong>Sem correspondência</strong> quer dizer uma de duas coisas: o lançamento não
          existe no sistema — e aí falta lançá-lo —, ou há mais de um candidato idêntico e a
          sugestão se cala. Numa conciliação, errar em silêncio é pior que não sugerir.
        </p>
        <p>
          <strong>Ignorar</strong> é para o que não tem par e não deve ter: tarifa, rendimento de
          aplicação, transferência entre contas próprias. Sem isso elas voltariam a pedir atenção a
          cada importação.
        </p>
      </div>
    </>
  );
}
