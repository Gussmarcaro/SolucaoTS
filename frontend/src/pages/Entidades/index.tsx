import { useState } from 'react';
import { Plus, Loader2, Power } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { EntidadeForm } from './EntidadeForm';
import { EntidadesList } from './EntidadesList';
import { EntidadeView } from './EntidadeView';
import { definirStatusEntidade } from '@/services/entidades.service';
import { extrairMensagemErro } from '@/services/http';
import type { Entidade } from '@/types/entidade';

type ModalState =
  | { tipo: 'fechado' }
  | { tipo: 'novo' }
  | { tipo: 'editar'; entidade: Entidade }
  | { tipo: 'ver'; entidade: Entidade }
  | { tipo: 'status'; entidade: Entidade };

export function Entidades() {
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
      await definirStatusEntidade(modal.entidade.id, !modal.entidade.ativo);
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
        title="Entidades / Beneficiárias"
        subtitle="Organizações da sociedade civil (OSCs) que recebem os repasses — base dos ajustes e da prestação de contas."
        actions={
          <Button onClick={() => setModal({ tipo: 'novo' })}>
            <Plus className="h-4 w-4" />
            Nova Entidade
          </Button>
        }
      />

      <EntidadesList
        refreshKey={refreshKey}
        onVisualizar={(entidade) => setModal({ tipo: 'ver', entidade })}
        onEditar={(entidade) => setModal({ tipo: 'editar', entidade })}
        onAlternarStatus={(entidade) => {
          setErroStatus(null);
          setModal({ tipo: 'status', entidade });
        }}
      />

      {/* Cadastro / Edição */}
      <Modal
        open={modal.tipo === 'novo' || modal.tipo === 'editar'}
        onClose={fechar}
        title={modal.tipo === 'editar' ? 'Editar Entidade' : 'Nova Entidade'}
        subtitle="O endereço é preenchido automaticamente pelo CEP."
        size="2xl"
      >
        {(modal.tipo === 'novo' || modal.tipo === 'editar') && (
          <EntidadeForm
            entidade={modal.tipo === 'editar' ? modal.entidade : null}
            onSuccess={handleSuccess}
            onCancel={fechar}
          />
        )}
      </Modal>

      {/* Visualização */}
      <Modal open={modal.tipo === 'ver'} onClose={fechar} title="Dados da Entidade" size="lg">
        {modal.tipo === 'ver' && <EntidadeView entidade={modal.entidade} />}
      </Modal>

      {/* Confirmação de (in)ativação */}
      <Modal
        open={modal.tipo === 'status'}
        onClose={fechar}
        title={modal.tipo === 'status' && modal.entidade.ativo ? 'Inativar entidade' : 'Reativar entidade'}
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={fechar} disabled={processando}>
              Cancelar
            </Button>
            <Button
              variant={modal.tipo === 'status' && modal.entidade.ativo ? 'danger' : 'primary'}
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
              Deseja realmente {modal.entidade.ativo ? 'inativar' : 'reativar'} a entidade{' '}
              <span className="font-semibold text-ink-900 dark:text-ink-50">{modal.entidade.razaoSocial}</span>?
            </p>
            {modal.entidade.ativo && (
              <p className="text-xs text-ink-400">
                A entidade não será excluída — ficará marcada como inativa (soft delete).
              </p>
            )}
            {erroStatus && <p className="text-sm font-medium text-red-500">{erroStatus}</p>}
          </div>
        )}
      </Modal>
    </>
  );
}
