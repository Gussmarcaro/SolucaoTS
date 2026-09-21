import { useEffect, useState } from 'react';
import { AlertCircle, Loader2, Pencil, Plus, Power, Trash2 } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { SelectDominio } from '@/components/ui/SelectDominio';
import { GradeSimples } from '@/components/ui/GradeSimples';
import { AcoesGrade, IconBtn } from '@/components/ui/AcoesGrade';
import type { ColunaDef } from '@/hooks/useResizableColumns';
import { usePermissoes } from '@/contexts/PermissoesContext';
import { contasApi } from '@/services/contasBancarias.service';
import { extrairMensagemErro } from '@/services/http';
import { apenasDigitos } from '@/lib/masks';
import { BANCO, CONTA_TIPO, FONTE_RECURSO } from '@/lib/dominiosFaseV';
import { rotuloConta, type ContaBancaria } from '@/types/contaBancaria';

type ModalState =
  | { tipo: 'fechado' }
  | { tipo: 'form'; conta: ContaBancaria | null }
  | { tipo: 'status'; conta: ContaBancaria }
  | { tipo: 'excluir'; conta: ContaBancaria };

const COLUNAS: ColunaDef[] = [
  { key: 'acoes', label: 'Ações', width: 130, minWidth: 110, align: 'center', movivel: false },
  { key: 'apelido', label: 'Apelido', width: 240, sortKey: 'apelido' },
  { key: 'banco', label: 'Banco', width: 280, sortKey: 'banco' },
  { key: 'agencia', label: 'Agência', width: 120 },
  { key: 'conta', label: 'Conta', width: 160, sortKey: 'conta' },
  { key: 'tipo', label: 'Tipo', width: 150 },
  { key: 'situacao', label: 'Situação', width: 120, align: 'center' },
];

const rotuloBanco = (codigo: number) =>
  BANCO.find((b) => b.value === String(codigo))?.label ?? String(codigo);
const rotuloTipo = (codigo: number | null) =>
  CONTA_TIPO.find((t) => t.value === String(codigo))?.label ?? '—';

/**
 * Cadastro de contas bancárias do órgão.
 *
 * Antes, a mesma conta era digitada em três lugares — na lista do Ajuste, no
 * pagamento e no extrato importado. Três digitações do mesmo número é um dígito
 * trocado esperando para acontecer, e quando acontece o extrato simplesmente
 * deixa de casar, sem erro nenhum.
 *
 * Aqui ela é cadastrada uma vez. O Ajuste escolhe dela e acrescenta o que é
 * dele — a fonte de recurso que entra na conta.
 */
