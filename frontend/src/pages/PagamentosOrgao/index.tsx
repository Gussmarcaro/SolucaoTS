import { useEffect, useState } from 'react';
import { AlertCircle, Loader2, Pencil, Plus, Trash2 } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { GradeSimples } from '@/components/ui/GradeSimples';
import { AcoesGrade, IconBtn } from '@/components/ui/AcoesGrade';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { SelectDominio } from '@/components/ui/SelectDominio';
import { Combobox } from '@/components/ui/Combobox';
import type { ColunaDef } from '@/hooks/useResizableColumns';
import { usePermissoes } from '@/contexts/PermissoesContext';
import { enterComoTab } from '@/lib/enterComoTab';
import { pagamentosOrgaoApi } from '@/services/pagamentosOrgao.service';
import { despesasApi } from '@/services/despesas.service';
import { extrairMensagemErro } from '@/services/http';
import { apenasDigitos, dataBr, formatarMoeda, mascaraMoeda, moedaParaNumero, numeroParaMascaraMoeda } from '@/lib/masks';
import { BANCO, FONTE_RECURSO } from '@/lib/dominiosFaseV';
import type { DocumentoFiscal, MeioPagamento, Pagamento, PagamentoPayload } from '@/types/prestacaoBlocos';

type ModalState =
  | { tipo: 'fechado' }
  | { tipo: 'form'; item: Pagamento | null }
  | { tipo: 'excluir'; item: Pagamento };

const COLUNAS: ColunaDef[] = [
  { key: 'acoes', label: 'Ações', width: 110, minWidth: 100, align: 'center', movivel: false },
  { key: 'data', label: 'Data', width: 130, sortKey: 'dataPagamento' },
  { key: 'vinculo', label: 'Documento', width: 240, sortKey: 'vinculo' },
  { key: 'fonte', label: 'Fonte de recurso', width: 240 },
  { key: 'meio', label: 'Meio', width: 130 },
  { key: 'valor', label: 'Valor', width: 160, align: 'right', sortKey: 'valor' },
];

const FOLHA = 'folha';

const rotuloFonte = (codigo: number) =>
  FONTE_RECURSO.find((f) => f.value === String(codigo))?.label ?? String(codigo);

/**
 * Pagamentos do órgão — Execução → Financeiro.
 *
 * O dinheiro sai quando sai. Antes o pagamento nascia dentro de uma prestação,
 * o que obrigava a abrir a prestação de contas para registrar uma quitação de
 * março — e a prestação só é montada no ano seguinte.
 *
 * A prestação depois **escolhe** quais pagamentos do período entram nela.
 */
