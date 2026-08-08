import { useState } from 'react';
import { Plus, Loader2, Power } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { EmpresaForm } from './EmpresaForm';
import { EmpresasList } from './EmpresasList';
import { EmpresaView } from './EmpresaView';
import { definirStatusEmpresa } from '@/services/empresas.service';
import { extrairMensagemErro } from '@/services/http';
import type { Empresa } from '@/types/empresa';

type ModalState =
  | { tipo: 'fechado' }
  | { tipo: 'novo' }
  | { tipo: 'editar'; empresa: Empresa }
  | { tipo: 'ver'; empresa: Empresa }
  | { tipo: 'status'; empresa: Empresa };

export function Empresas() {
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
      await definirStatusEmpresa(modal.empresa.id, !modal.empresa.ativo);
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
        title="Empresas"
        subtitle="Dados da empresa / contratante — suporta multi-empresa e filiais."
        actions={
          <Button variant="success" onClick={() => setModal({ tipo: 'novo' })}>
            <Plus className="h-4 w-4" />
            Nova Empresa
          </Button>
        }
      />

      <EmpresasList
        refreshKey={refreshKey}
        onVisualizar={(empresa) => setModal({ tipo: 'ver', empresa })}
        onEditar={(empresa) => setModal({ tipo: 'editar', empresa })}
        onAlternarStatus={(empresa) => {
          setErroStatus(null);
          setModal({ tipo: 'status', empresa });
        }}
      />

      {/* Cadastro / Edição */}
      <Modal
        open={modal.tipo === 'novo' || modal.tipo === 'editar'}
        onClose={fechar}
        title={modal.tipo === 'editar' ? 'Editar Empresa' : 'Nova Empresa'}
        subtitle="O endereço é preenchido automaticamente pelo CEP."
        size="2xl"
      >
        {(modal.tipo === 'novo' || modal.tipo === 'editar') && (
          <EmpresaForm
            empresa={modal.tipo === 'editar' ? modal.empresa : null}
            onSuccess={handleSuccess}
            onCancel={fechar}
          />
        )}
      </Modal>

      {/* Visualização */}
      <Modal
        open={modal.tipo === 'ver'}
        onClose={fechar}
        title="Dados da Empresa"
        size="lg"
      >
        {modal.tipo === 'ver' && <EmpresaView empresa={modal.empresa} />}
      </Modal>

      {/* Confirmação de (in)ativação */}
      <Modal
        open={modal.tipo === 'status'}
        onClose={fechar}
        title={modal.tipo === 'status' && modal.empresa.ativo ? 'Inativar empresa' : 'Reativar empresa'}
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={fechar} disabled={processando}>
              Cancelar
            </Button>
            <Button
              variant={modal.tipo === 'status' && modal.empresa.ativo ? 'danger' : 'primary'}
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
              Deseja realmente {modal.empresa.ativo ? 'inativar' : 'reativar'} a empresa{' '}
              <span className="font-semibold text-ink-900 dark:text-ink-50">
                {modal.empresa.razaoSocial}
              </span>
              ?
            </p>
            {modal.empresa.ativo && (
              <p className="text-xs text-ink-400">
                A empresa não será excluída — ficará marcada como inativa (soft delete).
              </p>
            )}
            {erroStatus && <p className="text-sm font-medium text-red-500">{erroStatus}</p>}
          </div>
        )}
      </Modal>
    </>
  );
}
