import { useEffect, useState } from 'react';
import { AlertCircle, Loader2, Pencil, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { dataBr } from '@/lib/masks';
import { apenasDigitos } from '@/lib/masks';
import { extrairCodigoErro, extrairMensagemErro } from '@/services/http';
import {
  atualizarEmpenho,
  criarEmpenho,
  excluirEmpenho,
  listarEmpenhos,
} from '@/services/ajusteFilhos.service';
import type { Empenho, EmpenhoPayload } from '@/types/ajusteFilhos';
import { ConfirmarExclusao } from './TermosAditivosTab';

type ModalState =
  | { tipo: 'fechado' }
  | { tipo: 'form'; empenho: Empenho | null }
  | { tipo: 'excluir'; empenho: Empenho };

export function EmpenhosTab({ ajusteId }: { ajusteId: string }) {
  const [lista, setLista] = useState<Empenho[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalState>({ tipo: 'fechado' });
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let vivo = true;
    setCarregando(true);
    listarEmpenhos(ajusteId)
      .then((r) => vivo && setLista(r))
      .catch((e) => vivo && setErro(extrairMensagemErro(e, 'Falha ao carregar os empenhos.')))
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
          Empenhos que dão suporte orçamentário ao ajuste.
        </p>
        <Button size="sm" onClick={() => setModal({ tipo: 'form', empenho: null })}>
          <Plus className="h-4 w-4" />
          Adicionar
        </Button>
      </div>

      <div className="overflow-hidden rounded-xl border border-ink-200/70 dark:border-ink-800/70">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-ink-100 text-xs font-semibold text-ink-500 dark:border-ink-800 dark:text-ink-400">
              <th className="px-4 py-2.5">Número</th>
              <th className="px-4 py-2.5">Ano</th>
              <th className="px-4 py-2.5">Emissão</th>
              <th className="px-4 py-2.5">Retificação</th>
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
                  Nenhum empenho cadastrado.
                </td>
              </tr>
            ) : (
              lista.map((e) => (
                <tr key={e.id} className="hover:bg-ink-50/70 dark:hover:bg-ink-800/40">
                  <td className="px-4 py-2.5 font-mono text-xs text-ink-800 dark:text-ink-100">{e.numeroEmpenho}</td>
                  <td className="px-4 py-2.5 text-ink-600 dark:text-ink-300">{e.anoEmpenho}</td>
                  <td className="px-4 py-2.5 text-ink-600 dark:text-ink-300">{dataBr(e.dataEmissaoEmpenho)}</td>
                  <td className="px-4 py-2.5">
                    {e.retificacao ? <Badge tone="warning">Sim</Badge> : <Badge tone="neutral">Não</Badge>}
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center justify-center gap-1">
                      <IconBtn title="Editar" onClick={() => setModal({ tipo: 'form', empenho: e })}>
                        <Pencil className="h-4 w-4" />
                      </IconBtn>
                      <IconBtn title="Excluir" danger onClick={() => setModal({ tipo: 'excluir', empenho: e })}>
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
        title={modal.tipo === 'form' && modal.empenho ? 'Editar Empenho' : 'Novo Empenho'}
        size="lg"
      >
        {modal.tipo === 'form' && (
          <EmpenhoForm
            ajusteId={ajusteId}
            empenho={modal.empenho}
            onSuccess={recarregar}
            onCancel={() => setModal({ tipo: 'fechado' })}
          />
        )}
      </Modal>

      <ConfirmarExclusao
        aberto={modal.tipo === 'excluir'}
        rotulo={modal.tipo === 'excluir' ? `o empenho nº ${modal.empenho.numeroEmpenho}/${modal.empenho.anoEmpenho}` : ''}
        onCancel={() => setModal({ tipo: 'fechado' })}
        onConfirm={async () => {
          if (modal.tipo !== 'excluir') return;
          await excluirEmpenho(ajusteId, modal.empenho.id);
          recarregar();
        }}
      />
    </div>
  );
}

function EmpenhoForm({
  ajusteId,
  empenho,
  onSuccess,
  onCancel,
}: {
  ajusteId: string;
  empenho: Empenho | null;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const [numeroEmpenho, setNumeroEmpenho] = useState(empenho?.numeroEmpenho ?? '');
  const [anoEmpenho, setAnoEmpenho] = useState(empenho ? String(empenho.anoEmpenho) : '');
  const [dataEmissaoEmpenho, setDataEmissaoEmpenho] = useState(empenho?.dataEmissaoEmpenho ?? '');
  const [retificacao, setRetificacao] = useState(empenho?.retificacao ?? false);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  async function submeter(ev: React.FormEvent) {
    ev.preventDefault();
    setErro(null);
    if (!numeroEmpenho.trim()) return setErro('Informe o número do empenho.');
    const ano = Number(apenasDigitos(anoEmpenho));
    if (!ano || ano < 1900 || ano > 2100) return setErro('Ano do empenho inválido.');
    if (!dataEmissaoEmpenho) return setErro('Informe a data de emissão.');

    const payload: EmpenhoPayload = {
      numeroEmpenho: numeroEmpenho.trim(),
      anoEmpenho: ano,
      retificacao,
      dataEmissaoEmpenho,
    };
    setSalvando(true);
    try {
      if (empenho) await atualizarEmpenho(ajusteId, empenho.id, payload);
      else await criarEmpenho(ajusteId, payload);
      onSuccess();
    } catch (e) {
      const codigo = extrairCodigoErro(e);
      setErro(
        extrairMensagemErro(
          e,
          codigo === 'EMPENHO_DUPLICADO'
            ? 'Já existe um empenho com este número e ano.'
            : 'Não foi possível salvar o empenho.',
        ),
      );
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
        <Input label="Número do Empenho *" name="numeroEmpenho" value={numeroEmpenho} onChange={(e) => setNumeroEmpenho(e.target.value)} />
        <Input label="Ano *" name="anoEmpenho" value={apenasDigitos(anoEmpenho).slice(0, 4)} onChange={(e) => setAnoEmpenho(e.target.value)} placeholder="2025" inputMode="numeric" />
        <Input label="Data de Emissão *" name="dataEmissaoEmpenho" type="date" value={dataEmissaoEmpenho} onChange={(e) => setDataEmissaoEmpenho(e.target.value)} />
        <label className="flex items-center gap-2 pt-7 text-sm text-ink-700 dark:text-ink-200">
          <input
            type="checkbox"
            checked={retificacao}
            onChange={(e) => setRetificacao(e.target.checked)}
            className="h-4 w-4 rounded border-ink-300 text-brand-500 focus:ring-brand-400 dark:border-ink-600 dark:bg-ink-800"
          />
          É uma retificação
        </label>
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
