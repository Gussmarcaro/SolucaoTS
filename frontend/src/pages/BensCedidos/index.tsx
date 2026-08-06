import { useState } from 'react';
import { Plus, Loader2, Power } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { BemCedidoForm } from './BemCedidoForm';
import { BensCedidosList } from './BensCedidosList';
import { BemCedidoView } from './BemCedidoView';
import { definirStatusBemCedido } from '@/services/bensCedidos.service';
import { extrairMensagemErro } from '@/services/http';
import type { BemCedido } from '@/types/bemCedido';

type ModalState =
  | { tipo: 'fechado' }
  | { tipo: 'novo' }
  | { tipo: 'editar'; bem: BemCedido }
  | { tipo: 'ver'; bem: BemCedido }
  | { tipo: 'status'; bem: BemCedido };

export function BensCedidos() {
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
      await definirStatusBemCedido(modal.bem.id, !modal.bem.ativo);
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
        title="Bens Cedidos"
        subtitle="Bens patrimoniais cedidos à / pela entidade beneficiária."
        actions={
          <Button onClick={() => setModal({ tipo: 'novo' })}>
            <Plus className="h-4 w-4" />
            Novo Bem
          </Button>
        }
      />

      <BensCedidosList
        refreshKey={refreshKey}
        onVisualizar={(bem) => setModal({ tipo: 'ver', bem })}
        onEditar={(bem) => setModal({ tipo: 'editar', bem })}
        onAlternarStatus={(bem) => {
          setErroStatus(null);
          setModal({ tipo: 'status', bem });
        }}
      />

      {/* Cadastro / Edição */}
      <Modal
        open={modal.tipo === 'novo' || modal.tipo === 'editar'}
        onClose={fechar}
        title={modal.tipo === 'editar' ? 'Editar Bem Cedido' : 'Novo Bem Cedido'}
        size="2xl"
      >
        {(modal.tipo === 'novo' || modal.tipo === 'editar') && (
          <BemCedidoForm
            bem={modal.tipo === 'editar' ? modal.bem : null}
            onSuccess={handleSuccess}
            onCancel={fechar}
          />
        )}
      </Modal>

      {/* Visualização */}
      <Modal open={modal.tipo === 'ver'} onClose={fechar} title="Dados do Bem" size="lg">
        {modal.tipo === 'ver' && <BemCedidoView bem={modal.bem} />}
      </Modal>

      {/* Confirmação de (in)ativação */}
      <Modal
        open={modal.tipo === 'status'}
        onClose={fechar}
        title={modal.tipo === 'status' && modal.bem.ativo ? 'Inativar bem' : 'Reativar bem'}
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={fechar} disabled={processando}>
              Cancelar
            </Button>
            <Button
              variant={modal.tipo === 'status' && modal.bem.ativo ? 'danger' : 'primary'}
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
              Deseja realmente {modal.bem.ativo ? 'inativar' : 'reativar'} o bem{' '}
              <span className="font-semibold text-ink-900 dark:text-ink-50">{modal.bem.descricao}</span>?
            </p>
            {modal.bem.ativo && (
              <p className="text-xs text-ink-400">
                O bem não será excluído — ficará marcado como inativo (soft delete).
              </p>
            )}
            {erroStatus && <p className="text-sm font-medium text-red-500">{erroStatus}</p>}
          </div>
        )}
      </Modal>
    </>
  );
}
