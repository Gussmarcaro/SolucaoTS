import { useEffect, useState } from 'react';
import { AlertCircle, CopyPlus, Loader2, Pencil, Plus, Trash2 } from 'lucide-react';
import {
  copiarCronogramaExercicio,
  copiarPlanoExercicio,
  exerciciosDoCronograma,
  exerciciosDoPlano,
} from '@/services/ajusteCsv.service';
import { CopiarExercicio } from './CopiarExercicio';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { GradeSimples } from '@/components/ui/GradeSimples';
import type { ColunaDef } from '@/hooks/useResizableColumns';
import { dataBr, formatarMoeda, mascaraMoeda, moedaParaNumero, numeroParaMascaraMoeda } from '@/lib/masks';
import { enterComoTab } from '@/lib/enterComoTab';
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
  | { tipo: 'excluir'; termo: TermoAditivo }
  | { tipo: 'replicar'; termo: TermoAditivo };

/** Ações sempre primeiro, como nas grades dos cadastros. */
const COLUNAS: ColunaDef[] = [
  { key: 'acoes', label: 'Ações', width: 100, minWidth: 90, align: 'center', movivel: false },
  { key: 'numero', label: 'Número', width: 160, sortKey: 'numero' },
  { key: 'assinatura', label: 'Assinatura', width: 140, sortKey: 'dataAssinatura' },
  { key: 'acrescimo', label: 'Acréscimo', width: 160, align: 'right', sortKey: 'valorAcrescido' },
  { key: 'supressao', label: 'Supressão', width: 160, align: 'right', sortKey: 'valorSuprimido' },
];

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

      <GradeSimples
        storageKey="@SolucaoTS:grid:termosAditivos:v1"
        colunas={COLUNAS}
        dados={lista}
        chave={(t) => t.id}
        carregando={carregando}
        erro={erro}
        vazio="Nenhum termo aditivo cadastrado."
        onDuploClique={(t) => setModal({ tipo: 'form', termo: t })}
        valorOrdenacao={(campo, t) => {
          if (campo === 'numero') return t.numero;
          if (campo === 'dataAssinatura') return t.dataAssinatura;
          if (campo === 'valorAcrescido') return t.valorAcrescido;
          if (campo === 'valorSuprimido') return t.valorSuprimido;
          return null;
        }}
        renderCell={(coluna, t) => {
          switch (coluna) {
            case 'acoes':
              return (
                <div className="flex items-center justify-center gap-1">
                  <IconBtn title="Editar" onClick={() => setModal({ tipo: 'form', termo: t })}>
                    <Pencil className="h-4 w-4" />
                  </IconBtn>
                  {/*
                    Replicar plano e cronograma é ação **do aditivo**, e não da
                    aba do plano: a norma manda o aditivo replicá-los, e o
                    exercício criado precisa saber por qual instrumento foi
                    pactuado. Feita daqui, a cópia já nasce carimbada.
                  */}
                  <IconBtn title="Replicar plano e cronograma" onClick={() => setModal({ tipo: 'replicar', termo: t })}>
                    <CopyPlus className="h-4 w-4" />
                  </IconBtn>
                  <IconBtn title="Excluir" danger onClick={() => setModal({ tipo: 'excluir', termo: t })}>
                    <Trash2 className="h-4 w-4" />
                  </IconBtn>
                </div>
              );
            case 'numero':
              return (
                <div className="min-w-0">
                  <span className="block truncate font-medium text-ink-800 dark:text-ink-100">{t.numero}</span>
                  {t.objeto && (
                    <span className="block truncate text-xs text-ink-400" title={t.objeto}>
                      {t.objeto}
                    </span>
                  )}
                </div>
              );
            case 'assinatura':
              return (
                <div className="min-w-0">
                  <span className="block truncate text-ink-600 dark:text-ink-300">{dataBr(t.dataAssinatura)}</span>
                  {/* A prorrogação é o que o aditivo mais faz — e é o dado que
                      manda no cronograma. Aparece junto da assinatura porque as
                      duas datas só se leem em par. */}
                  {t.novaVigenciaFinal && (
                    <span className="block truncate text-xs text-brand-600 dark:text-brand-400">
                      prorroga até {dataBr(t.novaVigenciaFinal)}
                    </span>
                  )}
                </div>
              );
            case 'acrescimo':
              return (
                <span className="block truncate tabular-nums text-emerald-600 dark:text-emerald-400">
                  {t.valorAcrescido != null ? formatarMoeda(t.valorAcrescido) : '—'}
                </span>
              );
            case 'supressao':
              return (
                <span className="block truncate tabular-nums text-red-500 dark:text-red-400">
                  {t.valorSuprimido != null ? formatarMoeda(t.valorSuprimido) : '—'}
                </span>
              );
            default:
              return null;
          }
        }}
      />

      {/*
        Replicar plano e cronograma pelo aditivo.

        Os dois blocos ficam juntos porque a prorrogação mexe nos dois: o
        exercício novo precisa de plano **e** de desembolsos, e replicar só um
        deixaria o ajuste com metade do ano pactuada.
      */}
      <Modal
        open={modal.tipo === 'replicar'}
        onClose={() => setModal({ tipo: 'fechado' })}
        title={modal.tipo === 'replicar' ? `Replicar pelo aditivo ${modal.termo.numero}` : ''}
        size="lg"
      >
        {modal.tipo === 'replicar' && (
          <div className="space-y-4">
            <p className="text-sm text-ink-600 dark:text-ink-300">
              A norma manda o termo aditivo replicar o <strong>Plano de Aplicação</strong> e o{' '}
              <strong>Cronograma de Desembolso</strong>. Copie cada um para o exercício que este
              aditivo pactua — o que for criado aqui fica vinculado a ele.
            </p>
            {modal.termo.novaVigenciaFinal && (
              <p className="text-sm text-brand-600 dark:text-brand-400">
                Este aditivo prorroga a vigência até{' '}
                <strong>{dataBr(modal.termo.novaVigenciaFinal)}</strong>.
              </p>
            )}
            <div className="flex flex-wrap items-center gap-2">
              <CopiarExercicio
                rotulo="plano"
                rotuloBotao="Replicar plano"
                carregarExercicios={() => exerciciosDoPlano(ajusteId)}
                copiar={(p) =>
                  copiarPlanoExercicio(ajusteId, {
                    ...p,
                    termoAditivoId: modal.tipo === 'replicar' ? modal.termo.id : undefined,
                  })
                }
                onCopiado={recarregar}
              />
              <CopiarExercicio
                rotulo="cronograma"
                rotuloBotao="Replicar cronograma"
                carregarExercicios={() => exerciciosDoCronograma(ajusteId)}
                copiar={(p) =>
                  copiarCronogramaExercicio(ajusteId, {
                    ...p,
                    termoAditivoId: modal.tipo === 'replicar' ? modal.termo.id : undefined,
                  })
                }
                onCopiado={recarregar}
              />
            </div>
            <p className="text-xs text-ink-400">
              Depois de replicar, revise os valores nas abas Plano de Aplicação e Cronograma: o
              aditivo costuma mudar mais que um percentual.
            </p>
          </div>
        )}
      </Modal>

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
  const [novaVigencia, setNovaVigencia] = useState(termo?.novaVigenciaFinal ?? '');
  const [objeto, setObjeto] = useState(termo?.objeto ?? '');
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
      novaVigenciaFinal: novaVigencia || null,
      objeto: objeto.trim() || null,
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
    <form onSubmit={submeter} onKeyDown={enterComoTab} className="space-y-4">
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
        {/* A prorrogação é o aditivo mais comum e não tinha onde ser
            registrada: o ajuste guardava uma vigência que o aditivo mudava sem
            deixar rastro, e o cronograma continuava desenhado para o prazo
            antigo. */}
        <Input
          label="Nova vigência final"
          name="novaVigencia"
          type="date"
          value={novaVigencia}
          onChange={(e) => setNovaVigencia(e.target.value)}
          hint="Preencha quando o aditivo prorrogar o prazo."
        />
        <div className="sm:col-span-2">
          <Input
            label="Objeto do aditivo"
            name="objeto"
            value={objeto}
            onChange={(e) => setObjeto(e.target.value)}
            placeholder="O que este aditivo altera"
          />
        </div>
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
