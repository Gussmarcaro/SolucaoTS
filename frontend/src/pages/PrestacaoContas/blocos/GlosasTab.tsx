import { useEffect, useState } from 'react';
import { AlertTriangle, Loader2, Pencil, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { GradeSimples } from '@/components/ui/GradeSimples';
import type { ColunaDef } from '@/hooks/useResizableColumns';
import { enterComoTab } from '@/lib/enterComoTab';
import { Badge } from '@/components/ui/Badge';
import { dataBr, formatarMoeda, mascaraMoeda, moedaParaNumero, numeroParaMascaraMoeda } from '@/lib/masks';
import { RESULTADO_ANALISE, RESULTADO_ANALISE_LABEL } from '@/lib/dominios';
import { extrairMensagemErro } from '@/services/http';
import { glosasApi } from '@/services/prestacaoBlocos2.service';
import { listarDocumentosFiscais } from '@/services/prestacaoBlocos.service';
import type { Glosa, GlosaPayload, ResultadoAnalise } from '@/types/prestacaoBlocos3';
import type { DocumentoFiscal } from '@/types/prestacaoBlocos';
import { ConfirmarExclusao } from '@/pages/Ajustes/tabs/TermosAditivosTab';
import { AlertaErro, IconBtn } from './_ui';

const FOLHA = 'folha';
type ModalState = { tipo: 'fechado' } | { tipo: 'form'; item: Glosa | null } | { tipo: 'excluir'; item: Glosa };

/** Ações sempre primeiro, como nas grades dos cadastros. */
const COLUNAS: ColunaDef[] = [
  { key: 'acoes', label: 'Ações', width: 100, minWidth: 90, align: 'center', movivel: false },
  { key: 'vinculo', label: 'Vínculo', width: 220, sortKey: 'vinculo' },
  { key: 'resultado', label: 'Resultado', width: 200, sortKey: 'resultado' },
  { key: 'valor', label: 'Valor glosado', width: 170, align: 'right', sortKey: 'valorGlosa' },
];

export function GlosasTab({ prestacaoId }: { prestacaoId: string }) {
  const [lista, setLista] = useState<Glosa[]>([]);
  const [docs, setDocs] = useState<DocumentoFiscal[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalState>({ tipo: 'fechado' });
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let vivo = true;
    setCarregando(true);
    Promise.all([glosasApi.listar(prestacaoId), listarDocumentosFiscais(prestacaoId)])
      .then(([gs, ds]) => { if (!vivo) return; setLista(gs); setDocs(ds); })
      .catch((e) => vivo && setErro(extrairMensagemErro(e, 'Falha ao carregar as glosas.')))
      .finally(() => vivo && setCarregando(false));
    return () => { vivo = false; };
  }, [prestacaoId, refreshKey]);

  const recarregar = () => { setModal({ tipo: 'fechado' }); setRefreshKey((k) => k + 1); };
  const analisados = new Set(lista.map((g) => g.documentoFiscalId).filter(Boolean));
  const semAnalise = docs.filter((d) => !analisados.has(d.id));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-ink-500 dark:text-ink-400">Todo documento fiscal deve ter uma análise (§7 #16).</p>
        <Button size="sm" onClick={() => setModal({ tipo: 'form', item: null })}><Plus className="h-4 w-4" />Adicionar</Button>
      </div>

      {!carregando && semAnalise.length > 0 && (
        <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{semAnalise.length} documento(s) fiscal(is) ainda sem análise de glosa.</span>
        </div>
      )}

      <GradeSimples
        storageKey="@SolucaoTS:grid:glosas:v1"
        colunas={COLUNAS}
        dados={lista}
        chave={(g) => g.id}
        carregando={carregando}
        erro={erro}
        vazio="Nenhuma análise cadastrada."
        onDuploClique={(g) => setModal({ tipo: 'form', item: g })}
        valorOrdenacao={(campo, g) => {
          if (campo === 'vinculo') return g.documentoNumero ?? g.pagamentoData;
          if (campo === 'resultado') return RESULTADO_ANALISE_LABEL[g.resultadoAnalise];
          if (campo === 'valorGlosa') return g.valorGlosa;
          return null;
        }}
        renderCell={(coluna, g) => {
          switch (coluna) {
            case 'acoes':
              return (
                <div className="flex items-center justify-center gap-1">
                  <IconBtn title="Editar" onClick={() => setModal({ tipo: 'form', item: g })}><Pencil className="h-4 w-4" /></IconBtn>
                  <IconBtn title="Excluir" danger onClick={() => setModal({ tipo: 'excluir', item: g })}><Trash2 className="h-4 w-4" /></IconBtn>
                </div>
              );
            case 'vinculo':
              return g.documentoNumero ? (
                <span className="block truncate font-mono text-xs text-ink-700 dark:text-ink-200">Doc. nº {g.documentoNumero}</span>
              ) : (
                <Badge tone="warning">Folha {g.pagamentoData ? dataBr(g.pagamentoData) : ''}</Badge>
              );
            case 'resultado':
              return (
                <Badge tone={g.resultadoAnalise === 'APROVADO' ? 'success' : g.resultadoAnalise === 'REPROVADO' ? 'danger' : 'warning'}>
                  {RESULTADO_ANALISE_LABEL[g.resultadoAnalise]}
                </Badge>
              );
            case 'valor':
              return (
                <span className="block truncate tabular-nums text-ink-700 dark:text-ink-200">
                  {g.valorGlosa != null ? formatarMoeda(g.valorGlosa) : '—'}
                </span>
              );
            default:
              return null;
          }
        }}
      />

      <Modal open={modal.tipo === 'form'} onClose={() => setModal({ tipo: 'fechado' })} title={modal.tipo === 'form' && modal.item ? 'Editar Análise' : 'Nova Análise de Glosa'} size="lg">
        {modal.tipo === 'form' && <GlosaForm prestacaoId={prestacaoId} item={modal.item} docs={docs} onSuccess={recarregar} onCancel={() => setModal({ tipo: 'fechado' })} />}
      </Modal>
      <ConfirmarExclusao
        aberto={modal.tipo === 'excluir'}
        rotulo="esta análise"
        onCancel={() => setModal({ tipo: 'fechado' })}
        onConfirm={async () => { if (modal.tipo !== 'excluir') return; await glosasApi.excluir(prestacaoId, modal.item.id); recarregar(); }}
      />
    </div>
  );
}

