import { useState } from 'react';
import { Plus } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { UsuarioForm } from './UsuarioForm';
import { UsuariosList } from './UsuariosList';

export function Usuarios() {
  const [modalAberto, setModalAberto] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  function handleSuccess() {
    setModalAberto(false);
    setRefreshKey((k) => k + 1); // recarrega a listagem
  }

  return (
    <>
      <PageHeader
        title="Usuários"
        subtitle="Cadastro de pessoas e entidades, com consulta automática de CEP e trava de duplicidade de CPF/CNPJ."
        actions={
          <Button onClick={() => setModalAberto(true)}>
            <Plus className="h-4 w-4" />
            Novo Usuário
          </Button>
        }
      />

      <UsuariosList refreshKey={refreshKey} />

      <Modal
        open={modalAberto}
        onClose={() => setModalAberto(false)}
        title="Novo Usuário"
        subtitle="Preencha os dados abaixo. O endereço é preenchido automaticamente pelo CEP."
        size="xl"
      >
        <UsuarioForm onSuccess={handleSuccess} onCancel={() => setModalAberto(false)} />
      </Modal>
    </>
  );
}
