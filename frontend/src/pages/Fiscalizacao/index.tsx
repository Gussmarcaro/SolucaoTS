import { useCallback, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { CalendarClock, CheckCircle2, ClipboardList, Loader2, Plus, TriangleAlert } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { KpiTile } from '@/components/ui/KpiTile';
import { usePermissoes } from '@/contexts/PermissoesContext';
import { TarefaForm } from './TarefaForm';
import { TarefasList, type Recorte } from './TarefasList';
import { definirStatusTarefa, excluirTarefa, resumoTarefas } from '@/services/tarefas.service';
import { extrairMensagemErro } from '@/services/http';
import type { ResumoTarefas, StatusTarefa, Tarefa, TarefaPayload } from '@/types/tarefa';

type ModalState =
  | { tipo: 'fechado' }
  | { tipo: 'novo'; inicial?: Partial<TarefaPayload> | null }
  | { tipo: 'editar'; tarefa: Tarefa }
  | { tipo: 'excluir'; tarefa: Tarefa };

/**
 * Fiscalização | Monitoramento — as providências e seus prazos.
 *
 * O sino calcula prazos a partir dos dados; esta tela guarda o que foi feito a
 * respeito. Sem ela o sistema sabe cobrar e não sabe que já foi atendido — e um
 * aviso que continua piscando depois de resolvido ensina o usuário a ignorá-lo.
 */
export function Fiscalizacao() {
  const podeEditar = usePermissoes().pode('FISCALIZACAO', 'EDICAO');
  const navigate = useNavigate();
  const location = useLocation();
  const [modal, setModal] = useState<ModalState>({ tipo: 'fechado' });
  const [recorte, setRecorte] = useState<Recorte>('abertas');
  const [refreshKey, setRefreshKey] = useState(0);
  const [resumo, setResumo] = useState<ResumoTarefas | null>(null);
  const [processando, setProcessando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const recarregar = useCallback(() => setRefreshKey((k) => k + 1), []);

  useEffect(() => {
    let vivo = true;
    resumoTarefas()
      .then((r) => vivo && setResumo(r))
      .catch(() => vivo && setResumo(null));
    return () => {
      vivo = false;
    };
  }, [refreshKey]);

  /*
   * O sino manda para cá com a tarefa já esboçada (título, prazo, ajuste e a
   * chave do alerta). Abrir o formulário preenchido é o que faz a ligação valer
   * a pena: de outro modo o usuário redigitaria o que o sistema já sabe, e
   * erraria a chave — que é justamente o que liga a tarefa de volta ao prazo.
   */
  useEffect(() => {
    const nova = (location.state as { novaTarefa?: Partial<TarefaPayload> } | null)?.novaTarefa;
    if (!nova) return;
    setModal({ tipo: 'novo', inicial: nova });
    navigate(location.pathname, { replace: true, state: null });
  }, [location, navigate]);

  const fechar = () => setModal({ tipo: 'fechado' });

  function aoSalvar() {
    fechar();
    recarregar();
  }

  async function alterarStatus(tarefa: Tarefa, status: StatusTarefa) {
    setErro(null);
    try {
      await definirStatusTarefa(tarefa.id, status);
      recarregar();
    } catch (e) {
      setErro(extrairMensagemErro(e, 'Não foi possível alterar a situação da tarefa.'));
    }
  }

  async function confirmarExclusao() {
    if (modal.tipo !== 'excluir') return;
    setProcessando(true);
    setErro(null);
    try {
      await excluirTarefa(modal.tarefa.id);
      aoSalvar();
    } catch (e) {
      setErro(extrairMensagemErro(e, 'Não foi possível excluir a tarefa.'));
    } finally {
      setProcessando(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Fiscalização | Monitoramento"
        subtitle="Providências e prazos do acompanhamento das parcerias — inclusive os que nascem dos alertas do sino."
        actions={
          podeEditar && (
            <Button variant="success" onClick={() => setModal({ tipo: 'novo' })}>
              <Plus className="h-4 w-4" />
              Nova Tarefa
            </Button>
          )
        }
      />

      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiTile
          label="Em aberto"
          valor={resumo ? String(resumo.abertas) : null}
          icone={ClipboardList}
          rodape="Pendentes e em andamento"
          onClick={() => setRecorte('abertas')}
        />
        <KpiTile
          label="Atrasadas"
          valor={resumo ? String(resumo.atrasadas) : null}
          icone={TriangleAlert}
          rodape="Prazo já vencido"
          onClick={() => setRecorte('atrasadas')}
        />
        <KpiTile
          label="Vencem em 7 dias"
          valor={resumo ? String(resumo.venceEm7Dias) : null}
          icone={CalendarClock}
          rodape="Janela crítica"
          onClick={() => setRecorte('abertas')}
        />
        <KpiTile
          label="Concluídas"
          valor={resumo ? String(resumo.concluidas) : null}
          icone={CheckCircle2}
          rodape="Providências registradas"
          onClick={() => setRecorte('todas')}
        />
      </div>

      {erro && <p className="mb-3 text-sm font-medium text-red-500">{erro}</p>}

      <TarefasList
        refreshKey={refreshKey}
        recorte={recorte}
        onRecorte={setRecorte}
        onEditar={(tarefa) => setModal({ tipo: 'editar', tarefa })}
        onExcluir={(tarefa) => {
          setErro(null);
          setModal({ tipo: 'excluir', tarefa });
        }}
        onStatus={alterarStatus}
      />

      <p className="mt-4 text-xs text-ink-400">
        Concluir uma tarefa encerra o aviso do sino apenas nos prazos cumpridos fora do sistema —
        cadastro no Audesp e Declaração Negativa. Certidão vencida e prestação rejeitada continuam
        aparecendo enquanto o dado não mudar: marcar a tarefa não renova certidão nem retransmite.
      </p>

      <Modal
        open={modal.tipo === 'novo' || modal.tipo === 'editar'}
        onClose={fechar}
        title={modal.tipo === 'editar' ? 'Editar Tarefa' : 'Nova Tarefa'}
        size="2xl"
      >
        {(modal.tipo === 'novo' || modal.tipo === 'editar') && (
          <TarefaForm
            tarefa={modal.tipo === 'editar' ? modal.tarefa : null}
            inicial={modal.tipo === 'novo' ? modal.inicial : null}
            onSuccess={aoSalvar}
            onCancel={fechar}
          />
        )}
      </Modal>

      <Modal
        open={modal.tipo === 'excluir'}
        onClose={fechar}
        title="Excluir tarefa"
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={fechar} disabled={processando}>
              Cancelar
            </Button>
            <Button variant="danger" onClick={confirmarExclusao} disabled={processando}>
              {processando ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Excluir
            </Button>
          </>
        }
      >
        {modal.tipo === 'excluir' && (
          <div className="space-y-3">
            <p className="text-sm text-ink-600 dark:text-ink-300">
              Excluir a tarefa{' '}
              <span className="font-semibold text-ink-900 dark:text-ink-50">
                {modal.tarefa.titulo}
              </span>
              ?
            </p>
            <p className="text-xs text-ink-400">
              A exclusão é definitiva e fica registrada na auditoria. Para encerrar sem apagar o
              histórico, mude a situação para <strong>Cancelada</strong>.
            </p>
            {erro && <p className="text-sm font-medium text-red-500">{erro}</p>}
          </div>
        )}
      </Modal>
    </>
  );
}
