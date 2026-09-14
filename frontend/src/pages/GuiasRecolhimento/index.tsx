import { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, Loader2, Pencil, Plus, Trash2 } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { IconBtn } from '@/components/ui/AcoesGrade';
import { usePermissoes } from '@/contexts/PermissoesContext';
import { guiasApi } from '@/services/guias.service';
import { extrairMensagemErro } from '@/services/http';
import { dataBr, formatarMoeda, mascaraMoeda, moedaParaNumero, nomeMes, numeroParaMascaraMoeda } from '@/lib/masks';
import { TIPO_RETENCAO_LABEL } from '@/types/prestacaoBlocos';
import type { RetencaoApurada } from '@/types/guia';

type ModalState =
  | { tipo: 'fechado' }
  | { tipo: 'form'; linha: RetencaoApurada }
  | { tipo: 'excluir'; linha: RetencaoApurada };

/**
 * Guias de recolhimento das retenções.
 *
 * A nota fiscal é paga pelo **líquido** — o bruto menos a retenção —, e o valor
 * retido fica com a entidade até ser recolhido, numa guia única por tributo que
 * reúne as notas do mês. Sem esta tela o dinheiro retido sumia do sistema entre
 * o pagamento da nota e o recolhimento, e a diferença aparecia na conciliação
 * bancária sem explicação.
 *
 * O apurado é **conta, não cadastro**: sai das notas pagas a cada consulta. O
 * que se cadastra é a guia — um documento com número, que foi pago. Por isso a
 * linha existe antes de haver guia: ela é o aviso de que há algo a recolher.
 */
