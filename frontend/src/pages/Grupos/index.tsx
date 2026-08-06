import { useState } from 'react';
import { Plus, Loader2, Power, Trash2 } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { GrupoForm } from './GrupoForm';
import { GruposList } from './GruposList';
import { GrupoView } from './GrupoView';
import { definirStatusGrupo, excluirGrupo } from '@/services/grupos.service';
import { extrairMensagemErro } from '@/services/http';
import type { Grupo } from '@/types/grupo';

type ModalState =
  | { tipo: 'fechado' }
  | { tipo: 'novo' }
  | { tipo: 'editar'; grupo: Grupo }
  | { tipo: 'ver'; grupo: Grupo }
  | { tipo: 'status'; grupo: Grupo }
  | { tipo: 'excluir'; grupo: Grupo };

export function Grupos() {
  const [modal, setModal] = useState<ModalState>({ tipo: 'fechado' });
  const [refreshKey, setRefreshKey] = useState(0);
  const [processando, setProcessando] = useState(false);
  const [erroAcao, setErroAcao] = useState<string | null>(null);

  const fechar = () => setModal({ tipo: 'fechado' });

  function handleSuccess() {
    fechar();
    setRefreshKey((k) => k + 1);
  }

  async function confirmarStatus() {
    if (modal.tipo !== 'status') return;
    setProcessando(true);
    setErroAcao(null);
    try {
      await definirStatusGrupo(modal.grupo.id, !modal.grupo.ativo);
      handleSuccess();
    } catch (e) {
      setErroAcao(extrairMensagemErro(e, 'Não foi possível alterar o status.'));
    } finally {
      setProcessando(false);
    }
  }

  async function confirmarExcluir() {
    if (modal.tipo !== 'excluir') return;
    setProcessando(true);
    setErroAcao(null);
    try {
      await excluirGrupo(modal.grupo.id);
      handleSuccess();
    } catch (e) {
      setErroAcao(extrairMensagemErro(e, 'Não foi possível excluir o grupo.'));
    } finally {
      setProcessando(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Grupos de Usuários"
        subtitle="Organize os usuários por perfil de acesso (base para o controle de permissões)."
        actions={
          <Button onClick={() => setModal({ tipo: 'novo' })}>
            <Plus className="h-4 w-4" />
            Novo Grupo
          </Button>
        }
      />

      <GruposList
        refreshKey={refreshKey}
        onVisualizar={(grupo) => setModal({ tipo: 'ver', grupo })}
        onEditar={(grupo) => setModal({ tipo: 'editar', grupo })}
        onAlternarStatus={(grupo) => { setErroAcao(null); setModal({ tipo: 'status', grupo }); }}
        onExcluir={(grupo) => { setErroAcao(null); setModal({ tipo: 'excluir', grupo }); }}
      />

      {/* Cadastro / Edição */}
      <Modal
        open={modal.tipo === 'novo' || modal.tipo === 'editar'}
        onClose={fechar}
        title={modal.tipo === 'editar' ? 'Editar Grupo' : 'Novo Grupo'}
        size="lg"
      >
        {(modal.tipo === 'novo' || modal.tipo === 'editar') && (
          <GrupoForm grupo={modal.tipo === 'editar' ? modal.grupo : null} onSuccess={handleSuccess} onCancel={fechar} />
        )}
      </Modal>

      {/* Visualização */}
      <Modal open={modal.tipo === 'ver'} onClose={fechar} title="Dados do Grupo" size="lg">
        {modal.tipo === 'ver' && <GrupoView grupo={modal.grupo} />}
      </Modal>

      {/* (In)ativação */}
      <Modal
        open={modal.tipo === 'status'}
        onClose={fechar}
        title={modal.tipo === 'status' && modal.grupo.ativo ? 'Inativar grupo' : 'Reativar grupo'}
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={fechar} disabled={processando}>Cancelar</Button>
            <Button variant={modal.tipo === 'status' && modal.grupo.ativo ? 'danger' : 'primary'} onClick={confirmarStatus} disabled={processando}>
              {processando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Power className="h-4 w-4" />}
              Confirmar
            </Button>
          </>
        }
      >
        {modal.tipo === 'status' && (
          <div className="space-y-3">
            <p className="text-sm text-ink-600 dark:text-ink-300">
              Deseja realmente {modal.grupo.ativo ? 'inativar' : 'reativar'} o grupo{' '}
              <span className="font-semibold text-ink-900 dark:text-ink-50">{modal.grupo.nome}</span>?
            </p>
            {modal.grupo.ativo && (
              <p className="text-xs text-ink-400">Grupos inativos não podem ser selecionados para novos usuários; os já vinculados permanecem.</p>
            )}
            {erroAcao && <p className="text-sm font-medium text-red-500">{erroAcao}</p>}
          </div>
        )}
      </Modal>

      {/* Exclusão (bloqueada se houver membros) */}
      <Modal
        open={modal.tipo === 'excluir'}
        onClose={fechar}
        title="Excluir grupo"
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={fechar} disabled={processando}>Cancelar</Button>
            <Button variant="danger" onClick={confirmarExcluir} disabled={processando}>
              {processando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              Excluir
            </Button>
          </>
        }
      >
        {modal.tipo === 'excluir' && (
          <div className="space-y-3">
            <p className="text-sm text-ink-600 dark:text-ink-300">
              Deseja excluir o grupo <span className="font-semibold text-ink-900 dark:text-ink-50">{modal.grupo.nome}</span>? Esta ação não pode ser desfeita.
            </p>
            <p className="text-xs text-ink-400">Não é possível excluir grupos com usuários vinculados — inative-o nesse caso.</p>
            {erroAcao && <p className="text-sm font-medium text-red-500">{erroAcao}</p>}
          </div>
        )}
      </Modal>
    </>
  );
}
