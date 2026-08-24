import { useEffect, useState } from 'react';
import { Loader2, Pencil, Plus, Power, Trash2 } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { GradeSimples } from '@/components/ui/GradeSimples';
import { AcoesGrade, IconBtn } from '@/components/ui/AcoesGrade';
import type { ColunaDef } from '@/hooks/useResizableColumns';
import { usePermissoes } from '@/contexts/PermissoesContext';
import { RateioForm } from './RateioForm';
import {
  definirAtivoRateio,
  excluirRateio,
  listarRateios,
} from '@/services/rateios.service';
import { extrairMensagemErro } from '@/services/http';
import { dataBr } from '@/lib/masks';
import { definicaoDoMetodo, type Rateio } from '@/types/rateio';

type ModalState =
  | { tipo: 'fechado' }
  | { tipo: 'novo' }
  | { tipo: 'editar'; r: Rateio }
  | { tipo: 'status'; r: Rateio }
  | { tipo: 'excluir'; r: Rateio };

const COLUNAS: ColunaDef[] = [
  { key: 'acoes', label: 'Ações', width: 130, minWidth: 110, align: 'center', movivel: false },
  { key: 'titulo', label: 'Título', width: 320, sortKey: 'titulo' },
  { key: 'metodo', label: 'Método', width: 260, sortKey: 'metodo' },
  { key: 'periodo', label: 'Período Adotado', width: 220, sortKey: 'vigenciaInicio' },
  { key: 'participantes', label: 'Ajustes', width: 100, align: 'right' },
  { key: 'situacao', label: 'Situação', width: 120, align: 'center' },
];

/**
 * Cadastro do Rateio — métodos de distribuição de despesa entre ajustes.
 *
 * Um órgão pode ter vários ao mesmo tempo: um pela receita para despesa
 * administrativa, outro por número de colaboradores para folha. O método se
 * escolhe pela natureza da despesa, e por isso a tela não impede sobreposição
 * de períodos — impedir tornaria a regra do negócio impossível de exprimir.
 */
