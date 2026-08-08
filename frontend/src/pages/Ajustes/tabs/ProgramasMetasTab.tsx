import { useEffect, useState } from 'react';
import { AlertCircle, Loader2, Pencil, Plus, Target, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { extrairCodigoErro, extrairMensagemErro } from '@/services/http';
import {
  atualizarMeta,
  atualizarPrograma,
  criarMeta,
  criarPrograma,
  excluirMeta,
  excluirPrograma,
  listarProgramas,
} from '@/services/programas.service';
import type { Meta, Programa } from '@/types/programa';
import { ConfirmarExclusao } from './TermosAditivosTab';

type ModalState =
  | { tipo: 'fechado' }
  | { tipo: 'programa'; programa: Programa | null }
  | { tipo: 'meta'; programaId: string; meta: Meta | null }
  | { tipo: 'delProg'; programa: Programa }
  | { tipo: 'delMeta'; programaId: string; meta: Meta };

export function ProgramasMetasTab({ ajusteId }: { ajusteId: string }) {
  const [programas, setProgramas] = useState<Programa[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [modal, setModal] = useState<ModalState>({ tipo: 'fechado' });

  useEffect(() => {
    let vivo = true;
    setCarregando(true);
    listarProgramas(ajusteId)
      .then((r) => vivo && setProgramas(r))
      .catch((e) => vivo && setErro(extrairMensagemErro(e, 'Falha ao carregar os programas.')))
      .finally(() => vivo && setCarregando(false));
    return () => {
      vivo = false;
    };
  }, [ajusteId, refreshKey]);

  const recarregar = () => {
    setModal({ tipo: 'fechado' });
    setRefreshKey((k) => k + 1);
  };
  const fechar = () => setModal({ tipo: 'fechado' });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-ink-500 dark:text-ink-400">
          Plano de metas: programas e suas metas (quantificáveis ou não).
        </p>
        <Button size="sm" onClick={() => setModal({ tipo: 'programa', programa: null })}>
          <Plus className="h-4 w-4" />
          Novo programa
        </Button>
      </div>

      {carregando ? (
        <div className="py-10 text-center">
          <Loader2 className="mx-auto h-5 w-5 animate-spin text-brand-500" />
        </div>
      ) : erro ? (
        <p className="py-8 text-center text-sm text-red-500">{erro}</p>
      ) : programas.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-ink-300 py-12 text-center dark:border-ink-700">
          <p className="text-sm text-ink-400">Nenhum programa cadastrado.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {programas.map((p) => (
            <div key={p.id} className="rounded-xl border border-ink-200/70 dark:border-ink-800/70">
              <div className="flex items-center justify-between gap-2 border-b border-ink-100 px-4 py-3 dark:border-ink-800">
                <div className="flex min-w-0 items-center gap-2">
                  <Target className="h-4 w-4 shrink-0 text-brand-500" />
                  <span className="truncate font-semibold text-ink-800 dark:text-ink-100" title={p.nome}>{p.nome}</span>
                  <Badge tone="neutral">{p.metas.length} meta(s)</Badge>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <IconBtn title="Adicionar meta" onClick={() => setModal({ tipo: 'meta', programaId: p.id, meta: null })}>
                    <Plus className="h-4 w-4" />
                  </IconBtn>
                  <IconBtn title="Editar programa" onClick={() => setModal({ tipo: 'programa', programa: p })}>
                    <Pencil className="h-4 w-4" />
                  </IconBtn>
                  <IconBtn title="Excluir programa" danger onClick={() => setModal({ tipo: 'delProg', programa: p })}>
                    <Trash2 className="h-4 w-4" />
                  </IconBtn>
                </div>
              </div>

              {p.metas.length === 0 ? (
                <p className="px-4 py-3 text-sm text-ink-400">Sem metas. Use “+” para adicionar.</p>
              ) : (
                <ul className="divide-y divide-ink-100 dark:divide-ink-800">
                  {p.metas.map((m) => (
                    <li key={m.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                      <div className="flex min-w-0 items-center gap-2">
                        <span className="font-mono text-xs text-ink-700 dark:text-ink-200">{m.codigoMeta}</span>
                        {m.descricao && <span className="truncate text-sm text-ink-500 dark:text-ink-400">— {m.descricao}</span>}
                        <Badge tone={m.quantificavel ? 'brand' : 'neutral'}>
                          {m.quantificavel ? 'Quantificável' : 'Qualitativa'}
                        </Badge>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        <IconBtn title="Editar meta" onClick={() => setModal({ tipo: 'meta', programaId: p.id, meta: m })}>
                          <Pencil className="h-4 w-4" />
                        </IconBtn>
                        <IconBtn title="Excluir meta" danger onClick={() => setModal({ tipo: 'delMeta', programaId: p.id, meta: m })}>
                          <Trash2 className="h-4 w-4" />
                        </IconBtn>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Form de programa */}
      <Modal
        open={modal.tipo === 'programa'}
        onClose={fechar}
        title={modal.tipo === 'programa' && modal.programa ? 'Editar Programa' : 'Novo Programa'}
        size="md"
      >
        {modal.tipo === 'programa' && (
          <ProgramaForm
            ajusteId={ajusteId}
            programa={modal.programa}
            onSuccess={recarregar}
            onCancel={fechar}
          />
        )}
      </Modal>

      {/* Form de meta */}
      <Modal
        open={modal.tipo === 'meta'}
        onClose={fechar}
        title={modal.tipo === 'meta' && modal.meta ? 'Editar Meta' : 'Nova Meta'}
        size="md"
      >
        {modal.tipo === 'meta' && (
          <MetaForm
            ajusteId={ajusteId}
            programaId={modal.programaId}
            meta={modal.meta}
            onSuccess={recarregar}
            onCancel={fechar}
          />
        )}
      </Modal>

      <ConfirmarExclusao
        aberto={modal.tipo === 'delProg'}
        rotulo={modal.tipo === 'delProg' ? `o programa “${modal.programa.nome}” e suas metas` : ''}
        onCancel={fechar}
        onConfirm={async () => {
          if (modal.tipo !== 'delProg') return;
          await excluirPrograma(ajusteId, modal.programa.id);
          recarregar();
        }}
      />
      <ConfirmarExclusao
        aberto={modal.tipo === 'delMeta'}
        rotulo={modal.tipo === 'delMeta' ? `a meta ${modal.meta.codigoMeta}` : ''}
        onCancel={fechar}
        onConfirm={async () => {
          if (modal.tipo !== 'delMeta') return;
          await excluirMeta(ajusteId, modal.programaId, modal.meta.id);
          recarregar();
        }}
      />
    </div>
  );
}

function ProgramaForm({
  ajusteId,
  programa,
  onSuccess,
  onCancel,
}: {
  ajusteId: string;
  programa: Programa | null;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const [nome, setNome] = useState(programa?.nome ?? '');
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  async function submeter(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    if (!nome.trim()) return setErro('Informe o nome do programa.');
    setSalvando(true);
    try {
      if (programa) await atualizarPrograma(ajusteId, programa.id, { nome: nome.trim() });
      else await criarPrograma(ajusteId, { nome: nome.trim() });
      onSuccess();
    } catch (e) {
      setErro(extrairMensagemErro(e, 'Não foi possível salvar o programa.'));
    } finally {
      setSalvando(false);
    }
  }

  return (
    <form onSubmit={submeter} className="space-y-4">
      {erro && <Alerta msg={erro} />}
      <Input label="Nome do Programa *" name="nome" value={nome} onChange={(e) => setNome(e.target.value)} autoFocus />
      <Rodape salvando={salvando} onCancel={onCancel} />
    </form>
  );
}

function MetaForm({
  ajusteId,
  programaId,
  meta,
  onSuccess,
  onCancel,
}: {
  ajusteId: string;
  programaId: string;
  meta: Meta | null;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const [codigoMeta, setCodigoMeta] = useState(meta?.codigoMeta ?? '');
  const [descricao, setDescricao] = useState(meta?.descricao ?? '');
  const [quantificavel, setQuantificavel] = useState(meta?.quantificavel ?? true);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  async function submeter(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    if (!codigoMeta.trim()) return setErro('Informe o código da meta.');
    const payload = { codigoMeta: codigoMeta.trim(), descricao: descricao.trim() || null, quantificavel };
    setSalvando(true);
    try {
      if (meta) await atualizarMeta(ajusteId, programaId, meta.id, payload);
      else await criarMeta(ajusteId, programaId, payload);
      onSuccess();
    } catch (e) {
      const codigo = extrairCodigoErro(e);
      setErro(
        extrairMensagemErro(
          e,
          codigo === 'META_DUPLICADA' ? 'Já existe uma meta com este código.' : 'Não foi possível salvar a meta.',
        ),
      );
    } finally {
      setSalvando(false);
    }
  }

  return (
    <form onSubmit={submeter} className="space-y-4">
      {erro && <Alerta msg={erro} />}
      <Input label="Código da Meta *" name="codigoMeta" value={codigoMeta} onChange={(e) => setCodigoMeta(e.target.value)} autoFocus />
      <Input label="Descrição" name="descricao" value={descricao} onChange={(e) => setDescricao(e.target.value)} />
      <label className="flex items-center gap-2 text-sm text-ink-700 dark:text-ink-200">
        <input
          type="checkbox"
          checked={quantificavel}
          onChange={(e) => setQuantificavel(e.target.checked)}
          className="h-4 w-4 rounded border-ink-300 text-brand-500 focus:ring-brand-400 dark:border-ink-600 dark:bg-ink-800"
        />
        Meta quantificável (usa quantidade realizada)
      </label>
      <Rodape salvando={salvando} onCancel={onCancel} />
    </form>
  );
}

function Alerta({ msg }: { msg: string }) {
  return (
    <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{msg}</span>
    </div>
  );
}

function Rodape({ salvando, onCancel }: { salvando: boolean; onCancel: () => void }) {
  return (
    <div className="flex items-center justify-end gap-2 pt-1">
      <Button type="button" variant="secondary" onClick={onCancel} disabled={salvando}>Cancelar</Button>
      <Button type="submit" disabled={salvando}>
        {salvando && <Loader2 className="h-4 w-4 animate-spin" />}
        {salvando ? 'Salvando...' : 'Salvar'}
      </Button>
    </div>
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
