import { useState } from 'react';
import { Plus, Loader2, Power } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { ContratoForm } from './ContratoForm';
import { ContratosList } from './ContratosList';
import { ContratoView } from './ContratoView';
import { definirStatusContrato } from '@/services/contratos.service';
import { extrairMensagemErro } from '@/services/http';
import type { Contrato } from '@/types/contrato';

type ModalState =
  | { tipo: 'fechado' }
  | { tipo: 'novo' }
  | { tipo: 'editar'; contrato: Contrato }
  | { tipo: 'ver'; contrato: Contrato }
  | { tipo: 'status'; contrato: Contrato };

export function Contratos() {
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
      await definirStatusContrato(modal.contrato.id, !modal.contrato.ativo);
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
        title="Contratos Firmados"
        subtitle="Contratos celebrados pela entidade beneficiária (base para o bloco de Contratos da prestação de contas)."
        actions={
          <Button variant="success" onClick={() => setModal({ tipo: 'novo' })}>
            <Plus className="h-4 w-4" />
            Novo Contrato
          </Button>
        }
      />

      <ContratosList
        refreshKey={refreshKey}
        onVisualizar={(contrato) => setModal({ tipo: 'ver', contrato })}
        onEditar={(contrato) => setModal({ tipo: 'editar', contrato })}
        onAlternarStatus={(contrato) => {
          setErroStatus(null);
          setModal({ tipo: 'status', contrato });
        }}
      />

      {/* Cadastro / Edição */}
      <Modal
        open={modal.tipo === 'novo' || modal.tipo === 'editar'}
        onClose={fechar}
        title={modal.tipo === 'editar' ? 'Editar Contrato' : 'Novo Contrato'}
        size="2xl"
      >
        {(modal.tipo === 'novo' || modal.tipo === 'editar') && (
          <ContratoForm
            contrato={modal.tipo === 'editar' ? modal.contrato : null}
            onSuccess={handleSuccess}
            onCancel={fechar}
          />
        )}
      </Modal>

      {/* Visualização */}
      <Modal open={modal.tipo === 'ver'} onClose={fechar} title="Dados do Contrato" size="lg">
        {modal.tipo === 'ver' && <ContratoView contrato={modal.contrato} />}
      </Modal>

      {/* Confirmação de (in)ativação */}
      <Modal
        open={modal.tipo === 'status'}
        onClose={fechar}
        title={modal.tipo === 'status' && modal.contrato.ativo ? 'Inativar contrato' : 'Reativar contrato'}
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={fechar} disabled={processando}>
              Cancelar
            </Button>
            <Button
              variant={modal.tipo === 'status' && modal.contrato.ativo ? 'danger' : 'primary'}
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
              Deseja realmente {modal.contrato.ativo ? 'inativar' : 'reativar'} o contrato{' '}
              <span className="font-semibold text-ink-900 dark:text-ink-50">nº {modal.contrato.numero}</span>?
            </p>
            {modal.contrato.ativo && (
              <p className="text-xs text-ink-400">
                O contrato não será excluído — ficará marcado como inativo (soft delete).
              </p>
            )}
            {erroStatus && <p className="text-sm font-medium text-red-500">{erroStatus}</p>}
          </div>
        )}
      </Modal>
    </>
  );
}