export function ContasBancarias() {
  const { pode } = usePermissoes();
  const podeEditar = pode('EXECUCAO_CONTAS', 'EDICAO');

  const [lista, setLista] = useState<ContaBancaria[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalState>({ tipo: 'fechado' });
  const [refreshKey, setRefreshKey] = useState(0);
  const [processando, setProcessando] = useState(false);

  useEffect(() => {
    let vivo = true;
    setCarregando(true);
    contasApi
      .listar()
      .then((r) => vivo && setLista(r))
      .catch((e) => vivo && setErro(extrairMensagemErro(e, 'Falha ao carregar as contas.')))
      .finally(() => vivo && setCarregando(false));
    return () => {
      vivo = false;
    };
  }, [refreshKey]);

  const recarregar = () => {
    setModal({ tipo: 'fechado' });
    setRefreshKey((k) => k + 1);
  };

  async function confirmar(acao: 'status' | 'excluir') {
    if (modal.tipo !== acao) return;
    setProcessando(true);
    setErro(null);
    try {
      if (acao === 'status') await contasApi.definirAtivo(modal.conta.id, !modal.conta.ativo);
      else await contasApi.excluir(modal.conta.id);
      recarregar();
    } catch (e) {
      setErro(extrairMensagemErro(e, 'Não foi possível concluir a operação.'));
    } finally {
      setProcessando(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Contas Bancárias"
        subtitle="As contas do órgão, cadastradas uma vez. O Ajuste escolhe delas, e a conciliação reconhece o extrato por elas."
        actions={
          podeEditar && (
            <Button variant="success" onClick={() => setModal({ tipo: 'form', conta: null })}>
              <Plus className="h-4 w-4" />
              Nova Conta
            </Button>
          )
        }
      />

      {erro && (
        <div className="mb-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{erro}</span>
        </div>
      )}

      <GradeSimples
        storageKey="@SolucaoTS:grid:contasBancarias:v1"
        colunas={COLUNAS}
        dados={lista}
        chave={(c) => c.id}
        carregando={carregando}
        erro={null}
        vazio="Nenhuma conta cadastrada."
        onDuploClique={(c) => podeEditar && setModal({ tipo: 'form', conta: c })}
        valorOrdenacao={(campo, c) => {
          if (campo === 'apelido') return c.apelido;
          if (campo === 'banco') return c.banco;
          if (campo === 'conta') return c.conta;
          return null;
        }}
        renderCell={(coluna, c) => {
          switch (coluna) {
            case 'acoes':
              return (
                <AcoesGrade recurso="EXECUCAO_CONTAS">
                  <IconBtn exige="EDICAO" title="Editar" onClick={() => setModal({ tipo: 'form', conta: c })}>
                    <Pencil className="h-4 w-4" />
                  </IconBtn>
                  <IconBtn
                    exige="EDICAO"
                    title={c.ativo ? 'Inativar' : 'Reativar'}
                    onClick={() => setModal({ tipo: 'status', conta: c })}
                  >
                    <Power className="h-4 w-4" />
                  </IconBtn>
                  <IconBtn exige="TOTAL" title="Excluir" danger onClick={() => setModal({ tipo: 'excluir', conta: c })}>
                    <Trash2 className="h-4 w-4" />
                  </IconBtn>
                </AcoesGrade>
              );
            case 'apelido':
              return (
                <span className="block truncate text-ink-800 dark:text-ink-100" title={c.apelido ?? ''}>
                  {/* Sem apelido, o número — mas a coluna existe porque é o
                      apelido que se lê de relance. */}
                  {c.apelido || <span className="text-ink-400">sem apelido</span>}
                </span>
              );
            case 'banco':
              return (
                <span className="block truncate text-ink-600 dark:text-ink-300" title={rotuloBanco(c.banco)}>
                  {rotuloBanco(c.banco)}
                </span>
              );
            case 'agencia':
              return <span className="block truncate tabular-nums text-ink-600 dark:text-ink-300">{c.agencia}</span>;
            case 'conta':
              return <span className="block truncate tabular-nums text-ink-700 dark:text-ink-200">{c.conta}</span>;
            case 'tipo':
              return <span className="block truncate text-ink-500 dark:text-ink-400">{rotuloTipo(c.contaTipo)}</span>;
            case 'situacao':
              return <Badge tone={c.ativo ? 'success' : 'neutral'}>{c.ativo ? 'Ativa' : 'Inativa'}</Badge>;
            default:
              return null;
          }
        }}
      />

      <p className="mt-4 text-xs text-ink-400">
        A <strong>corrente e a aplicação</strong> da mesma conta têm o mesmo número: cadastre as
        duas, informando o <strong>tipo</strong> de cada. É o par conta + tipo que as distingue —
        no Ajuste, na conciliação e no bloco de Disponibilidades.
      </p>

      <Modal
        open={modal.tipo === 'form'}
        onClose={() => setModal({ tipo: 'fechado' })}
        title={modal.tipo === 'form' && modal.conta ? 'Editar Conta' : 'Nova Conta'}
        size="lg"
      >
        {modal.tipo === 'form' && (
          <ContaForm conta={modal.conta} onSuccess={recarregar} onCancel={() => setModal({ tipo: 'fechado' })} />
        )}
      </Modal>

      <Modal
        open={modal.tipo === 'status'}
        onClose={() => setModal({ tipo: 'fechado' })}
        title={modal.tipo === 'status' && modal.conta.ativo ? 'Inativar conta' : 'Reativar conta'}
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModal({ tipo: 'fechado' })} disabled={processando}>
              Cancelar
            </Button>
            <Button
              variant={modal.tipo === 'status' && modal.conta.ativo ? 'danger' : 'primary'}
              onClick={() => confirmar('status')}
              disabled={processando}
            >
              {processando && <Loader2 className="h-4 w-4 animate-spin" />}
              Confirmar
            </Button>
          </>
        }
      >
        {modal.tipo === 'status' && (
          <div className="space-y-2">
            <p className="text-sm text-ink-600 dark:text-ink-300">
              {modal.conta.ativo ? 'Inativar' : 'Reativar'}{' '}
              <span className="font-semibold text-ink-900 dark:text-ink-50">{rotuloConta(modal.conta, rotuloBanco)}</span>?
            </p>
            <p className="text-xs text-ink-400">
              Inativar não apaga: a conta deixa de ser oferecida em novos lançamentos, e tudo o que
              já a cita continua legível.
            </p>
          </div>
        )}
      </Modal>

      <Modal
        open={modal.tipo === 'excluir'}
        onClose={() => setModal({ tipo: 'fechado' })}
        title="Excluir conta"
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModal({ tipo: 'fechado' })} disabled={processando}>
              Cancelar
            </Button>
            <Button variant="danger" onClick={() => confirmar('excluir')} disabled={processando}>
              {processando && <Loader2 className="h-4 w-4 animate-spin" />}
              Excluir
            </Button>
          </>
        }
      >
        {modal.tipo === 'excluir' && (
          <div className="space-y-2">
            <p className="text-sm text-ink-600 dark:text-ink-300">
              Excluir <span className="font-semibold text-ink-900 dark:text-ink-50">{rotuloConta(modal.conta, rotuloBanco)}</span>?
            </p>
            <p className="text-xs text-ink-400">
              Conta vinculada a algum ajuste não pode ser excluída — o vínculo apontaria para o
              nada. Nesse caso, <strong>inative</strong>.
            </p>
          </div>
        )}
      </Modal>
    </>
  );
}