export function GuiasRecolhimento() {
  const { pode } = usePermissoes();
  const podeEditar = pode('EXECUCAO_GUIAS', 'EDICAO');

  const [linhas, setLinhas] = useState<RetencaoApurada[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalState>({ tipo: 'fechado' });
  const [refreshKey, setRefreshKey] = useState(0);
  const [processando, setProcessando] = useState(false);

  useEffect(() => {
    let vivo = true;
    setCarregando(true);
    guiasApi
      .apurar()
      .then((r) => vivo && setLinhas(r))
      .catch((e) => vivo && setErro(extrairMensagemErro(e, 'Falha ao apurar as retenções.')))
      .finally(() => vivo && setCarregando(false));
    return () => {
      vivo = false;
    };
  }, [refreshKey]);

  const recarregar = () => {
    setModal({ tipo: 'fechado' });
    setRefreshKey((k) => k + 1);
  };

  const aRecolher = linhas.filter((l) => !l.guia?.dataPagamento);
  const totalARecolher = aRecolher.reduce((s, l) => s + (l.guia?.valor ?? l.valorApurado), 0);

  async function excluir() {
    if (modal.tipo !== 'excluir' || !modal.linha.guia) return;
    setProcessando(true);
    try {
      await guiasApi.excluir(modal.linha.guia.id);
      recarregar();
    } catch (e) {
      setErro(extrairMensagemErro(e, 'Não foi possível excluir a guia.'));
    } finally {
      setProcessando(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Guias de Recolhimento"
        subtitle="Retenções apuradas das notas pagas, reunidas por tributo e competência. A competência é a do pagamento — retém-se ao pagar."
      />

      {erro && (
        <div className="mb-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{erro}</span>
        </div>
      )}

      {aRecolher.length > 0 && (
        <p className="mb-3 text-sm text-ink-500 dark:text-ink-400">
          {aRecolher.length} competência(s) a recolher · total{' '}
          <strong className="text-ink-800 dark:text-ink-100">{formatarMoeda(totalARecolher)}</strong>
        </p>
      )}

      {carregando ? (
        <div className="py-12 text-center">
          <Loader2 className="mx-auto h-5 w-5 animate-spin text-brand-500" />
        </div>
      ) : linhas.length === 0 ? (
        <div className="rounded-xl border border-ink-200 px-4 py-10 text-center text-sm text-ink-400 dark:border-ink-700">
          Nenhuma retenção a recolher. Elas aparecem aqui quando uma nota fiscal <strong>com
          retenção</strong> é <strong>paga</strong> — é o pagamento que torna o tributo devido.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-ink-200 dark:border-ink-700">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="bg-ink-50/70 text-left text-[11px] uppercase tracking-wide text-ink-400 dark:bg-ink-800/40">
              <tr>
                <th className="px-3 py-2 font-medium">Competência</th>
                <th className="px-3 py-2 font-medium">Tributo</th>
                <th className="px-3 py-2 text-right font-medium">Apurado</th>
                <th className="px-3 py-2 text-right font-medium">Guia</th>
                <th className="px-3 py-2 font-medium">Documento</th>
                <th className="px-3 py-2 font-medium">Situação</th>
                <th className="w-24 px-3 py-2 text-center font-medium">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100 dark:divide-ink-800">
              {linhas.map((l) => {
                const g = l.guia;
                // A divergência entre o apurado e a guia é o que mais interessa
                // olhar: significa que uma nota mudou depois de recolhido.
                const divergente = !!g && Math.abs(g.valor - l.valorApurado) > 0.01;
                return (
                  <tr key={`${l.tipo}-${l.ano}-${l.mes}`} className="hover:bg-ink-50/50 dark:hover:bg-ink-800/20">
                    <td className="px-3 py-2 tabular-nums text-ink-800 dark:text-ink-100">
                      {nomeMes(l.mes)}/{l.ano}
                    </td>
                    <td className="px-3 py-2 text-ink-700 dark:text-ink-200">
                      {TIPO_RETENCAO_LABEL[l.tipo]}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-ink-600 dark:text-ink-300">
                      {formatarMoeda(l.valorApurado)}
                      <span className="ml-1 text-xs text-ink-400">
                        ({l.notas} nota{l.notas === 1 ? '' : 's'})
                      </span>
                    </td>
                    <td
                      className={`px-3 py-2 text-right tabular-nums ${
                        divergente ? 'font-semibold text-amber-600 dark:text-amber-400' : 'text-ink-700 dark:text-ink-200'
                      }`}
                      title={divergente ? 'O valor da guia difere do apurado — alguma nota mudou depois.' : ''}
                    >
                      {g ? formatarMoeda(g.valor) : '—'}
                    </td>
                    <td className="px-3 py-2 text-ink-600 dark:text-ink-300">
                      <span className="block truncate" title={g?.numeroDocumento ?? ''}>
                        {g?.numeroDocumento || '—'}
                      </span>
                      {g?.dataVencimento && (
                        <span className="block text-xs text-ink-400">venc. {dataBr(g.dataVencimento)}</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {g?.dataPagamento ? (
                        <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          <span className="text-xs">Recolhida {dataBr(g.dataPagamento)}</span>
                        </span>
                      ) : g ? (
                        <Badge tone="warning">Emitida, não paga</Badge>
                      ) : (
                        <Badge tone="neutral">A recolher</Badge>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {podeEditar && (
                        <div className="flex items-center justify-center gap-1">
                          <IconBtn
                            title={g ? 'Editar guia' : 'Registrar guia'}
                            onClick={() => setModal({ tipo: 'form', linha: l })}
                          >
                            {g ? <Pencil className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                          </IconBtn>
                          {g && (
                            <IconBtn title="Excluir guia" danger onClick={() => setModal({ tipo: 'excluir', linha: l })}>
                              <Trash2 className="h-4 w-4" />
                            </IconBtn>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-4 text-xs text-ink-400">
        O <strong>apurado</strong> é recalculado a cada consulta, das notas pagas — corrigir uma
        nota muda o número aqui. O <strong>valor da guia</strong> é gravado: é o que de fato se
        recolheu, e não se reescreve sozinho quando a apuração muda. A diferença entre os dois fica
        em âmbar, porque é o que precisa de explicação.
      </p>

      <Modal
        open={modal.tipo === 'form'}
        onClose={() => setModal({ tipo: 'fechado' })}
        title={modal.tipo === 'form' && modal.linha.guia ? 'Editar guia' : 'Registrar guia'}
        size="lg"
      >
        {modal.tipo === 'form' && (
          <GuiaForm linha={modal.linha} onSuccess={recarregar} onCancel={() => setModal({ tipo: 'fechado' })} />
        )}
      </Modal>

      <Modal
        open={modal.tipo === 'excluir'}
        onClose={() => setModal({ tipo: 'fechado' })}
        title="Excluir guia"
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModal({ tipo: 'fechado' })} disabled={processando}>
              Cancelar
            </Button>
            <Button variant="danger" onClick={excluir} disabled={processando}>
              {processando && <Loader2 className="h-4 w-4 animate-spin" />}
              Excluir
            </Button>
          </>
        }
      >
        {modal.tipo === 'excluir' && (
          <p className="text-sm text-ink-600 dark:text-ink-300">
            Excluir a guia de <strong>{TIPO_RETENCAO_LABEL[modal.linha.tipo]}</strong> de{' '}
            {nomeMes(modal.linha.mes)}/{modal.linha.ano}? A retenção volta a aparecer como{' '}
            <strong>a recolher</strong>.
          </p>
        )}
      </Modal>
    </>
  );
}

function GuiaForm({
  linha,
  onSuccess,
  onCancel,
}: {
  linha: RetencaoApurada;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const g = linha.guia;
  // O valor abre com o apurado: é ele que se vai recolher, e redigitá-lo é
  // chance de errar um número que o sistema já sabe.
  const [valor, setValor] = useState(numeroParaMascaraMoeda(g?.valor ?? linha.valorApurado));
  const [vencimento, setVencimento] = useState(g?.dataVencimento ?? '');
  const [pagamento, setPagamento] = useState(g?.dataPagamento ?? '');
  const [documento, setDocumento] = useState(g?.numeroDocumento ?? '');
  const [observacao, setObservacao] = useState(g?.observacao ?? '');
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  const v = moedaParaNumero(valor);
  const difere = Math.abs(v - linha.valorApurado) > 0.01;

  async function submeter(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    if (v <= 0) return setErro('Informe o valor da guia.');

    const payload = {
      tipo: linha.tipo,
      ano: linha.ano,
      mes: linha.mes,
      valor: v,
      dataVencimento: vencimento || null,
      dataPagamento: pagamento || null,
      numeroDocumento: documento.trim() || null,
      observacao: observacao.trim() || null,
    };

    setSalvando(true);
    try {
      if (g) await guiasApi.atualizar(g.id, payload);
      else await guiasApi.criar(payload);
      onSuccess();
    } catch (e) {
      setErro(extrairMensagemErro(e, 'Não foi possível salvar a guia.'));
    } finally {
      setSalvando(false);
    }
  }

  return (
    <form onSubmit={submeter} className="space-y-4">
      {erro && (
        <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{erro}</span>
        </div>
      )}

      {/* Tributo e competência não se editam: a guia é desta linha. Trocá-los
          aqui seria criar outra guia disfarçada de edição. */}
      <div className="rounded-xl border border-ink-200 bg-ink-50/50 px-3 py-2 text-sm dark:border-ink-700 dark:bg-ink-800/30">
        <span className="text-ink-500 dark:text-ink-400">
          {TIPO_RETENCAO_LABEL[linha.tipo]} · competência{' '}
          <strong className="text-ink-800 dark:text-ink-100">
            {nomeMes(linha.mes)}/{linha.ano}
          </strong>{' '}
          · apurado{' '}
          <strong className="text-ink-800 dark:text-ink-100">{formatarMoeda(linha.valorApurado)}</strong> em{' '}
          {linha.notas} nota{linha.notas === 1 ? '' : 's'}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <Input
            label="Valor da guia (R$) *"
            name="valor"
            value={valor}
            onChange={(e) => setValor(mascaraMoeda(e.target.value))}
            inputMode="numeric"
          />
          {difere && (
            <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
              Difere do apurado em {formatarMoeda(Math.abs(v - linha.valorApurado))}. Pode ser
              multa, juros ou correção — use a observação para registrar o motivo.
            </p>
          )}
        </div>
        <Input label="Nº do documento (DARF, guia)" name="documento" value={documento} onChange={(e) => setDocumento(e.target.value)} />
        <Input label="Vencimento" name="vencimento" type="date" value={vencimento} onChange={(e) => setVencimento(e.target.value)} />
        <Input
          label="Data do recolhimento"
          name="pagamento"
          type="date"
          value={pagamento}
          onChange={(e) => setPagamento(e.target.value)}
          hint="Em branco = emitida, ainda não paga."
        />
        <div className="sm:col-span-2">
          <Input label="Observação" name="observacao" value={observacao} onChange={(e) => setObservacao(e.target.value)} />
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 pt-1">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={salvando}>
          Cancelar
        </Button>
        <Button type="submit" disabled={salvando}>
          {salvando && <Loader2 className="h-4 w-4 animate-spin" />}
          {salvando ? 'Salvando...' : 'Salvar'}
        </Button>
      </div>
    </form>
  );
}
