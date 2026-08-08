import { useState } from 'react';
import { Plus, Loader2, Power } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { ColaboradorForm } from './ColaboradorForm';
import { ColaboradoresList } from './ColaboradoresList';
import { ColaboradorView } from './ColaboradorView';
import { definirStatusColaborador } from '@/services/colaboradores.service';
import { extrairMensagemErro } from '@/services/http';
import type { Colaborador } from '@/types/colaborador';

type ModalState =
  | { tipo: 'fechado' }
  | { tipo: 'novo' }
  | { tipo: 'editar'; colaborador: Colaborador }
  | { tipo: 'ver'; colaborador: Colaborador }
  | { tipo: 'status'; colaborador: Colaborador };

export function Colaboradores() {
  const [modal, setModal] = useState<ModalState>({ tipo: 'fechado' });
  const [refreshKey, setRefreshKey] = useState(0);
  const [processando, setProcessando] = useState(false);
  const [erroStatus, setErroStatus] = useState<string | null>(null);

  const fechar = () => setModal({ tipo: 'fechado' });

  function handleSuccess() {
    fechar();
    setRefreshKey((k) => k + 1);
  }

  async function confirmarStatus() {
    if (modal.tipo !== 'status') return;
    setProcessando(true);
    setErroStatus(null);
    try {
      await definirStatusColaborador(modal.colaborador.id, !modal.colaborador.ativo);
      handleSuccess();
    } catch (e) {
      setErroStatus(extrairMensagemErro(e, 'Não foi possível alterar o status.'));
    } finally {
      setProcessando(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Colaboradores"
        subtitle="Empregados da entidade beneficiária (base para a Relação de Empregados da prestação de contas)."
        actions={
          <Button variant="success" onClick={() => setModal({ tipo: 'novo' })}>
            <Plus className="h-4 w-4" />
            Novo Colaborador
          </Button>
        }
      />

      <ColaboradoresList
        refreshKey={refreshKey}
        onVisualizar={(colaborador) => setModal({ tipo: 'ver', colaborador })}
        onEditar={(colaborador) => setModal({ tipo: 'editar', colaborador })}
        onAlternarStatus={(colaborador) => {
          setErroStatus(null);
          setModal({ tipo: 'status', colaborador });
        }}
      />

      {/* Cadastro / Edição */}
      <Modal
        open={modal.tipo === 'novo' || modal.tipo === 'editar'}
        onClose={fechar}
        title={modal.tipo === 'editar' ? 'Editar Colaborador' : 'Novo Colaborador'}
        size="2xl"
      >
        {(modal.tipo === 'novo' || modal.tipo === 'editar') && (
          <ColaboradorForm
            colaborador={modal.tipo === 'editar' ? modal.colaborador : null}
            onSuccess={handleSuccess}
            onCancel={fechar}
          />
        )}
      </Modal>

      {/* Visualização */}
      <Modal open={modal.tipo === 'ver'} onClose={fechar} title="Dados do Colaborador" size="lg">
        {modal.tipo === 'ver' && <ColaboradorView colaborador={modal.colaborador} />}
      </Modal>

      {/* Confirmação de (in)ativação */}
      <Modal
        open={modal.tipo === 'status'}
        onClose={fechar}
        title={modal.tipo === 'status' && modal.colaborador.ativo ? 'Inativar colaborador' : 'Reativar colaborador'}
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={fechar} disabled={processando}>
              Cancelar
            </Button>
            <Button
              variant={modal.tipo === 'status' && modal.colaborador.ativo ? 'danger' : 'primary'}
              onClick={confirmarStatus}
              disabled={processando}
            >
              {processando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Power className="h-4 w-4" />}
              Confirmar
            </Button>
          </>
        }
      >
        {modal.tipo === 'status' && (
          <div className="space-y-3">
            <p className="text-sm text-ink-600 dark:text-ink-300">
              Deseja realmente {modal.colaborador.ativo ? 'inativar' : 'reativar'} o colaborador{' '}
              <span className="font-semibold text-ink-900 dark:text-ink-50">{modal.colaborador.nome}</span>?
            </p>
            {modal.colaborador.ativo && (
              <p className="text-xs text-ink-400">
                O colaborador não será excluído — ficará marcado como inativo (soft delete).
              </p>
            )}
            {erroStatus && <p className="text-sm font-medium text-red-500">{erroStatus}</p>}
          </div>
        )}
      </Modal>
    </>
  );
}
