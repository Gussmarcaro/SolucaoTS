import { useState } from 'react';
import { Plus, Loader2, Power } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { FornecedorForm } from './FornecedorForm';
import { FornecedoresList } from './FornecedoresList';
import { FornecedorView } from './FornecedorView';
import { definirStatusFornecedor } from '@/services/fornecedores.service';
import { extrairMensagemErro } from '@/services/http';
import type { Fornecedor } from '@/types/fornecedor';

type ModalState =
  | { tipo: 'fechado' }
  | { tipo: 'novo' }
  | { tipo: 'editar'; fornecedor: Fornecedor }
  | { tipo: 'ver'; fornecedor: Fornecedor }
  | { tipo: 'status'; fornecedor: Fornecedor };

export function Fornecedores() {
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
      await definirStatusFornecedor(modal.fornecedor.id, !modal.fornecedor.ativo);
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
        title="Fornecedores / Prestadores"
        subtitle="Credores da entidade beneficiária (documentos fiscais e contratos) — pessoas físicas ou jurídicas."
        actions={
          <Button variant="success" onClick={() => setModal({ tipo: 'novo' })}>
            <Plus className="h-4 w-4" />
            Novo Fornecedor
          </Button>
        }
      />

      <FornecedoresList
        refreshKey={refreshKey}
        onVisualizar={(fornecedor) => setModal({ tipo: 'ver', fornecedor })}
        onEditar={(fornecedor) => setModal({ tipo: 'editar', fornecedor })}
        onAlternarStatus={(fornecedor) => {
          setErroStatus(null);
          setModal({ tipo: 'status', fornecedor });
        }}
      />

      {/* Cadastro / Edição */}
      <Modal
        open={modal.tipo === 'novo' || modal.tipo === 'editar'}
        onClose={fechar}
        title={modal.tipo === 'editar' ? 'Editar Fornecedor' : 'Novo Fornecedor'}
        subtitle="O endereço é preenchido automaticamente pelo CEP."
        size="2xl"
      >
        {(modal.tipo === 'novo' || modal.tipo === 'editar') && (
          <FornecedorForm
            fornecedor={modal.tipo === 'editar' ? modal.fornecedor : null}
            onSuccess={handleSuccess}
            onCancel={fechar}
          />
        )}
      </Modal>

      {/* Visualização */}
      <Modal open={modal.tipo === 'ver'} onClose={fechar} title="Dados do Fornecedor" size="lg">
        {modal.tipo === 'ver' && <FornecedorView fornecedor={modal.fornecedor} />}
      </Modal>

      {/* Confirmação de (in)ativação */}
      <Modal
        open={modal.tipo === 'status'}
        onClose={fechar}
        title={modal.tipo === 'status' && modal.fornecedor.ativo ? 'Inativar fornecedor' : 'Reativar fornecedor'}
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={fechar} disabled={processando}>
              Cancelar
            </Button>
            <Button
              variant={modal.tipo === 'status' && modal.fornecedor.ativo ? 'danger' : 'primary'}
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
              Deseja realmente {modal.fornecedor.ativo ? 'inativar' : 'reativar'} o fornecedor{' '}
              <span className="font-semibold text-ink-900 dark:text-ink-50">{modal.fornecedor.nome}</span>?
            </p>
            {modal.fornecedor.ativo && (
              <p className="text-xs text-ink-400">
                O fornecedor não será excluído — ficará marcado como inativo (soft delete).
              </p>
            )}
            {erroStatus && <p className="text-sm font-medium text-red-500">{erroStatus}</p>}
          </div>
        )}
      </Modal>
    </>
  );
}