function GlosaForm({ prestacaoId, item, docs, onSuccess, onCancel }: { prestacaoId: string; item: Glosa | null; docs: DocumentoFiscal[]; onSuccess: () => void; onCancel: () => void }) {
  const [vinculo, setVinculo] = useState(item ? (item.documentoFiscalId ?? FOLHA) : (docs[0]?.id ?? FOLHA));
  const [pagamentoData, setPagamentoData] = useState(item?.pagamentoData ?? '');
  const [resultado, setResultado] = useState<ResultadoAnalise>(item?.resultadoAnalise ?? 'APROVADO');
  const [valorGlosa, setValorGlosa] = useState(item?.valorGlosa != null ? numeroParaMascaraMoeda(item.valorGlosa) : '');
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  async function submeter(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    if (vinculo === FOLHA && !pagamentoData) return setErro('Informe a data do pagamento da folha.');
    if (resultado === 'APROVADO_PARCIALMENTE' && moedaParaNumero(valorGlosa) <= 0) return setErro('Informe o valor glosado.');

    const payload: GlosaPayload = {
      documentoFiscalId: vinculo === FOLHA ? null : vinculo,
      pagamentoData: vinculo === FOLHA ? pagamentoData : null,
      resultadoAnalise: resultado,
      valorGlosa: resultado === 'APROVADO_PARCIALMENTE' ? moedaParaNumero(valorGlosa) : null,
    };
    setSalvando(true);
    try {
      if (item) await glosasApi.atualizar(prestacaoId, item.id, payload);
      else await glosasApi.criar(prestacaoId, payload);
      onSuccess();
    } catch (e) {
      setErro(extrairMensagemErro(e, 'Não foi possível salvar a análise.'));
    } finally {
      setSalvando(false);
    }
  }

  const opcoes = [
    ...docs.map((d) => ({ value: d.id, label: `Doc. nº ${d.numero}${d.credorNome ? ` — ${d.credorNome}` : ''}` })),
    { value: FOLHA, label: 'Folha de pagamento (informar data)' },
  ];

  return (
    <form onSubmit={submeter} onKeyDown={enterComoTab} className="space-y-4">
      {erro && <AlertaErro msg={erro} />}
      <Select label="Vínculo *" name="vinculo" value={vinculo} onChange={(e) => setVinculo(e.target.value)} options={opcoes} />
      {vinculo === FOLHA && <Input label="Data do Pagamento (folha) *" name="pagamentoData" type="date" value={pagamentoData} onChange={(e) => setPagamentoData(e.target.value)} />}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Select label="Resultado *" name="resultado" value={resultado} onChange={(e) => setResultado(e.target.value as ResultadoAnalise)} options={RESULTADO_ANALISE} />
        {resultado === 'APROVADO_PARCIALMENTE' && <Input label="Valor Glosado (R$) *" name="valorGlosa" value={valorGlosa} onChange={(e) => setValorGlosa(mascaraMoeda(e.target.value))} placeholder="0,00" inputMode="numeric" />}
      </div>
      <div className="flex items-center justify-end gap-2 pt-1">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={salvando}>Cancelar</Button>
        <Button type="submit" disabled={salvando}>{salvando && <Loader2 className="h-4 w-4 animate-spin" />}{salvando ? 'Salvando...' : 'Salvar'}</Button>
      </div>
    </form>
  );
}
