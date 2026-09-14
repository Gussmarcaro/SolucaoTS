import { useEffect, useState, type ReactNode } from 'react';
import { AlertCircle, ExternalLink, Loader2, Plus, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { extrairMensagemErro } from '@/services/http';
import { formatarMoeda } from '@/lib/masks';
import { AlertaErro, IconBtn } from './_ui';

/** O mínimo que a seleção precisa saber de um lançamento. */
interface Lancavel {
  id: string;
  valor: number;
}

/**
 * Seleção de lançamentos do Financeiro por uma prestação.
 *
 * Serve a Receitas e Pagamentos, que têm exatamente a mesma interação: listar o
 * que já entrou, incluir do acervo do órgão, retirar. O que muda entre os dois
 * é o rótulo e como cada linha se descreve — e isso entra por parâmetro.
 *
 * Não serve ao Documento Fiscal, e é bom que não sirva: lá a inclusão calcula o
 * percentual do rateio, e a tabela mostra uma coluna a mais. Forçar os três no
 * mesmo componente trocaria três telas claras por uma cheia de condicionais.
 */
export function SelecaoLancamentos<T extends Lancavel>({
  prestacaoId,
  rotulo,
  rotuloPlural,
  ondeSeLanca,
  linkLancamento,
  carregarApropriados,
  carregarCandidatos,
  apropriar,
  desapropriar,
  descrever,
}: {
  prestacaoId: string;
  /** "receita" / "pagamento" — entra nas frases. */
  rotulo: string;
  rotuloPlural: string;
  /** "Execução → Financeiro → Receitas" — onde o lançamento nasce. */
  ondeSeLanca: string;
  linkLancamento: string;
  carregarApropriados: (prestacaoId: string) => Promise<T[]>;
  carregarCandidatos: (prestacaoId: string) => Promise<T[]>;
  apropriar: (prestacaoId: string, id: string) => Promise<void>;
  desapropriar: (prestacaoId: string, id: string) => Promise<void>;
  /** Como a linha se apresenta: título e subtítulo. */
  descrever: (item: T) => { titulo: ReactNode; sub: ReactNode; busca: string };
}) {
  const [apropriados, setApropriados] = useState<T[]>([]);
  const [candidatos, setCandidatos] = useState<T[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [escolhendo, setEscolhendo] = useState(false);
  const [busca, setBusca] = useState('');
  const [agindo, setAgindo] = useState<string | null>(null);

  useEffect(() => {
    let vivo = true;
    setCarregando(true);
    Promise.all([carregarApropriados(prestacaoId), carregarCandidatos(prestacaoId)])
      .then(([a, c]) => {
        if (!vivo) return;
        setApropriados(a);
        setCandidatos(c);
      })
      .catch((e) => vivo && setErro(extrairMensagemErro(e, `Falha ao carregar ${rotuloPlural}.`)))
      .finally(() => vivo && setCarregando(false));
    return () => {
      vivo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prestacaoId, refreshKey]);

  const recarregar = () => setRefreshKey((k) => k + 1);

  async function agir(id: string, fn: (p: string, i: string) => Promise<void>, falha: string) {
    setErro(null);
    setAgindo(id);
    try {
      await fn(prestacaoId, id);
      recarregar();
    } catch (e) {
      setErro(extrairMensagemErro(e, falha));
      setEscolhendo(false);
    } finally {
      setAgindo(null);
    }
  }

  const total = apropriados.reduce((s, i) => s + i.valor, 0);
  const filtrados = candidatos.filter((c) =>
    busca.trim() ? descrever(c).busca.toLowerCase().includes(busca.trim().toLowerCase()) : true,
  );

  return (
    <div className="space-y-4">
      {erro && <AlertaErro msg={erro} />}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-ink-500 dark:text-ink-400">
          {apropriados.length > 0
            ? `${apropriados.length} ${rotuloPlural} · total ${formatarMoeda(total)}`
            : `Nenhuma ${rotulo} nesta prestação.`}
        </p>
        <Button size="sm" onClick={() => setEscolhendo(true)} disabled={carregando}>
          <Plus className="h-4 w-4" />
          Incluir {rotulo}
        </Button>
      </div>

      {carregando ? (
        <div className="py-10 text-center">
          <Loader2 className="mx-auto h-5 w-5 animate-spin text-brand-500" />
        </div>
      ) : apropriados.length === 0 ? (
        <div className="rounded-xl border border-ink-200 px-4 py-8 text-center text-sm text-ink-400 dark:border-ink-700">
          <p>
            {rotuloPlural.charAt(0).toUpperCase() + rotuloPlural.slice(1)} são lançad
            {rotulo === 'receita' ? 'as' : 'os'} em{' '}
            <Link to={linkLancamento} className="text-brand-600 hover:underline dark:text-brand-400">
              {ondeSeLanca}
            </Link>
            . Aqui você escolhe quais entram nesta prestação.
          </p>
          {candidatos.length > 0 && (
            <p className="mt-2">
              Há <strong>{candidatos.length}</strong> disponível(is) no exercício.
            </p>
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-ink-200 dark:border-ink-700">
          <ul className="divide-y divide-ink-100 dark:divide-ink-800">
            {apropriados.map((item) => {
              const d = descrever(item);
              return (
                <li key={item.id} className="flex items-center gap-3 px-3 py-2 hover:bg-ink-50/50 dark:hover:bg-ink-800/20">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-ink-800 dark:text-ink-100">{d.titulo}</div>
                    <div className="truncate text-xs text-ink-400">{d.sub}</div>
                  </div>
                  <span className="shrink-0 tabular-nums text-ink-700 dark:text-ink-200">
                    {formatarMoeda(item.valor)}
                  </span>
                  <div className="w-8 shrink-0 text-center">
                    {agindo === item.id ? (
                      <Loader2 className="mx-auto h-4 w-4 animate-spin text-brand-500" />
                    ) : (
                      <IconBtn
                        title="Retirar desta prestação"
                        danger
                        onClick={() => agir(item.id, desapropriar, `Não foi possível retirar a ${rotulo}.`)}
                      >
                        <X className="h-4 w-4" />
                      </IconBtn>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <p className="text-xs text-ink-400">
        Retirar não apaga o lançamento — ele volta ao acervo do órgão e pode ser apropriado por
        outra prestação.
      </p>

      <Modal
        open={escolhendo}
        onClose={() => setEscolhendo(false)}
        title={`Incluir ${rotulo} na prestação`}
        size="xl"
      >
        <div className="space-y-3">
          <Input
            label="Localizar"
            name="busca"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            autoFocus
          />

          {candidatos.length === 0 ? (
            <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                Nada disponível no exercício. Só aparecem aqui os lançamentos{' '}
                <strong>deste ajuste</strong> (ou ainda sem ajuste definido) que{' '}
                <strong>nenhuma outra prestação</strong> apropriou.
              </span>
            </div>
          ) : (
            <ul className="max-h-[50vh] divide-y divide-ink-100 overflow-y-auto rounded-xl border border-ink-200 dark:divide-ink-800 dark:border-ink-700">
              {filtrados.map((c) => {
                const d = descrever(c);
                return (
                  <li key={c.id} className="flex items-center gap-3 px-3 py-2 hover:bg-ink-50/70 dark:hover:bg-ink-800/30">
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-ink-800 dark:text-ink-100">{d.titulo}</div>
                      <div className="truncate text-xs text-ink-400">{d.sub}</div>
                    </div>
                    <span className="shrink-0 tabular-nums text-ink-700 dark:text-ink-200">
                      {formatarMoeda(c.valor)}
                    </span>
                    <Button
                      size="sm"
                      onClick={() => agir(c.id, apropriar, `Não foi possível incluir a ${rotulo}.`)}
                      disabled={agindo === c.id}
                    >
                      {agindo === c.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Incluir'}
                    </Button>
                  </li>
                );
              })}
              {filtrados.length === 0 && (
                <li className="px-3 py-6 text-center text-sm text-ink-400">Nada encontrado.</li>
              )}
            </ul>
          )}

          <div className="flex justify-between">
            <Link
              to={linkLancamento}
              className="focus-ring inline-flex items-center gap-1.5 rounded text-sm text-brand-600 hover:underline dark:text-brand-400"
            >
              Lançar {rotulo === 'receita' ? 'nova receita' : 'novo pagamento'}
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>
            <Button variant="secondary" onClick={() => setEscolhendo(false)}>
              Fechar
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