export function PagamentosOrgao() {
  const { pode } = usePermissoes();
  const podeEditar = pode('EXECUCAO_PAGAMENTOS', 'EDICAO');

  const [lista, setLista] = useState<Pagamento[]>([]);
  const [docs, setDocs] = useState<DocumentoFiscal[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalState>({ tipo: 'fechado' });
  const [refreshKey, setRefreshKey] = useState(0);
  const [processando, setProcessando] = useState(false);

  useEffect(() => {
    let vivo = true;
    setCarregando(true);
    Promise.all([pagamentosOrgaoApi.listar(), despesasApi.listar().catch(() => [])])
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
  }, [refreshKey]);

  const recarregar = () => {
    setModal({ tipo: 'fechado' });
    setRefreshKey((k) => k + 1);
  };

  const total = lista.reduce((s, p) => s + p.valor, 0);

  async function excluir() {
    if (modal.tipo !== 'excluir') return;
    setProcessando(true);
    setErro(null);
    try {
      await pagamentosOrgaoApi.excluir(modal.item.id);
      recarregar();
    } catch (e) {
      setErro(extrairMensagemErro(e, 'Não foi possível excluir.'));
    } finally {
      setProcessando(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Pagamentos"
        subtitle="Quitações das despesas e da folha. As prestações de contas se apropriam destes lançamentos."
        actions={
          podeEditar && (
            <Button variant="success" onClick={() => setModal({ tipo: 'form', item: null })}>
              <Plus className="h-4 w-4" />
              Novo Pagamento
            </Button>
          )
        }
      />

      {lista.length > 0 && (
        <p className="mb-3 text-sm text-ink-500 dark:text-ink-400">
          {lista.length} pagamento(s) · total {formatarMoeda(total)}
        </p>
      )}

      <GradeSimples
        storageKey="@SolucaoTS:grid:pagamentosOrgao:v1"
        colunas={COLUNAS}
        dados={lista}
        chave={(p) => p.id}
        carregando={carregando}
        erro={erro}
        vazio="Nenhum pagamento lançado."
        onDuploClique={(p) => podeEditar && setModal({ tipo: 'form', item: p })}
        valorOrdenacao={(campo, p) => {
          if (campo === 'dataPagamento') return p.dataPagamento;
          if (campo === 'vinculo') return p.documentoNumero ?? 'Folha';
          if (campo === 'valor') return p.valor;
          return null;
        }}
        renderCell={(coluna, p) => {
          switch (coluna) {
            case 'acoes':
              return (
                <AcoesGrade recurso="EXECUCAO_PAGAMENTOS">
                  <IconBtn exige="EDICAO" title="Editar" onClick={() => setModal({ tipo: 'form', item: p })}>
                    <Pencil className="h-4 w-4" />
                  </IconBtn>
                  <IconBtn exige="TOTAL" title="Excluir" danger onClick={() => setModal({ tipo: 'excluir', item: p })}>
                    <Trash2 className="h-4 w-4" />
                  </IconBtn>
                </AcoesGrade>
              );
            case 'data':
              return <span className="block truncate tabular-nums text-ink-600 dark:text-ink-300">{dataBr(p.dataPagamento)}</span>;
            case 'vinculo':
              return p.documentoNumero ? (
                <span className="block truncate font-mono text-xs text-ink-700 dark:text-ink-200">
                  Doc. nº {p.documentoNumero}
                </span>
              ) : (
                <Badge tone="warning">Folha (9999)</Badge>
              );
            case 'fonte':
              return (
                <span className="block truncate text-ink-500 dark:text-ink-400" title={rotuloFonte(p.fonteRecursoTipo)}>
                  {rotuloFonte(p.fonteRecursoTipo)}
                </span>
              );
            case 'meio':
              return (
                <span className="block truncate text-ink-600 dark:text-ink-300">
                  {p.meioPagamento === 'BANCO' ? 'Banco' : 'Fundo fixo'}
                </span>
              );
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
        title={modal.tipo === 'form' && modal.item ? 'Editar Pagamento' : 'Novo Pagamento'}
        size="xl"
      >
        {modal.tipo === 'form' && (
          <PagamentoOrgaoForm
            item={modal.item}
            docs={docs}
            onSuccess={recarregar}
            onCancel={() => setModal({ tipo: 'fechado' })}
          />
        )}
      </Modal>

      <Modal
        open={modal.tipo === 'excluir'}
        onClose={() => setModal({ tipo: 'fechado' })}
        title="Excluir pagamento"
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
          <div className="space-y-3">
            <p className="text-sm text-ink-600 dark:text-ink-300">
              Excluir o pagamento de{' '}
              <span className="font-semibold text-ink-900 dark:text-ink-50">{formatarMoeda(modal.item.valor)}</span>?
            </p>
            {erro && <p className="text-sm font-medium text-red-500">{erro}</p>}
          </div>
        )}
      </Modal>
    </>
  );
}

/**
 * O pagamento aponta para a despesa, ou para a folha.
 *
 * A lista de documentos vem de Financeiro → Despesas, que é onde as notas agora
 * moram. A folha continua sendo o caso sem documento fiscal (nº 9999 no envio):
 * ela não tem nota, e inventar uma só para satisfazer o vínculo criaria papel
 * que não existe.
 */
function PagamentoOrgaoForm({
  item,
  docs,
  onSuccess,
  onCancel,
}: {
  item: Pagamento | null;
  docs: DocumentoFiscal[];
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const [vinculo, setVinculo] = useState(item?.documentoFiscalId ?? FOLHA);
  const [dataPagamento, setDataPagamento] = useState(item?.dataPagamento ?? '');
  const [valor, setValor] = useState(item ? numeroParaMascaraMoeda(item.valor) : '');
  const [fonte, setFonte] = useState(item ? String(item.fonteRecursoTipo) : '');
  const [meio, setMeio] = useState<MeioPagamento>(item?.meioPagamento ?? 'BANCO');
  const [banco, setBanco] = useState(item?.banco != null ? String(item.banco) : '');
  const [agencia, setAgencia] = useState(item?.agencia != null ? String(item.agencia) : '');
  const [conta, setConta] = useState(item?.contaCorrente ?? '');
  const [transacao, setTransacao] = useState(item?.numeroTransacao ?? '');
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  const opcoesVinculo = [
    { value: FOLHA, label: 'Folha de pagamento (nº 9999)' },
    ...docs.map((d) => ({
      value: d.id,
      label: `Doc. nº ${d.numero}${d.credorNome ? ` — ${d.credorNome}` : ''}`,
      sub: `${dataBr(d.dataEmissao)} · ${formatarMoeda(d.valorBruto)}`,
    })),
  ];

  /** Quanto a nota escolhida já tem pago — para não quitar duas vezes. */
  const docEscolhido = docs.find((d) => d.id === vinculo) ?? null;

  async function submeter(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    if (!dataPagamento) return setErro('Informe a data do pagamento.');
    const v = moedaParaNumero(valor);
    if (v <= 0) return setErro('Valor inválido.');
    if (!fonte.trim()) return setErro('Informe a fonte de recurso.');

    const payload: PagamentoPayload = {
      documentoFiscalId: vinculo === FOLHA ? null : vinculo,
      dataPagamento,
      valor: v,
      fonteRecursoTipo: Number(apenasDigitos(fonte)),
      meioPagamento: meio,
      banco: meio === 'BANCO' && banco ? Number(apenasDigitos(banco)) : null,
      agencia: meio === 'BANCO' && agencia ? Number(apenasDigitos(agencia)) : null,
      contaCorrente: meio === 'BANCO' ? conta.trim() || null : null,
      numeroTransacao: transacao.trim() || null,
    };

    setSalvando(true);
    try {
      if (item) await pagamentosOrgaoApi.atualizar(item.id, payload);
      else await pagamentosOrgaoApi.criar(payload);
      onSuccess();
    } catch (e) {
      setErro(extrairMensagemErro(e, 'Não foi possível salvar o pagamento.'));
    } finally {
      setSalvando(false);
    }
  }

  return (
    <form onSubmit={submeter} onKeyDown={enterComoTab} className="space-y-4">
      {erro && (
        <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{erro}</span>
        </div>
      )}

      <Combobox
        label="Documento / vínculo *"
        name="vinculo"
        value={vinculo}
        onChange={setVinculo}
        options={opcoesVinculo}
        placeholder="Selecione o documento ou a folha..."
        hint="Os documentos vêm de Execução → Financeiro → Despesas."
      />
      {docEscolhido && (
        <p className="-mt-2 text-xs text-ink-400">
          Nota de {formatarMoeda(docEscolhido.valorBruto)}
          {docEscolhido.valorEncargos > 0 && ` · retenções ${formatarMoeda(docEscolhido.valorEncargos)}`}
          {docEscolhido.valorEncargos > 0 &&
            ` · líquido ${formatarMoeda(docEscolhido.valorBruto - docEscolhido.valorEncargos)}`}
        </p>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input label="Data do pagamento *" name="dataPagamento" type="date" value={dataPagamento} onChange={(e) => setDataPagamento(e.target.value)} />
        <Input label="Valor (R$) *" name="valor" value={valor} onChange={(e) => setValor(mascaraMoeda(e.target.value))} placeholder="0,00" inputMode="numeric" />
        <SelectDominio label="Fonte de Recurso *" name="fonte" value={apenasDigitos(fonte)} onChange={setFonte} options={FONTE_RECURSO} />
        <Select
          label="Meio de pagamento *"
          name="meio"
          value={meio}
          onChange={(e) => setMeio(e.target.value as MeioPagamento)}
          options={[
            { value: 'BANCO', label: 'Banco' },
            { value: 'FUNDO_FIXO', label: 'Fundo fixo' },
          ]}
        />
      </div>

      {/* Só no banco: fundo fixo não tem conta de onde sair, e campos que não
          se aplicam pedem dado que ninguém tem. */}
      {meio === 'BANCO' && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-12">
          <div className="sm:col-span-5">
            <SelectDominio label="Banco" name="banco" value={apenasDigitos(banco)} onChange={setBanco} options={BANCO} />
          </div>
          <div className="sm:col-span-3">
            <Input label="Agência" name="agencia" value={apenasDigitos(agencia)} onChange={(e) => setAgencia(e.target.value)} inputMode="numeric" />
          </div>
          <div className="sm:col-span-4">
            <Input label="Conta Corrente" name="conta" value={conta} onChange={(e) => setConta(e.target.value)} />
          </div>
        </div>
      )}

      <Input label="Nº da transação (opcional)" name="transacao" value={transacao} onChange={(e) => setTransacao(e.target.value)} />

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
