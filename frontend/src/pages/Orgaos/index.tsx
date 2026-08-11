import { useState } from 'react';
import { Plus, Loader2, Power } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { OrgaoForm } from './OrgaoForm';
import { OrgaosList } from './OrgaosList';
import { OrgaoView } from './OrgaoView';
import { definirStatusOrgao } from '@/services/orgaos.service';
import { extrairMensagemErro } from '@/services/http';
import type { Orgao } from '@/types/orgao';

type ModalState =
  | { tipo: 'fechado' }
  | { tipo: 'novo' }
  | { tipo: 'editar'; orgao: Orgao }
  | { tipo: 'ver'; orgao: Orgao }
  | { tipo: 'status'; orgao: Orgao };

export function Orgaos() {
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
      await definirStatusOrgao(modal.orgao.id, !modal.orgao.ativo);
      handleSuccess();
    } catch (e) {
      setErroAcao(extrairMensagemErro(e, 'Não foi possível alterar o status.'));
    } finally {
      setProcessando(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Órgãos Concessores"
        subtitle="Órgãos que concedem o repasse (Prefeitura, Câmara, Autarquia…) com seus códigos de município e entidade no TCESP."
        actions={
          <Button variant="success" onClick={() => setModal({ tipo: 'novo' })}>
            <Plus className="h-4 w-4" />
            Novo Órgão Concessor
          </Button>
        }
      />

      <OrgaosList
        refreshKey={refreshKey}
        onVisualizar={(orgao) => setModal({ tipo: 'ver', orgao })}
        onEditar={(orgao) => setModal({ tipo: 'editar', orgao })}
        onAlternarStatus={(orgao) => { setErroAcao(null); setModal({ tipo: 'status', orgao }); }}
      />

      {/* Cadastro / Edição */}
      <Modal
        open={modal.tipo === 'novo' || modal.tipo === 'editar'}
        onClose={fechar}
        title={modal.tipo === 'editar' ? 'Editar Órgão Concessor' : 'Novo Órgão Concessor'}
        size="lg"
      >
        {(modal.tipo === 'novo' || modal.tipo === 'editar') && (
          <OrgaoForm orgao={modal.tipo === 'editar' ? modal.orgao : null} onSuccess={handleSuccess} onCancel={fechar} />
        )}
      </Modal>

      {/* Visualização */}
      <Modal open={modal.tipo === 'ver'} onClose={fechar} title="Dados do Órgão Concessor" size="lg">
        {modal.tipo === 'ver' && <OrgaoView orgao={modal.orgao} />}
      </Modal>

      {/* (In)ativação */}
      <Modal
        open={modal.tipo === 'status'}
        onClose={fechar}
        title={modal.tipo === 'status' && modal.orgao.ativo ? 'Inativar órgão concessor' : 'Reativar órgão concessor'}
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={fechar} disabled={processando}>Cancelar</Button>
            <Button variant={modal.tipo === 'status' && modal.orgao.ativo ? 'danger' : 'primary'} onClick={confirmarStatus} disabled={processando}>
              {processando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Power className="h-4 w-4" />}
              Confirmar
            </Button>
          </>
        }
      >
        {modal.tipo === 'status' && (
          <div className="space-y-3">
            <p className="text-sm text-ink-600 dark:text-ink-300">
              Deseja realmente {modal.orgao.ativo ? 'inativar' : 'reativar'} o órgão concessor{' '}
              <span className="font-semibold text-ink-900 dark:text-ink-50">{modal.orgao.nome}</span>?
            </p>
            {modal.orgao.ativo && (
              <p className="text-xs text-ink-400">Órgãos concessores inativos não aparecem para seleção em novos ajustes; os já vinculados permanecem.</p>
            )}
            {erroAcao && <p className="text-sm font-medium text-red-500">{erroAcao}</p>}
          </div>
        )}
      </Modal>
    </>
  );
}
