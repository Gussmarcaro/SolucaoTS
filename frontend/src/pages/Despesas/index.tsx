import { useEffect, useState } from 'react';
import { Loader2, Pencil, Plus, Trash2 } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { GradeSimples } from '@/components/ui/GradeSimples';
import { AcoesGrade, IconBtn } from '@/components/ui/AcoesGrade';
import type { ColunaDef } from '@/hooks/useResizableColumns';
import { usePermissoes } from '@/contexts/PermissoesContext';
import { despesasApi } from '@/services/despesas.service';
import { extrairMensagemErro } from '@/services/http';
import { dataBr, formatarMoeda, mascaraCpfCnpj } from '@/lib/masks';
import { CATEGORIA_DESPESA } from '@/lib/dominiosFaseV';
import { TIPO_DOCUMENTO_FISCAL_LABEL, type DocumentoFiscal } from '@/types/prestacaoBlocos';
import { DespesaForm } from './DespesaForm';

type ModalState =
  | { tipo: 'fechado' }
  | { tipo: 'form'; item: DocumentoFiscal | null }
  | { tipo: 'excluir'; item: DocumentoFiscal };

const COLUNAS: ColunaDef[] = [
  { key: 'acoes', label: 'Ações', width: 110, minWidth: 100, align: 'center', movivel: false },
  { key: 'numero', label: 'Nº', width: 120, sortKey: 'numero' },
  { key: 'emissao', label: 'Emissão', width: 120, sortKey: 'dataEmissao' },
  { key: 'credor', label: 'Credor', width: 280, sortKey: 'credor' },
  { key: 'descricao', label: 'Descrição', width: 260, sortKey: 'descricao' },
  { key: 'categoria', label: 'Categoria AUDESP', width: 240 },
  { key: 'valor', label: 'Valor bruto', width: 150, align: 'right', sortKey: 'valorBruto' },
  { key: 'rateio', label: 'Rateio', width: 100, align: 'center' },
];

const rotuloCategoria = (codigo: number) =>
  CATEGORIA_DESPESA.find((c) => c.value === String(codigo))?.label ?? String(codigo);

/**
 * Despesas — os documentos fiscais do órgão.
 *
 * A nota é lançada **aqui**, quando a despesa acontece, e não dentro de uma
 * prestação de contas. Era o contrário, e a inversão custava caro: a conta de
 * luz rateada entre cinco ajustes era digitada cinco vezes, uma em cada
 * prestação, e a trava de duplicidade — sendo por prestação — não impedia nada.
 *
 * A prestação depois se apropria das notas do período. É lá que o rateio vira
 * percentual, porque o percentual depende do ajuste, e aqui ainda não se sabe
 * qual.
 */
