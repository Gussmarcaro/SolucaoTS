import { usePermissoes } from '@/contexts/PermissoesContext';
import { useState } from 'react';
import { Plus } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { AjusteForm } from './AjusteForm';
import { AjustesList } from './AjustesList';
import { AjusteView } from './AjusteView';
import type { Ajuste } from '@/types/ajuste';

type ModalState =
  | { tipo: 'fechado' }
  | { tipo: 'novo' }
  | { tipo: 'editar'; ajuste: Ajuste }
  | { tipo: 'ver'; ajuste: Ajuste };

export function Ajustes() {
  // Esconder o botão é conveniência; quem barra a gravação é o servidor.
  const podeEditar = usePermissoes().pode('CADASTRO_AJUSTES', 'EDICAO');
  const [modal, setModal] = useState<ModalState>({ tipo: 'fechado' });
  const [refreshKey, setRefreshKey] = useState(0);

  const fechar = () => setModal({ tipo: 'fechado' });

  function handleSuccess() {
    fechar();
    setRefreshKey((k) => k + 1);
  }

  return (
    <>
      <PageHeader
        title="Ajustes Celebrados"
        subtitle="Convênios, termos e contratos de gestão firmados com o Terceiro Setor."
        actions={
          podeEditar && (
          <Button variant="success" onClick={() => setModal({ tipo: 'novo' })}>
            <Plus className="h-4 w-4" />
            Novo Ajuste
          </Button>
          )
        }
      />

      <AjustesList
        refreshKey={refreshKey}
        onVisualizar={(ajuste) => setModal({ tipo: 'ver', ajuste })}
        onEditar={(ajuste) => setModal({ tipo: 'editar', ajuste })}
      />

      {/* Cadastro / Edição */}
      <Modal
        open={modal.tipo === 'novo' || modal.tipo === 'editar'}
        onClose={fechar}
        title={modal.tipo === 'editar' ? 'Editar Ajuste' : 'Novo Ajuste'}
        size="2xl"
      >
        {(modal.tipo === 'novo' || modal.tipo === 'editar') && (
          <AjusteForm
            ajuste={modal.tipo === 'editar' ? modal.ajuste : null}
            onSuccess={handleSuccess}
            onCancel={fechar}
          />
        )}
      </Modal>

      {/* Visualização */}
      <Modal open={modal.tipo === 'ver'} onClose={fechar} title="Dados do Ajuste" size="lg">
        {modal.tipo === 'ver' && <AjusteView ajuste={modal.ajuste} />}
      </Modal>
    </>
  );
}
