import { useEffect, useState } from 'react';
import { AlertCircle, ExternalLink, Loader2, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Link } from 'react-router-dom';
import { extrairMensagemErro } from '@/services/http';
import {
  apropriarDocumento,
  desapropriarDocumento,
  listarApropriados,
  listarCandidatos,
} from '@/services/prestacaoBlocos.service';
import { dataBr, formatarMoeda, mascaraCpfCnpj } from '@/lib/masks';
import type { DocumentoFiscal, DocumentoFiscalApropriado } from '@/types/prestacaoBlocos';
import { AlertaErro, IconBtn } from './_ui';

/**
 * Documentos fiscais da prestação — **seleção**, não cadastro.
 *
 * A nota é lançada uma vez em Execução → Financeiro → Despesas, quando a
 * despesa acontece. Aqui a prestação escolhe quais notas do exercício ela
 * apropria — e é neste momento, e só neste, que o **rateio vira percentual**:
 * o percentual depende do ajuste, e o ajuste só se conhece quando uma prestação
 * se apropria da nota.
 *
 * Era o contrário: a nota nascia dentro da prestação, e a mesma conta de luz
 * rateada entre cinco ajustes era digitada cinco vezes.
 */
export function DocumentosFiscaisSelecao({ prestacaoId }: { prestacaoId: string }) {
  const [apropriados, setApropriados] = useState<DocumentoFiscalApropriado[]>([]);
  const [candidatos, setCandidatos] = useState<DocumentoFiscal[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [escolhendo, setEscolhendo] = useState(false);
  const [busca, setBusca] = useState('');
  const [agindo, setAgindo] = useState<string | null>(null);

  useEffect(() => {
    let vivo = true;
    setCarregando(true);
    Promise.all([listarApropriados(prestacaoId), listarCandidatos(prestacaoId)])
      .then(([a, c]) => {
        if (!vivo) return;
        setApropriados(a);
        setCandidatos(c);
      })
      .catch((e) => vivo && setErro(extrairMensagemErro(e, 'Falha ao carregar os documentos.')))
      .finally(() => vivo && setCarregando(false));
    return () => {
      vivo = false;
    };
  }, [prestacaoId, refreshKey]);

  const recarregar = () => setRefreshKey((k) => k + 1);

  async function incluir(id: string) {
    setErro(null);
    setAgindo(id);
    try {
      await apropriarDocumento(prestacaoId, id);
      recarregar();
    } catch (e) {
      // O erro aqui é quase sempre regra de negócio — categoria fora do plano,
      // ajuste fora do rateio — e é informação, não falha técnica.
      setErro(extrairMensagemErro(e, 'Não foi possível incluir o documento.'));
      setEscolhendo(false);
    } finally {
      setAgindo(null);
    }
  }

  async function retirar(id: string) {
    setErro(null);
    setAgindo(id);
    try {
      await desapropriarDocumento(prestacaoId, id);
      recarregar();
    } catch (e) {
      setErro(extrairMensagemErro(e, 'Não foi possível retirar o documento.'));
    } finally {
      setAgindo(null);
    }
  }

  const total = apropriados.reduce((s, d) => s + d.valorApropriado, 0);
  const filtrados = candidatos.filter((c) => {
    const t = busca.trim().toLowerCase();
    if (!t) return true;
    return (
      c.numero.toLowerCase().includes(t) ||
      (c.credorNome ?? '').toLowerCase().includes(t) ||
      c.descricao.toLowerCase().includes(t)
    );
  });

  return (
    <div className="space-y-4">
      {erro && <AlertaErro msg={erro} />}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-ink-500 dark:text-ink-400">
          {apropriados.length > 0
            ? `${apropriados.length} documento(s) · total apropriado ${formatarMoeda(total)}`
            : 'Nenhum documento nesta prestação.'}
        </p>
        <Button size="sm" onClick={() => setEscolhendo(true)} disabled={carregando}>
          <Plus className="h-4 w-4" />
          Incluir documento
        </Button>
      </div>

      {carregando ? (
        <div className="py-10 text-center">
          <Loader2 className="mx-auto h-5 w-5 animate-spin text-brand-500" />
        </div>
      ) : apropriados.length === 0 ? (
        <div className="rounded-xl border border-ink-200 px-4 py-8 text-center text-sm text-ink-400 dark:border-ink-700">
          <p>
            Os documentos fiscais são lançados em{' '}
            <Link to="/execucao/financeiro/despesas" className="text-brand-600 hover:underline dark:text-brand-400">
              Execução → Financeiro → Despesas
            </Link>
            . Aqui você escolhe quais deles entram nesta prestação.
          </p>
          {candidatos.length > 0 && (
            <p className="mt-2">
              Há <strong>{candidatos.length}</strong> documento(s) do exercício disponível(is).
            </p>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-ink-200 dark:border-ink-700">
          <table className="w-full min-w-[880px] text-sm">
            <thead className="bg-ink-50/70 text-left text-[11px] uppercase tracking-wide text-ink-400 dark:bg-ink-800/40">
              <tr>
                <th className="w-28 px-3 py-2 font-medium">Nº</th>
                <th className="w-28 px-3 py-2 font-medium">Emissão</th>
                <th className="px-3 py-2 font-medium">Credor / descrição</th>
                <th className="w-36 px-3 py-2 text-right font-medium">Valor bruto</th>
                <th className="w-28 px-3 py-2 text-right font-medium">Rateio</th>
                <th className="w-40 px-3 py-2 text-right font-medium">Apropriado</th>
                <th className="w-20 px-3 py-2 text-center font-medium">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100 dark:divide-ink-800">
              {apropriados.map((d) => (
                <tr key={d.id} className="hover:bg-ink-50/50 dark:hover:bg-ink-800/20">
                  <td className="px-3 py-2 font-mono text-xs text-ink-800 dark:text-ink-100">{d.numero}</td>
                  <td className="px-3 py-2 tabular-nums text-ink-600 dark:text-ink-300">{dataBr(d.dataEmissao)}</td>
                  <td className="px-3 py-2">
                    <span className="block truncate text-ink-700 dark:text-ink-200" title={d.credorNome ?? ''}>
                      {d.credorNome || mascaraCpfCnpj(d.credorNumeroDoc)}
                    </span>
                    <span className="block truncate text-xs text-ink-400" title={d.descricao}>
                      {d.descricao}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-ink-600 dark:text-ink-300">
                    {formatarMoeda(d.valorBruto)}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {/* 100% não é rateio: é a nota inteira. Mostrar "100%" em
                        toda linha faria o rateio — que é a exceção — parecer
                        regra, e o olho pararia de notá-lo. */}
                    {d.rateioProveniente ? (
                      <Badge tone="brand">{d.percentual.toLocaleString('pt-BR')}%</Badge>
                    ) : (
                      <span className="text-ink-400">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums font-medium text-ink-800 dark:text-ink-100">
                    {formatarMoeda(d.valorApropriado)}
                  </td>
                  <td className="px-3 py-2 text-center">
                    {agindo === d.id ? (
                      <Loader2 className="mx-auto h-4 w-4 animate-spin text-brand-500" />
                    ) : (
                      <IconBtn title="Retirar desta prestação" danger onClick={() => retirar(d.id)}>
                        <X className="h-4 w-4" />
                      </IconBtn>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs text-ink-400">
        Retirar não apaga a nota — ela continua em Financeiro → Despesas, e pode ser apropriada por
        outra prestação. É o que permite a mesma nota rateada servir a vários ajustes.
      </p>

      <Modal open={escolhendo} onClose={() => setEscolhendo(false)} title="Incluir documento na prestação" size="2xl">
        <div className="space-y-3">
          <Input
            label="Localizar"
            name="busca"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Número, credor ou descrição"
            autoFocus
          />

          {candidatos.length === 0 ? (
            <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                Nenhum documento do exercício disponível. Lance as notas em{' '}
                <Link to="/execucao/financeiro/despesas" className="underline">
                  Financeiro → Despesas
                </Link>{' '}
                — só aparecem aqui as emitidas no ano desta prestação.
              </span>
            </div>
          ) : (
            <div className="max-h-[50vh] overflow-y-auto rounded-xl border border-ink-200 dark:border-ink-700">
              <table className="w-full text-sm">
                <tbody className="divide-y divide-ink-100 dark:divide-ink-800">
                  {filtrados.map((c) => (
                    <tr key={c.id} className="hover:bg-ink-50/70 dark:hover:bg-ink-800/30">
                      <td className="px-3 py-2">
                        <span className="block truncate text-ink-800 dark:text-ink-100">
                          <span className="font-mono text-xs">{c.numero}</span> ·{' '}
                          {c.credorNome || mascaraCpfCnpj(c.credorNumeroDoc)}
                        </span>
                        <span className="block truncate text-xs text-ink-400">
                          {dataBr(c.dataEmissao)} · {c.descricao}
                          {c.rateioProveniente && ' · rateada'}
                        </span>
                      </td>
                      <td className="w-36 px-3 py-2 text-right tabular-nums text-ink-700 dark:text-ink-200">
                        {formatarMoeda(c.valorBruto)}
                      </td>
                      <td className="w-28 px-3 py-2 text-right">
                        <Button size="sm" onClick={() => incluir(c.id)} disabled={agindo === c.id}>
                          {agindo === c.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Incluir'}
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {filtrados.length === 0 && (
                    <tr>
                      <td colSpan={3} className="px-3 py-6 text-center text-sm text-ink-400">
                        Nada encontrado para “{busca}”.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          <p className="text-xs text-ink-400">
            Só aparecem notas emitidas no exercício desta prestação. O percentual do rateio é
            calculado ao incluir, para o ajuste desta prestação — não se digita aqui.
          </p>

          <div className="flex justify-between">
            <Link
              to="/execucao/financeiro/despesas"
              className="focus-ring inline-flex items-center gap-1.5 rounded text-sm text-brand-600 hover:underline dark:text-brand-400"
            >
              Lançar nova despesa
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
