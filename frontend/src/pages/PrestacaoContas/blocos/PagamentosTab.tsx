import { useEffect, useState } from 'react';
import { AlertCircle, Loader2, Pencil, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { GradeSimples } from '@/components/ui/GradeSimples';
import type { ColunaDef } from '@/hooks/useResizableColumns';
import { enterComoTab } from '@/lib/enterComoTab';
import { SelectDominio } from '@/components/ui/SelectDominio';
import { BANCO, FONTE_RECURSO } from '@/lib/dominiosFaseV';
import { Badge } from '@/components/ui/Badge';
import { apenasDigitos, dataBr, formatarMoeda, mascaraMoeda, moedaParaNumero, numeroParaMascaraMoeda } from '@/lib/masks';
import { extrairMensagemErro } from '@/services/http';
import {
  atualizarPagamento,
  criarPagamento,
  excluirPagamento,
  listarDocumentosFiscais,
  listarPagamentos,
} from '@/services/prestacaoBlocos.service';
import type { DocumentoFiscal, MeioPagamento, Pagamento, PagamentoPayload } from '@/types/prestacaoBlocos';
import { ConfirmarExclusao } from '@/pages/Ajustes/tabs/TermosAditivosTab';

const FOLHA = 'folha';

type ModalState =
  | { tipo: 'fechado' }
  | { tipo: 'form'; pg: Pagamento | null }
  | { tipo: 'excluir'; pg: Pagamento };

/** Ações sempre primeiro, como nas grades dos cadastros. */
const COLUNAS: ColunaDef[] = [
  { key: 'acoes', label: 'Ações', width: 100, minWidth: 90, align: 'center', movivel: false },
  { key: 'vinculo', label: 'Vínculo', width: 200, sortKey: 'vinculo' },
  { key: 'data', label: 'Data', width: 140, sortKey: 'dataPagamento' },
  { key: 'meio', label: 'Meio', width: 150, sortKey: 'meioPagamento' },
  { key: 'valor', label: 'Valor', width: 170, align: 'right', sortKey: 'valor' },
];

export function PagamentosTab({ prestacaoId }: { prestacaoId: string }) {
  const [lista, setLista] = useState<Pagamento[]>([]);
  const [docs, setDocs] = useState<DocumentoFiscal[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalState>({ tipo: 'fechado' });
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let vivo = true;
    setCarregando(true);
    Promise.all([listarPagamentos(prestacaoId), listarDocumentosFiscais(prestacaoId)])
      .then(([pgs, ds]) => {
        if (!vivo) return;
        setLista(pgs);
        setDocs(ds);
      })
      .catch((e) => vivo && setErro(extrairMensagemErro(e, 'Falha ao carregar os pagamentos.')))
      .finally(() => vivo && setCarregando(false));
    return () => {
      vivo = false;
    };
  }, [prestacaoId, refreshKey]);

  const recarregar = () => {
    setModal({ tipo: 'fechado' });
    setRefreshKey((k) => k + 1);
  };
  const total = lista.reduce((s, p) => s + p.valor, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-ink-500 dark:text-ink-400">
          {lista.length > 0 ? `${lista.length} pagamento(s) · total ${formatarMoeda(total)}` : 'Folha vai aqui (nº 9999), pelo valor líquido, sem documento fiscal.'}
        </p>
        <Button size="sm" onClick={() => setModal({ tipo: 'form', pg: null })}>
          <Plus className="h-4 w-4" />
          Adicionar
        </Button>
      </div>

      <GradeSimples
        storageKey="@SolucaoTS:grid:pagamentos:v1"
        colunas={COLUNAS}
        dados={lista}
        chave={(p) => p.id}
        carregando={carregando}
        erro={erro}
        vazio="Nenhum pagamento cadastrado."
        onDuploClique={(p) => setModal({ tipo: 'form', pg: p })}
        valorOrdenacao={(campo, p) => {
          if (campo === 'vinculo') return p.documentoNumero ?? 'Folha';
          if (campo === 'dataPagamento') return p.dataPagamento;
          if (campo === 'meioPagamento') return p.meioPagamento;
          if (campo === 'valor') return p.valor;
          return null;
        }}
        renderCell={(coluna, p) => {
          switch (coluna) {
            case 'acoes':
              return (
                <div className="flex items-center justify-center gap-1">
                  <IconBtn title="Editar" onClick={() => setModal({ tipo: 'form', pg: p })}><Pencil className="h-4 w-4" /></IconBtn>
                  <IconBtn title="Excluir" danger onClick={() => setModal({ tipo: 'excluir', pg: p })}><Trash2 className="h-4 w-4" /></IconBtn>
                </div>
              );
            case 'vinculo':
              return p.documentoNumero ? (
                <span className="block truncate font-mono text-xs text-ink-700 dark:text-ink-200">Doc. nº {p.documentoNumero}</span>
              ) : (
                <Badge tone="warning">Folha (9999)</Badge>
              );
            case 'data':
              return <span className="block truncate text-ink-600 dark:text-ink-300">{dataBr(p.dataPagamento)}</span>;
            case 'meio':
              return <span className="block truncate text-ink-600 dark:text-ink-300">{p.meioPagamento === 'BANCO' ? 'Banco' : 'Fundo fixo'}</span>;
            case 'valor':
              return <span className="block truncate tabular-nums text-ink-700 dark:text-ink-200">{formatarMoeda(p.valor)}</span>;
            default:
              return null;
          }
        }}
      />

      <Modal
        open={modal.tipo === 'form'}
        onClose={() => setModal({ tipo: 'fechado' })}
        title={modal.tipo === 'form' && modal.pg ? 'Editar Pagamento' : 'Novo Pagamento'}
        size="lg"
      >
        {modal.tipo === 'form' && (
          <PgForm prestacaoId={prestacaoId} pg={modal.pg} docs={docs} onSuccess={recarregar} onCancel={() => setModal({ tipo: 'fechado' })} />
        )}
      </Modal>

      <ConfirmarExclusao
        aberto={modal.tipo === 'excluir'}
        rotulo={modal.tipo === 'excluir' ? 'este pagamento' : ''}
        onCancel={() => setModal({ tipo: 'fechado' })}
        onConfirm={async () => {
          if (modal.tipo !== 'excluir') return;
          await excluirPagamento(prestacaoId, modal.pg.id);
          recarregar();
        }}
      />
    </div>
  );
}

