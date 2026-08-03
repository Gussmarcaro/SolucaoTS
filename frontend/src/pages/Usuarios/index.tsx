import { useState } from 'react';
import { Plus } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { UsuarioForm } from './UsuarioForm';
import { UsuariosList } from './UsuariosList';
import type { Usuario } from '@/types/usuario';

type ModalState = { tipo: 'fechado' } | { tipo: 'novo' } | { tipo: 'editar'; usuario: Usuario };

export function Usuarios() {
  const [modal, setModal] = useState<ModalState>({ tipo: 'fechado' });
  const [refreshKey, setRefreshKey] = useState(0);

  const fechar = () => setModal({ tipo: 'fechado' });

  function handleSuccess() {
    fechar();
    setRefreshKey((k) => k + 1); // recarrega a listagem
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

      <UsuariosList refreshKey={refreshKey} onEditar={(usuario) => setModal({ tipo: 'editar', usuario })} />

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
    </>
  );
}