function ContaForm({
  conta,
  onSuccess,
  onCancel,
}: {
  conta: ContaBancaria | null;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const [banco, setBanco] = useState(conta ? String(conta.banco) : '');
  const [agencia, setAgencia] = useState(conta?.agencia ?? '');
  const [numero, setNumero] = useState(conta?.conta ?? '');
  const [tipo, setTipo] = useState(conta?.contaTipo != null ? String(conta.contaTipo) : '');
  const [fonte, setFonte] = useState(conta?.fonteRecursoTipo != null ? String(conta.fonteRecursoTipo) : '');
  const [apelido, setApelido] = useState(conta?.apelido ?? '');
  const [observacao, setObservacao] = useState(conta?.observacao ?? '');
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  async function submeter(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    if (!banco) return setErro('Selecione o banco.');
    if (!agencia.trim()) return setErro('Informe a agência.');
    if (!numero.trim()) return setErro('Informe o número da conta.');
    if (!fonte) return setErro('Selecione a fonte de recurso que entra nesta conta.');

    const payload = {
      banco: Number(apenasDigitos(banco)),
      agencia: agencia.trim(),
      conta: numero.trim(),
      contaTipo: tipo ? Number(apenasDigitos(tipo)) : null,
      fonteRecursoTipo: Number(apenasDigitos(fonte)),
      apelido: apelido.trim() || null,
      observacao: observacao.trim() || null,
    };

    setSalvando(true);
    try {
      if (conta) await contasApi.atualizar(conta.id, payload);
      else await contasApi.criar(payload);
      onSuccess();
    } catch (e) {
      setErro(extrairMensagemErro(e, 'Não foi possível salvar a conta.'));
    } finally {
      setSalvando(false);
    }
  }

  return (
    <form onSubmit={submeter} className="space-y-4">
      {erro && (
        <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{erro}</span>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-12">
        <div className="sm:col-span-12">
          <Input
            label="Apelido"
            name="apelido"
            value={apelido}
            onChange={(e) => setApelido(e.target.value)}
            placeholder="Ex.: Repasse Saúde 2026"
            hint="É por ele que a conta se reconhece nas outras telas. Três números não dizem nada de relance."
          />
        </div>
        <div className="sm:col-span-6">
          <SelectDominio label="Banco *" name="banco" value={apenasDigitos(banco)} onChange={setBanco} options={BANCO} />
        </div>
        <div className="sm:col-span-3">
          {/* Texto, não número: agência tem dígito verificador e zero à
              esquerda, e guardá-la como número comeria os dois. */}
          <Input label="Agência *" name="agencia" value={agencia} onChange={(e) => setAgencia(e.target.value)} placeholder="0001-2" />
        </div>
        <div className="sm:col-span-3">
          <Input label="Conta *" name="conta" value={numero} onChange={(e) => setNumero(e.target.value)} placeholder="56789-0" />
        </div>
        <div className="sm:col-span-6">
          <SelectDominio label="Tipo" name="contaTipo" value={apenasDigitos(tipo)} onChange={setTipo} options={CONTA_TIPO} />
        </div>
        <div className="sm:col-span-6">
          <SelectDominio
            label="Fonte de Recurso *"
            name="fonteRecursoTipo"
            value={apenasDigitos(fonte)}
            onChange={setFonte}
            options={FONTE_RECURSO}
            hint="O pagamento feito por esta conta herda esta fonte."
          />
        </div>
        <div className="sm:col-span-12">
          <Input label="Observação" name="observacao" value={observacao} onChange={(e) => setObservacao(e.target.value)} />
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 pt-1">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={salvando}>
          Cancelar
        </Button>
        <Button type="submit" disabled={salvando}>
          {salvando && <Loader2 className="h-4 w-4 animate-spin" />}
          {salvando ? 'Salvando...' : 'Salvar'}
        </Button>
      </div>
    </form>
  );
}