function PgForm({
  prestacaoId,
  pg,
  docs,
  onSuccess,
  onCancel,
}: {
  prestacaoId: string;
  pg: Pagamento | null;
  docs: DocumentoFiscal[];
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const [vinculo, setVinculo] = useState(pg ? (pg.documentoFiscalId ?? FOLHA) : FOLHA);
  const [dataPagamento, setDataPagamento] = useState(pg?.dataPagamento ?? '');
  const [valor, setValor] = useState(pg ? numeroParaMascaraMoeda(pg.valor) : '');
  const [fonte, setFonte] = useState(pg ? String(pg.fonteRecursoTipo) : '');
  const [meio, setMeio] = useState<MeioPagamento>(pg?.meioPagamento ?? 'BANCO');
  const [banco, setBanco] = useState(pg?.banco != null ? String(pg.banco) : '');
  const [agencia, setAgencia] = useState(pg?.agencia != null ? String(pg.agencia) : '');
  const [conta, setConta] = useState(pg?.contaCorrente ?? '');
  const [transacao, setTransacao] = useState(pg?.numeroTransacao ?? '');
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  async function submeter(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    if (!dataPagamento) return setErro('Informe a data de pagamento.');
    if (moedaParaNumero(valor) <= 0) return setErro('Valor inválido.');
    if (!fonte.trim()) return setErro('Informe a fonte de recurso.');
    if (meio === 'BANCO' && (!banco.trim() || !agencia.trim() || !conta.trim()))
      return setErro('Para Banco, informe banco, agência e conta corrente.');

    const payload: PagamentoPayload = {
      documentoFiscalId: vinculo === FOLHA ? null : vinculo,
      dataPagamento,
      valor: moedaParaNumero(valor),
      fonteRecursoTipo: Number(apenasDigitos(fonte)),
      meioPagamento: meio,
      banco: meio === 'BANCO' ? Number(apenasDigitos(banco)) : null,
      agencia: meio === 'BANCO' ? Number(apenasDigitos(agencia)) : null,
      contaCorrente: meio === 'BANCO' ? conta.trim() : null,
      numeroTransacao: transacao.trim() || null,
    };

    setSalvando(true);
    try {
      if (pg) await atualizarPagamento(prestacaoId, pg.id, payload);
      else await criarPagamento(prestacaoId, payload);
      onSuccess();
    } catch (e) {
      setErro(extrairMensagemErro(e, 'Não foi possível salvar o pagamento.'));
    } finally {
      setSalvando(false);
    }
  }

  const opcoesVinculo = [
    { value: FOLHA, label: 'Folha de pagamento (nº 9999)' },
    ...docs.map((d) => ({ value: d.id, label: `Doc. nº ${d.numero}${d.credorNome ? ` — ${d.credorNome}` : ''}` })),
  ];

  return (
    <form onSubmit={submeter} onKeyDown={enterComoTab} className="space-y-4">
      {erro && (
        <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{erro}</span>
        </div>
      )}
      <Select label="Vínculo *" name="vinculo" value={vinculo} onChange={(e) => setVinculo(e.target.value)} options={opcoesVinculo} />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input label="Data do Pagamento *" name="dataPagamento" type="date" value={dataPagamento} onChange={(e) => setDataPagamento(e.target.value)} />
        <Input label="Valor (R$) *" name="valor" value={valor} onChange={(e) => setValor(mascaraMoeda(e.target.value))} placeholder="0,00" inputMode="numeric" />
        <SelectDominio label="Fonte de Recurso *" name="fonte" value={apenasDigitos(fonte)} onChange={setFonte} options={FONTE_RECURSO} />
        <Select label="Meio de Pagamento *" name="meio" value={meio} onChange={(e) => setMeio(e.target.value as MeioPagamento)} options={[{ value: 'BANCO', label: 'Banco' }, { value: 'FUNDO_FIXO', label: 'Fundo fixo' }]} />
      </div>
      {meio === 'BANCO' && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <SelectDominio label="Banco *" name="banco" value={apenasDigitos(banco)} onChange={setBanco} options={BANCO} />
          <Input label="Agência *" name="agencia" value={apenasDigitos(agencia)} onChange={(e) => setAgencia(e.target.value)} inputMode="numeric" />
          <Input label="Conta Corrente *" name="conta" value={conta} onChange={(e) => setConta(e.target.value)} />
        </div>
      )}
      <Input label="Nº da Transação (opcional)" name="transacao" value={transacao} onChange={(e) => setTransacao(e.target.value)} />
      <div className="flex items-center justify-end gap-2 pt-1">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={salvando}>Cancelar</Button>
        <Button type="submit" disabled={salvando}>
          {salvando && <Loader2 className="h-4 w-4 animate-spin" />}
          {salvando ? 'Salvando...' : 'Salvar'}
        </Button>
      </div>
    </form>
  );
}

function IconBtn({ children, title, onClick, danger }: { children: React.ReactNode; title: string; onClick: () => void; danger?: boolean }) {
  return (
    <button type="button" title={title} onClick={onClick} className={`focus-ring rounded-lg p-1.5 transition-colors ${danger ? 'text-ink-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10' : 'text-ink-400 hover:bg-ink-100 hover:text-ink-700 dark:hover:bg-ink-800 dark:hover:text-ink-200'}`}>
      {children}
    </button>
  );
}