export function Rateios() {
  const { pode } = usePermissoes();
  const podeEditar = pode('CADASTRO_RATEIO', 'EDICAO');

  const [lista, setLista] = useState<Rateio[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalState>({ tipo: 'fechado' });
  const [refreshKey, setRefreshKey] = useState(0);
  const [processando, setProcessando] = useState(false);

  useEffect(() => {
    let vivo = true;
    setCarregando(true);
    listarRateios({ page: 1, pageSize: 100, orderBy: 'vigenciaInicio', orderDir: 'desc' })
      .then((r) => vivo && setLista(r.data))
      .catch((e) => vivo && setErro(extrairMensagemErro(e, 'Falha ao carregar os rateios.')))
      .finally(() => vivo && setCarregando(false));
    return () => {
      vivo = false;
    };
  }, [refreshKey]);

  const fechar = () => setModal({ tipo: 'fechado' });
  const recarregar = () => {
    fechar();
    setRefreshKey((k) => k + 1);
  };

  async function confirmar(acao: 'status' | 'excluir') {
    if (modal.tipo !== acao) return;
    setProcessando(true);
    setErro(null);
    try {
      if (acao === 'status') await definirAtivoRateio(modal.r.id, !modal.r.ativo);
      else await excluirRateio(modal.r.id);
      recarregar();
    } catch (e) {
      setErro(extrairMensagemErro(e, 'Não foi possível concluir a operação.'));
    } finally {
      setProcessando(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Cadastro do Rateio"
        subtitle="Métodos de rateio administrativo (custos indiretos) para distribuir despesas entre os ajustes, por período."
        actions={
          podeEditar && (
            <Button variant="success" onClick={() => setModal({ tipo: 'novo' })}>
              <Plus className="h-4 w-4" />
              Novo Rateio
            </Button>
          )
        }
      />

      <GradeSimples
        storageKey="@SolucaoTS:grid:rateios:v1"
        colunas={COLUNAS}
        dados={lista}
        chave={(r) => r.id}
        carregando={carregando}
        erro={erro}
        vazio="Nenhum rateio cadastrado."
        onDuploClique={(r) => podeEditar && setModal({ tipo: 'editar', r })}
        valorOrdenacao={(campo, r) => {
          if (campo === 'titulo') return r.titulo;
          if (campo === 'metodo') return r.metodo;
          if (campo === 'vigenciaInicio') return r.vigenciaInicio;
          return null;
        }}
        renderCell={(coluna, r) => {
          switch (coluna) {
            case 'acoes':
              return (
                <AcoesGrade recurso="CADASTRO_RATEIO">
                  <IconBtn exige="EDICAO" title="Editar" onClick={() => setModal({ tipo: 'editar', r })}>
                    <Pencil className="h-4 w-4" />
                  </IconBtn>
                  <IconBtn
                    exige="EDICAO"
                    title={r.ativo ? 'Inativar' : 'Reativar'}
                    onClick={() => setModal({ tipo: 'status', r })}
                  >
                    <Power className="h-4 w-4" />
                  </IconBtn>
                  <IconBtn exige="TOTAL" title="Excluir" danger onClick={() => setModal({ tipo: 'excluir', r })}>
                    <Trash2 className="h-4 w-4" />
                  </IconBtn>
                </AcoesGrade>
              );
            case 'titulo':
              return (
                <span className="block truncate text-ink-800 dark:text-ink-100" title={r.titulo}>
                  {r.titulo}
                </span>
              );
            case 'metodo':
              return (
                <span className="block truncate text-ink-600 dark:text-ink-300">
                  {definicaoDoMetodo(r.metodo)?.rotulo ?? r.metodo}
                </span>
              );
            case 'periodo':
              return (
                <span className="block truncate tabular-nums text-ink-600 dark:text-ink-300">
                  {dataBr(r.vigenciaInicio)} a {dataBr(r.vigenciaFim)}
                </span>
              );
            case 'participantes':
              return (
                <span className="block truncate tabular-nums text-ink-600 dark:text-ink-300">
                  {r.participantes.length}
                </span>
              );
            case 'situacao':
              return <Badge tone={r.ativo ? 'success' : 'neutral'}>{r.ativo ? 'Ativo' : 'Inativo'}</Badge>;
            default:
              return null;
          }
        }}
      />

      <p className="mt-4 text-xs text-ink-400">
        Períodos <strong>podem</strong> se sobrepor: um rateio pela receita e outro por número de
        colaboradores valem ao mesmo tempo, porque o método se escolhe pela natureza da despesa.
        Cadastro antigo não é substituído quando um novo entra — o histórico fica.
      </p>

      <Modal
        open={modal.tipo === 'novo' || modal.tipo === 'editar'}
        onClose={fechar}
        title={modal.tipo === 'editar' ? 'Editar Rateio' : 'Novo Rateio'}
        size="2xl"
      >
        {(modal.tipo === 'novo' || modal.tipo === 'editar') && (
          <RateioForm
            rateio={modal.tipo === 'editar' ? modal.r : null}
            onSuccess={recarregar}
            onCancel={fechar}
          />
        )}
      </Modal>

      <Modal
        open={modal.tipo === 'status'}
        onClose={fechar}
        title={modal.tipo === 'status' && modal.r.ativo ? 'Inativar rateio' : 'Reativar rateio'}
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={fechar} disabled={processando}>
              Cancelar
            </Button>
            <Button
              variant={modal.tipo === 'status' && modal.r.ativo ? 'danger' : 'primary'}
              onClick={() => confirmar('status')}
              disabled={processando}
            >
              {processando && <Loader2 className="h-4 w-4 animate-spin" />}
              Confirmar
            </Button>
          </>
        }
      >
        {modal.tipo === 'status' && (
          <div className="space-y-3">
            <p className="text-sm text-ink-600 dark:text-ink-300">
              Deseja {modal.r.ativo ? 'inativar' : 'reativar'} o rateio{' '}
              <span className="font-semibold text-ink-900 dark:text-ink-50">{modal.r.titulo}</span>?
            </p>
            <p className="text-xs text-ink-400">
              Inativar não apaga: o rateio deixa de ser oferecido para uso, e o histórico permanece.
            </p>
            {erro && <p className="text-sm font-medium text-red-500">{erro}</p>}
          </div>
        )}
      </Modal>

      <Modal
        open={modal.tipo === 'excluir'}
        onClose={fechar}
        title="Excluir rateio"
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={fechar} disabled={processando}>
              Cancelar
            </Button>
            <Button variant="danger" onClick={() => confirmar('excluir')} disabled={processando}>
              {processando && <Loader2 className="h-4 w-4 animate-spin" />}
              Excluir
            </Button>
          </>
        }
      >
        {modal.tipo === 'excluir' && (
          <div className="space-y-3">
            <p className="text-sm text-ink-600 dark:text-ink-300">
              Excluir <span className="font-semibold text-ink-900 dark:text-ink-50">{modal.r.titulo}</span>?
            </p>
            <p className="text-xs text-ink-400">
              Para tirar de uso sem perder o histórico, prefira <strong>inativar</strong>.
            </p>
            {erro && <p className="text-sm font-medium text-red-500">{erro}</p>}
          </div>
        )}
      </Modal>
    </>
  );
}
