import { usePermissoes } from '@/contexts/PermissoesContext';
import { useState } from 'react';
import { Plus, Loader2, Power } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { ServidorCedidoForm } from './ServidorCedidoForm';
import { ServidoresCedidosList } from './ServidoresCedidosList';
import { ServidorCedidoView } from './ServidorCedidoView';
import { definirStatusServidorCedido } from '@/services/servidoresCedidos.service';
import { extrairMensagemErro } from '@/services/http';
import type { ServidorCedido } from '@/types/servidorCedido';

type ModalState =
  | { tipo: 'fechado' }
  | { tipo: 'novo' }
  | { tipo: 'editar'; servidor: ServidorCedido }
  | { tipo: 'ver'; servidor: ServidorCedido }
  | { tipo: 'status'; servidor: ServidorCedido };

export function ServidoresCedidos() {
  // Esconder o botão é conveniência; quem barra a gravação é o servidor.
  const podeEditar = usePermissoes().pode('CADASTRO_SERVIDORES_CEDIDOS', 'EDICAO');
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
      await definirStatusServidorCedido(modal.servidor.id, !modal.servidor.ativo);
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
        title="Servidores Cedidos"
        subtitle="Servidores públicos cedidos à entidade beneficiária (com ou sem ônus)."
        actions={
          podeEditar && (
          <Button variant="success" onClick={() => setModal({ tipo: 'novo' })}>
            <Plus className="h-4 w-4" />
            Novo Servidor
          </Button>
          )
        }
      />

      <ServidoresCedidosList
        refreshKey={refreshKey}
        onVisualizar={(servidor) => setModal({ tipo: 'ver', servidor })}
        onEditar={(servidor) => setModal({ tipo: 'editar', servidor })}
        onAlternarStatus={(servidor) => {
          setErroStatus(null);
          setModal({ tipo: 'status', servidor });
        }}
      />

      {/* Cadastro / Edição */}
      <Modal
        open={modal.tipo === 'novo' || modal.tipo === 'editar'}
        onClose={fechar}
        title={modal.tipo === 'editar' ? 'Editar Servidor Cedido' : 'Novo Servidor Cedido'}
        size="2xl"
      >
        {(modal.tipo === 'novo' || modal.tipo === 'editar') && (
          <ServidorCedidoForm
            servidor={modal.tipo === 'editar' ? modal.servidor : null}
            onSuccess={handleSuccess}
            onCancel={fechar}
          />
        )}
      </Modal>

      {/* Visualização */}
      <Modal open={modal.tipo === 'ver'} onClose={fechar} title="Dados do Servidor" size="lg">
        {modal.tipo === 'ver' && <ServidorCedidoView servidor={modal.servidor} />}
      </Modal>

      {/* Confirmação de (in)ativação */}
      <Modal
        open={modal.tipo === 'status'}
        onClose={fechar}
        title={modal.tipo === 'status' && modal.servidor.ativo ? 'Inativar servidor' : 'Reativar servidor'}
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={fechar} disabled={processando}>
              Cancelar
            </Button>
            <Button
              variant={modal.tipo === 'status' && modal.servidor.ativo ? 'danger' : 'primary'}
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
              Deseja realmente {modal.servidor.ativo ? 'inativar' : 'reativar'} o servidor{' '}
              <span className="font-semibold text-ink-900 dark:text-ink-50">{modal.servidor.nome}</span>?
            </p>
            {modal.servidor.ativo && (
              <p className="text-xs text-ink-400">
                O servidor não será excluído — ficará marcado como inativo (soft delete).
              </p>
            )}
            {erroStatus && <p className="text-sm font-medium text-red-500">{erroStatus}</p>}
          </div>
        )}
      </Modal>
    </>
  );
}
