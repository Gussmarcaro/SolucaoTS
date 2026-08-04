import { useState } from 'react';
import { Plus, Loader2, Power } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { UsuarioForm } from './UsuarioForm';
import { UsuariosList } from './UsuariosList';
import { UsuarioView } from './UsuarioView';
import { definirStatusUsuario } from '@/services/usuarios.service';
import { extrairMensagemErro } from '@/services/http';
import type { Usuario } from '@/types/usuario';

type ModalState =
  | { tipo: 'fechado' }
  | { tipo: 'novo' }
  | { tipo: 'editar'; usuario: Usuario }
  | { tipo: 'ver'; usuario: Usuario }
  | { tipo: 'status'; usuario: Usuario };

export function Usuarios() {
  const [modal, setModal] = useState<ModalState>({ tipo: 'fechado' });
  const [refreshKey, setRefreshKey] = useState(0);
  const [processando, setProcessando] = useState(false);
  const [erroStatus, setErroStatus] = useState<string | null>(null);

  const fechar = () => setModal({ tipo: 'fechado' });
  const recarregar = () => setRefreshKey((k) => k + 1);

  function handleSuccess() {
    fechar();
    recarregar();
  }

  async function confirmarStatus() {
    if (modal.tipo !== 'status') return;
    setProcessando(true);
    setErroStatus(null);
    try {
      await definirStatusUsuario(modal.usuario.id, !modal.usuario.ativo);
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
        title="Usuários"
        subtitle="Cadastro de pessoas e entidades, com consulta automática de CEP e trava de duplicidade de CPF/CNPJ."
        actions={
          <Button onClick={() => setModal({ tipo: 'novo' })}>
            <Plus className="h-4 w-4" />
            Novo Usuário
          </Button>
        }
      />

      <UsuariosList
        refreshKey={refreshKey}
        onVisualizar={(usuario) => setModal({ tipo: 'ver', usuario })}
        onEditar={(usuario) => setModal({ tipo: 'editar', usuario })}
        onAlternarStatus={(usuario) => {
          setErroStatus(null);
          setModal({ tipo: 'status', usuario });
        }}
      />

      {/* Cadastro / Edição */}
      <Modal
        open={modal.tipo === 'novo' || modal.tipo === 'editar'}
        onClose={fechar}
        title={modal.tipo === 'editar' ? 'Editar Usuário' : 'Novo Usuário'}
        subtitle="O endereço é preenchido automaticamente pelo CEP."
        size="xl"
      >
        {(modal.tipo === 'novo' || modal.tipo === 'editar') && (
          <UsuarioForm
            usuario={modal.tipo === 'editar' ? modal.usuario : null}
            onSuccess={handleSuccess}
            onCancel={fechar}
          />
        )}
      </Modal>

      {/* Visualização */}
      <Modal open={modal.tipo === 'ver'} onClose={fechar} title="Dados do Usuário" size="lg">
        {modal.tipo === 'ver' && <UsuarioView usuario={modal.usuario} />}
      </Modal>

      {/* Confirmação de (in)ativação */}
      <Modal
        open={modal.tipo === 'status'}
        onClose={fechar}
        title={modal.tipo === 'status' && modal.usuario.ativo ? 'Inativar usuário' : 'Reativar usuário'}
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={fechar} disabled={processando}>
              Cancelar
            </Button>
            <Button
              variant={modal.tipo === 'status' && modal.usuario.ativo ? 'danger' : 'primary'}
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
              Deseja realmente {modal.usuario.ativo ? 'inativar' : 'reativar'} o usuário{' '}
              <span className="font-semibold text-ink-900 dark:text-ink-50">{modal.usuario.nome}</span>?
            </p>
            {modal.usuario.ativo && (
              <p className="text-xs text-ink-400">
                O usuário não será excluído — ficará inativo (soft delete) e não conseguirá fazer login.
              </p>
            )}
            {erroStatus && <p className="text-sm font-medium text-red-500">{erroStatus}</p>}
          </div>
        )}
      </Modal>
    </>
  );
}
