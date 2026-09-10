import { useEffect, useState } from 'react';
import { Loader2, Pencil, Plus, Trash2 } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { GradeSimples } from '@/components/ui/GradeSimples';
import { AcoesGrade, IconBtn } from '@/components/ui/AcoesGrade';
import type { ColunaDef } from '@/hooks/useResizableColumns';
import { usePermissoes } from '@/contexts/PermissoesContext';
import { receitasOrgaoApi } from '@/services/receitasOrgao.service';
import { extrairMensagemErro } from '@/services/http';
import { dataBr, formatarMoeda } from '@/lib/masks';
import { FONTE_RECURSO } from '@/lib/dominiosFaseV';
import { RECEITA_TIPO_LABEL, type Receita } from '@/types/prestacaoBlocos2';
import { ReceitaOrgaoForm } from './ReceitaOrgaoForm';

type ModalState =
  | { tipo: 'fechado' }
  | { tipo: 'form'; item: Receita | null }
  | { tipo: 'excluir'; item: Receita };

const COLUNAS: ColunaDef[] = [
  { key: 'acoes', label: 'Ações', width: 110, minWidth: 100, align: 'center', movivel: false },
  { key: 'data', label: 'Recebimento', width: 140, sortKey: 'dataRepasse' },
  { key: 'tipo', label: 'Tipo', width: 240, sortKey: 'tipo' },
  { key: 'descricao', label: 'Descrição', width: 260, sortKey: 'descricao' },
  { key: 'fonte', label: 'Fonte de recurso', width: 240 },
  { key: 'valor', label: 'Valor', width: 160, align: 'right', sortKey: 'valor' },
];

const rotuloFonte = (codigo: number | null) =>
  codigo == null ? '—' : (FONTE_RECURSO.find((f) => f.value === String(codigo))?.label ?? String(codigo));

/**
 * Receitas do órgão — Execução → Financeiro.
 *
 * O dinheiro entra quando entra, e a prestação de contas é o retrato disso num
 * exercício. Antes a receita nascia dentro de uma prestação, o que invertia a
 * ordem real dos fatos e obrigava a abrir a prestação para registrar um repasse
 * recebido em janeiro.
 *
 * A prestação depois **escolhe** quais receitas do período entram nela — e a
 * escolha é explícita, para que um lançamento errado não vá ao Tribunal só por
 * ter caído na data certa.
 */
export function ReceitasOrgao() {
  const { pode } = usePermissoes();
  const podeEditar = pode('EXECUCAO_RECEITAS', 'EDICAO');

  const [lista, setLista] = useState<Receita[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalState>({ tipo: 'fechado' });
  const [refreshKey, setRefreshKey] = useState(0);
  const [processando, setProcessando] = useState(false);

  useEffect(() => {
    let vivo = true;
    setCarregando(true);
    receitasOrgaoApi
      .listar()
      .then((r) => vivo && setLista(r))
      .catch((e) => vivo && setErro(extrairMensagemErro(e, 'Falha ao carregar as receitas.')))
      .finally(() => vivo && setCarregando(false));
    return () => {
      vivo = false;
    };
  }, [refreshKey]);

  const recarregar = () => {
    setModal({ tipo: 'fechado' });
    setRefreshKey((k) => k + 1);
  };

  const total = lista.reduce((s, r) => s + r.valor, 0);

  async function excluir() {
    if (modal.tipo !== 'excluir') return;
    setProcessando(true);
    setErro(null);
    try {
      await receitasOrgaoApi.excluir(modal.item.id);
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
        title="Receitas"
        subtitle="Repasses recebidos, aplicações financeiras e demais entradas. As prestações de contas se apropriam destes lançamentos."
        actions={
          podeEditar && (
            <Button variant="success" onClick={() => setModal({ tipo: 'form', item: null })}>
              <Plus className="h-4 w-4" />
              Nova Receita
            </Button>
          )
        }
      />

      {lista.length > 0 && (
        <p className="mb-3 text-sm text-ink-500 dark:text-ink-400">
          {lista.length} lançamento(s) · total {formatarMoeda(total)}
        </p>
      )}

      <GradeSimples
        storageKey="@SolucaoTS:grid:receitasOrgao:v1"
        colunas={COLUNAS}
        dados={lista}
        chave={(r) => r.id}
        carregando={carregando}
        erro={erro}
        vazio="Nenhuma receita lançada."
        onDuploClique={(r) => podeEditar && setModal({ tipo: 'form', item: r })}
        valorOrdenacao={(campo, r) => {
          if (campo === 'dataRepasse') return r.dataRepasse;
          if (campo === 'tipo') return RECEITA_TIPO_LABEL[r.tipo];
          if (campo === 'descricao') return r.descricao;
          if (campo === 'valor') return r.valor;
          return null;
        }}
        renderCell={(coluna, r) => {
          switch (coluna) {
            case 'acoes':
              return (
                <AcoesGrade recurso="EXECUCAO_RECEITAS">
                  <IconBtn exige="EDICAO" title="Editar" onClick={() => setModal({ tipo: 'form', item: r })}>
                    <Pencil className="h-4 w-4" />
                  </IconBtn>
                  <IconBtn exige="TOTAL" title="Excluir" danger onClick={() => setModal({ tipo: 'excluir', item: r })}>
                    <Trash2 className="h-4 w-4" />
                  </IconBtn>
                </AcoesGrade>
              );
            case 'data':
              return (
                <span className="block truncate tabular-nums text-ink-600 dark:text-ink-300">
                  {r.dataRepasse ? dataBr(r.dataRepasse) : '—'}
                </span>
              );
            case 'tipo':
              return (
                <span className="block truncate text-ink-700 dark:text-ink-200" title={RECEITA_TIPO_LABEL[r.tipo]}>
                  {RECEITA_TIPO_LABEL[r.tipo]}
                </span>
              );
            case 'descricao':
              return (
                <span className="block truncate text-ink-500 dark:text-ink-400" title={r.descricao ?? ''}>
                  {r.descricao ?? '—'}
                </span>
              );
            case 'fonte':
              return (
                <span className="block truncate text-ink-500 dark:text-ink-400" title={rotuloFonte(r.fonteRecursoTipo)}>
                  {rotuloFonte(r.fonteRecursoTipo)}
                </span>
              );
            case 'valor':
              return (
                <span className={`block truncate tabular-nums ${r.valor < 0 ? 'text-red-500' : 'text-ink-700 dark:text-ink-200'}`}>
                  {formatarMoeda(r.valor)}
                </span>
              );
            default:
              return null;
          }
        }}
      />

      <Modal
        open={modal.tipo === 'form'}
        onClose={() => setModal({ tipo: 'fechado' })}
        title={modal.tipo === 'form' && modal.item ? 'Editar Receita' : 'Nova Receita'}
        size="xl"
      >
        {modal.tipo === 'form' && (
          <ReceitaOrgaoForm item={modal.item} onSuccess={recarregar} onCancel={() => setModal({ tipo: 'fechado' })} />
        )}
      </Modal>

      <Modal
        open={modal.tipo === 'excluir'}
        onClose={() => setModal({ tipo: 'fechado' })}
        title="Excluir receita"
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
              Excluir a receita de{' '}
              <span className="font-semibold text-ink-900 dark:text-ink-50">{formatarMoeda(modal.item.valor)}</span>?
            </p>
            <p className="text-xs text-ink-400">
              Se alguma prestação de contas já se apropriou deste lançamento, tire-o da prestação
              antes.
            </p>
            {erro && <p className="text-sm font-medium text-red-500">{erro}</p>}
          </div>
        )}
      </Modal>
    </>
  );
}