export function Despesas() {
  const { pode } = usePermissoes();
  const podeEditar = pode('EXECUCAO_DESPESAS', 'EDICAO');

  const [lista, setLista] = useState<DocumentoFiscal[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalState>({ tipo: 'fechado' });
  const [refreshKey, setRefreshKey] = useState(0);
  const [processando, setProcessando] = useState(false);

  useEffect(() => {
    let vivo = true;
    setCarregando(true);
    despesasApi
      .listar()
      .then((r) => vivo && setLista(r))
      .catch((e) => vivo && setErro(extrairMensagemErro(e, 'Falha ao carregar as despesas.')))
      .finally(() => vivo && setCarregando(false));
    return () => {
      vivo = false;
    };
  }, [refreshKey]);

  const recarregar = () => {
    setModal({ tipo: 'fechado' });
    setRefreshKey((k) => k + 1);
  };

  const total = lista.reduce((s, d) => s + d.valorBruto, 0);

  async function excluir() {
    if (modal.tipo !== 'excluir') return;
    setProcessando(true);
    setErro(null);
    try {
      await despesasApi.excluir(modal.item.id);
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
        title="Despesas"
        subtitle="Documentos fiscais do órgão. Lançados aqui uma vez, as prestações de contas se apropriam deles."
        actions={
          podeEditar && (
            <Button variant="success" onClick={() => setModal({ tipo: 'form', item: null })}>
              <Plus className="h-4 w-4" />
              Nova Despesa
            </Button>
          )
        }
      />

      {lista.length > 0 && (
        <p className="mb-3 text-sm text-ink-500 dark:text-ink-400">
          {lista.length} documento(s) · total bruto {formatarMoeda(total)}
        </p>
      )}

      <GradeSimples
        storageKey="@SolucaoTS:grid:despesas:v1"
        colunas={COLUNAS}
        dados={lista}
        chave={(d) => d.id}
        carregando={carregando}
        erro={erro}
        vazio="Nenhum documento fiscal lançado."
        onDuploClique={(d) => podeEditar && setModal({ tipo: 'form', item: d })}
        valorOrdenacao={(campo, d) => {
          if (campo === 'numero') return d.numero;
          if (campo === 'dataEmissao') return d.dataEmissao;
          if (campo === 'credor') return d.credorNome || d.credorNumeroDoc;
          if (campo === 'descricao') return d.descricao;
          if (campo === 'valorBruto') return d.valorBruto;
          return null;
        }}
        renderCell={(coluna, d) => {
          switch (coluna) {
            case 'acoes':
              return (
                <AcoesGrade recurso="EXECUCAO_DESPESAS">
                  <IconBtn exige="EDICAO" title="Editar" onClick={() => setModal({ tipo: 'form', item: d })}>
                    <Pencil className="h-4 w-4" />
                  </IconBtn>
                  <IconBtn exige="TOTAL" title="Excluir" danger onClick={() => setModal({ tipo: 'excluir', item: d })}>
                    <Trash2 className="h-4 w-4" />
                  </IconBtn>
                </AcoesGrade>
              );
            case 'numero':
              return (
                <span className="block truncate font-mono text-xs text-ink-800 dark:text-ink-100" title={d.numero}>
                  {d.numero}
                </span>
              );
            case 'emissao':
              return <span className="block truncate tabular-nums text-ink-600 dark:text-ink-300">{dataBr(d.dataEmissao)}</span>;
            case 'credor':
              return (
                <span className="block truncate text-ink-700 dark:text-ink-200" title={d.credorNome ?? ''}>
                  {d.credorNome || mascaraCpfCnpj(d.credorNumeroDoc)}
                </span>
              );
            case 'descricao':
              return (
                <span className="block truncate text-ink-600 dark:text-ink-300" title={d.descricao}>
                  {d.tipoDocumento ? `${TIPO_DOCUMENTO_FISCAL_LABEL[d.tipoDocumento]} — ` : ''}
                  {d.descricao}
                </span>
              );
            case 'categoria':
              return (
                <span className="block truncate text-ink-500 dark:text-ink-400" title={rotuloCategoria(d.categoriaDespesaTipo)}>
                  {rotuloCategoria(d.categoriaDespesaTipo)}
                </span>
              );
            case 'valor':
              return <span className="block truncate tabular-nums text-ink-700 dark:text-ink-200">{formatarMoeda(d.valorBruto)}</span>;
            case 'rateio':
              return d.rateioProveniente ? <Badge tone="brand">Sim</Badge> : <span className="text-ink-400">—</span>;
            default:
              return null;
          }
        }}
      />

      <p className="mt-4 text-xs text-ink-400">
        A mesma nota pode ser apropriada por <strong>várias prestações</strong> quando é rateada —
        luz, aluguel, contabilidade. O percentual de cada uma é calculado pelo método de rateio, na
        prestação, e não se digita aqui.
      </p>

      <Modal
        open={modal.tipo === 'form'}
        onClose={() => setModal({ tipo: 'fechado' })}
        title={modal.tipo === 'form' && modal.item ? 'Editar Despesa' : 'Nova Despesa'}
        size="2xl"
      >
        {modal.tipo === 'form' && (
          <DespesaForm item={modal.item} onSuccess={recarregar} onCancel={() => setModal({ tipo: 'fechado' })} />
        )}
      </Modal>

      <Modal
        open={modal.tipo === 'excluir'}
        onClose={() => setModal({ tipo: 'fechado' })}
        title="Excluir despesa"
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
              Excluir o documento fiscal{' '}
              <span className="font-semibold text-ink-900 dark:text-ink-50">nº {modal.item.numero}</span>?
            </p>
            <p className="text-xs text-ink-400">
              Se alguma prestação de contas já se apropriou desta nota, a exclusão é recusada — o
              caminho é tirá-la da prestação primeiro.
            </p>
            {erro && <p className="text-sm font-medium text-red-500">{erro}</p>}
          </div>
        )}
      </Modal>
    </>
  );
}
