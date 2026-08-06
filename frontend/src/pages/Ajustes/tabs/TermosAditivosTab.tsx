import { useEffect, useState } from 'react';
import { AlertCircle, Loader2, Pencil, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { dataBr, formatarMoeda, mascaraMoeda, moedaParaNumero, numeroParaMascaraMoeda } from '@/lib/masks';
import { extrairMensagemErro } from '@/services/http';
import {
  atualizarTermo,
  criarTermo,
  excluirTermo,
  listarTermos,
} from '@/services/ajusteFilhos.service';
import type { TermoAditivo, TermoAditivoPayload } from '@/types/ajusteFilhos';

type ModalState =
  | { tipo: 'fechado' }
  | { tipo: 'form'; termo: TermoAditivo | null }
  | { tipo: 'excluir'; termo: TermoAditivo };

export function TermosAditivosTab({ ajusteId }: { ajusteId: string }) {
  const [lista, setLista] = useState<TermoAditivo[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalState>({ tipo: 'fechado' });
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let vivo = true;
    setCarregando(true);
    listarTermos(ajusteId)
      .then((r) => vivo && setLista(r))
      .catch((e) => vivo && setErro(extrairMensagemErro(e, 'Falha ao carregar os termos.')))
      .finally(() => vivo && setCarregando(false));
    return () => {
      vivo = false;
    };
  }, [ajusteId, refreshKey]);

  const recarregar = () => {
    setModal({ tipo: 'fechado' });
    setRefreshKey((k) => k + 1);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-ink-500 dark:text-ink-400">
          Aditamentos que alteram valor ou vigência do ajuste.
        </p>
        <Button size="sm" onClick={() => setModal({ tipo: 'form', termo: null })}>
          <Plus className="h-4 w-4" />
          Adicionar
        </Button>
      </div>

      <div className="overflow-hidden rounded-xl border border-ink-200/70 dark:border-ink-800/70">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-ink-100 text-xs font-semibold text-ink-500 dark:border-ink-800 dark:text-ink-400">
              <th className="px-4 py-2.5">Número</th>
              <th className="px-4 py-2.5">Assinatura</th>
              <th className="px-4 py-2.5 text-right">Acréscimo</th>
              <th className="px-4 py-2.5 text-right">Supressão</th>
              <th className="px-4 py-2.5 text-center">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-100 dark:divide-ink-800">
            {carregando ? (
              <tr>
                <td colSpan={5} className="py-10 text-center">
                  <Loader2 className="mx-auto h-5 w-5 animate-spin text-brand-500" />
                </td>
              </tr>
            ) : erro ? (
              <tr>
                <td colSpan={5} className="py-10 text-center text-sm text-red-500">{erro}</td>
              </tr>
            ) : lista.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-10 text-center text-sm text-ink-400">
                  Nenhum termo aditivo cadastrado.
                </td>
              </tr>
            ) : (
              lista.map((t) => (
                <tr key={t.id} className="hover:bg-ink-50/70 dark:hover:bg-ink-800/40">
                  <td className="px-4 py-2.5 font-medium text-ink-800 dark:text-ink-100">{t.numero}</td>
                  <td className="px-4 py-2.5 text-ink-600 dark:text-ink-300">{dataBr(t.dataAssinatura)}</td>
                  <td className="px-4 py-2.5 text-right text-emerald-600 dark:text-emerald-400">
                    {t.valorAcrescido != null ? formatarMoeda(t.valorAcrescido) : '—'}
                  </td>
                  <td className="px-4 py-2.5 text-right text-red-500 dark:text-red-400">
                    {t.valorSuprimido != null ? formatarMoeda(t.valorSuprimido) : '—'}
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center justify-center gap-1">
                      <IconBtn title="Editar" onClick={() => setModal({ tipo: 'form', termo: t })}>
                        <Pencil className="h-4 w-4" />
                      </IconBtn>
                      <IconBtn title="Excluir" danger onClick={() => setModal({ tipo: 'excluir', termo: t })}>
                        <Trash2 className="h-4 w-4" />
                      </IconBtn>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Modal
        open={modal.tipo === 'form'}
        onClose={() => setModal({ tipo: 'fechado' })}
        title={modal.tipo === 'form' && modal.termo ? 'Editar Termo Aditivo' : 'Novo Termo Aditivo'}
        size="lg"
      >
        {modal.tipo === 'form' && (
          <TermoForm
            ajusteId={ajusteId}
            termo={modal.termo}
            onSuccess={recarregar}
            onCancel={() => setModal({ tipo: 'fechado' })}
          />
        )}
      </Modal>

      <ConfirmarExclusao
        aberto={modal.tipo === 'excluir'}
        rotulo={modal.tipo === 'excluir' ? `o termo aditivo nº ${modal.termo.numero}` : ''}
        onCancel={() => setModal({ tipo: 'fechado' })}
        onConfirm={async () => {
          if (modal.tipo !== 'excluir') return;
          await excluirTermo(ajusteId, modal.termo.id);
          recarregar();
        }}
      />
    </div>
  );
}

function TermoForm({
  ajusteId,
  termo,
  onSuccess,
  onCancel,
}: {
  ajusteId: string;
  termo: TermoAditivo | null;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const [numero, setNumero] = useState(termo?.numero ?? '');
  const [dataAssinatura, setDataAssinatura] = useState(termo?.dataAssinatura ?? '');
  const [acrescido, setAcrescido] = useState(termo?.valorAcrescido != null ? numeroParaMascaraMoeda(termo.valorAcrescido) : '');
  const [suprimido, setSuprimido] = useState(termo?.valorSuprimido != null ? numeroParaMascaraMoeda(termo.valorSuprimido) : '');
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  async function submeter(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    if (!numero.trim()) return setErro('Informe o número do termo.');
    if (!dataAssinatura) return setErro('Informe a data de assinatura.');

    const payload: TermoAditivoPayload = {
      numero: numero.trim(),
      dataAssinatura,
      valorAcrescido: acrescido ? moedaParaNumero(acrescido) : null,
      valorSuprimido: suprimido ? moedaParaNumero(suprimido) : null,
    };
    setSalvando(true);
    try {
      if (termo) await atualizarTermo(ajusteId, termo.id, payload);
      else await criarTermo(ajusteId, payload);
      onSuccess();
    } catch (e) {
      setErro(extrairMensagemErro(e, 'Não foi possível salvar o termo.'));
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
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input label="Número *" name="numero" value={numero} onChange={(e) => setNumero(e.target.value)} />
        <Input label="Data de Assinatura *" name="dataAssinatura" type="date" value={dataAssinatura} onChange={(e) => setDataAssinatura(e.target.value)} />
        <Input label="Valor Acrescido (R$)" name="acrescido" value={acrescido} onChange={(e) => setAcrescido(mascaraMoeda(e.target.value))} placeholder="0,00" inputMode="numeric" />
        <Input label="Valor Suprimido (R$)" name="suprimido" value={suprimido} onChange={(e) => setSuprimido(mascaraMoeda(e.target.value))} placeholder="0,00" inputMode="numeric" />
      </div>
      <div className="flex items-center justify-end gap-2 pt-1">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={salvando}>Cancelar</Button>
        <Button type="submit" disabled={salvando}>
          {salvando && <Loader2 className="h-4 w-4 animate-spin" />}
          {salvando ? 'Salvando...' : 'Salvar'}
        </Button>
      </div>
    </form>
  );
}

export function ConfirmarExclusao({
  aberto,
  rotulo,
  onCancel,
  onConfirm,
}: {
  aberto: boolean;
  rotulo: string;
  onCancel: () => void;
  onConfirm: () => Promise<void>;
}) {
  const [processando, setProcessando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function confirmar() {
    setProcessando(true);
    setErro(null);
    try {
      await onConfirm();
    } catch (e) {
      setErro(extrairMensagemErro(e, 'Não foi possível excluir.'));
    } finally {
      setProcessando(false);
    }
  }

  return (
    <Modal
      open={aberto}
      onClose={onCancel}
      title="Confirmar exclusão"
      size="md"
      footer={
        <>
          <Button variant="secondary" onClick={onCancel} disabled={processando}>Cancelar</Button>
          <Button variant="danger" onClick={confirmar} disabled={processando}>
            {processando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            Excluir
          </Button>
        </>
      }
    >
      <p className="text-sm text-ink-600 dark:text-ink-300">
        Deseja realmente excluir <span className="font-semibold text-ink-900 dark:text-ink-50">{rotulo}</span>? Esta ação não pode ser desfeita.
      </p>
      {erro && <p className="mt-2 text-sm font-medium text-red-500">{erro}</p>}
    </Modal>
  );
}

function IconBtn({
  children,
  title,
  onClick,
  danger,
}: {
  children: React.ReactNode;
  title: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={`focus-ring rounded-lg p-1.5 transition-colors ${
        danger
          ? 'text-ink-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10'
          : 'text-ink-400 hover:bg-ink-100 hover:text-ink-700 dark:hover:bg-ink-800 dark:hover:text-ink-200'
      }`}
    >
      {children}
    </button>
  );
}
