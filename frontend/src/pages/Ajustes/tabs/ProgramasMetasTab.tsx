import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Copy, Loader2, Pencil, Plus, Target, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { enterComoTab } from '@/lib/enterComoTab';
import { capitalizarNome } from '@/lib/nomeProprio';
import { dataBr } from '@/lib/masks';
import { Badge } from '@/components/ui/Badge';
import {
  PERIODICIDADES_META,
  QUALIFICADORES_META,
  TIPOS_META,
  distribuirProporcional,
  ehQuantificavel,
  gerarPeriodos,
  intervaloPeriodo,
  rotuloPeriodicidadeMeta,
  rotuloPeriodo,
  rotuloTipo,
  temDetalhePeriodico,
  type PeriodicidadeMeta,
  type QualificadorMeta,
  type TipoMeta,
} from '@/types/meta';
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
        <Button variant="success" size="sm" onClick={() => setModal({ tipo: 'programa', programa: null })}>
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
                      <div className="flex min-w-0 flex-col gap-0.5">
                        <div className="flex min-w-0 items-center gap-2">
                          <span className="font-mono text-xs text-ink-700 dark:text-ink-200">{m.codigoMeta}</span>
                          <span className="truncate text-sm text-ink-700 dark:text-ink-200" title={m.nome}>
                            {m.nome || m.descricao || '—'}
                          </span>
                          {/* Mostra o total pactuado, não só o tipo: o número é
                              o que se quer conferir de relance na lista. */}
                          <Badge tone={m.quantificavel ? 'brand' : 'neutral'}>
                            {m.quantificavel
                              ? m.periodicidades.length
                                ? `${totalPrevisto(m).toLocaleString('pt-BR')} ${m.unidadeMedida ?? ''}`.trim()
                                : 'Sem períodos'
                              : 'Qualitativa'}
                          </Badge>
                        </div>
                        <span className="truncate text-xs text-ink-400">
                          {m.quantificavel
                            ? `${rotuloPeriodicidadeMeta(m.periodicidade)} · ${m.periodicidades.length} período(s)`
                            : rotuloTipo(m.tipo)}
                          {m.vigenciaInicio && m.vigenciaFim
                            ? ` · ${dataBr(m.vigenciaInicio)} a ${dataBr(m.vigenciaFim)}`
                            : ''}
                        </span>
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
    <form onSubmit={submeter} onKeyDown={enterComoTab} className="space-y-4">
      {erro && <Alerta msg={erro} />}
      <Input label="Nome do Programa *" name="nome" value={nome} onChange={(e) => setNome(capitalizarNome(e.target.value))} autoFocus />
      <Rodape salvando={salvando} onCancel={onCancel} />
    </form>
  );
}

/** O total pactuado numa meta — a soma dos períodos. */
export function totalPrevisto(m: Meta): number {
  return Math.round(m.periodicidades.reduce((s, p) => s + p.quantidade, 0) * 100) / 100;
}

/** Uma linha do quadro, no estado do formulário (quantidade ainda é texto). */
interface LinhaQuadro {
  ano: number;
  periodo: number;
  qualificador: QualificadorMeta;
  quantidade: string;
}

const numeroBr = (v: number) => String(v).replace('.', ',');

/**
 * Cadastro de uma meta do Plano de Metas.
 *
 * **O que esta tela existe para evitar.** A meta é a maior fonte de rejeição da
 * Fase V: a aferição enviada na prestação precisa casar com o cadastro feito na
 * tela do TCESP em código, nome, período e periodicidade. Um período a mais ou
 * a menos não quebra nada aqui — só lá, meses depois.
 *
 * Por isso **os períodos não são digitados**: saem da vigência e da
 * periodicidade, pelo mesmo cálculo que o servidor usa para conferir
 * (`types/meta.ts`, espelho de `core/meta/periodos.ts`). O usuário preenche
 * quantidades; a lista de períodos não é escolha dele.
 */
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
  const [nome, setNome] = useState(meta?.nome ?? '');
  const [descricao, setDescricao] = useState(meta?.descricao ?? '');
  const [tipo, setTipo] = useState<TipoMeta>(meta?.tipo ?? 'QUANTITATIVA');
  const [unidade, setUnidade] = useState(meta?.unidadeMedida ?? '');
  const [periodicidade, setPeriodicidade] = useState<PeriodicidadeMeta>(
    meta?.periodicidade && meta.periodicidade !== 'UNICA' ? meta.periodicidade : 'MENSAL',
  );
  const [vigenciaInicio, setVigenciaInicio] = useState(meta?.vigenciaInicio ?? '');
  const [vigenciaFim, setVigenciaFim] = useState(meta?.vigenciaFim ?? '');
  const [quadro, setQuadro] = useState<LinhaQuadro[]>(
    meta?.periodicidades.map((p) => ({
      ano: p.ano,
      periodo: p.periodo,
      qualificador: p.qualificador,
      quantidade: numeroBr(p.quantidade),
    })) ?? [],
  );
  const [igual, setIgual] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  const quantificavel = ehQuantificavel(tipo);
  const comQuadro = temDetalhePeriodico(tipo);

  const periodos = useMemo(
    () => (comQuadro ? gerarPeriodos(periodicidade, vigenciaInicio, vigenciaFim) : []),
    [comQuadro, periodicidade, vigenciaInicio, vigenciaFim],
  );

  /*
   * O quadro acompanha a vigência, **preservando o que já foi digitado**.
   *
   * Mexer na data final para corrigir um dia não pode apagar dez quantidades já
   * preenchidas: cada período é reencontrado por ano+período, e só os que
   * deixaram de existir somem. É a diferença entre ajustar uma data e refazer o
   * cadastro.
   */
  useEffect(() => {
    setQuadro((atual) => {
      const antes = new Map(atual.map((l) => [`${l.ano}/${l.periodo}`, l]));
      return periodos.map(
        (p) =>
          antes.get(`${p.ano}/${p.periodo}`) ?? {
            ano: p.ano,
            periodo: p.periodo,
            qualificador: 'IGUAL_A' as QualificadorMeta,
            quantidade: '',
          },
      );
    });
  }, [periodos]);

  const alterarLinha = (i: number, campo: keyof LinhaQuadro, valor: string) =>
    setQuadro((q) => q.map((l, k) => (k === i ? { ...l, [campo]: valor } : l)));

  /**
   * O botão "mesma quantidade em todos", do manual — com a correção que ele
   * não prevê: **quando há período parcial, o mesmo número em todos não é
   * "igual"**. Exigir 100 atendimentos de um quadrimestre de 3 meses e de outro
   * de 4 é exigir mais do primeiro. Aqui o número informado é o do período
   * cheio, e os parciais recebem a parte proporcional aos seus meses.
   */
  const temParcial = periodos.some((p) => p.parcial);
  function replicar() {
    const n = Number(igual.replace(/\./g, '').replace(',', '.'));
    if (!Number.isFinite(n) || n <= 0) return setErro('Informe a quantidade a replicar.');
    setErro(null);
    const mesesCheios = periodos.length ? Math.max(...periodos.map((p) => p.meses)) : 1;
    const partes = distribuirProporcional(
      (n / mesesCheios) * periodos.reduce((s, p) => s + p.meses, 0),
      periodos,
    );
    setQuadro((q) => q.map((l, i) => ({ ...l, quantidade: numeroBr(partes[i] ?? 0) })));
  }

  const total = quadro.reduce(
    (s, l) => s + (Number(l.quantidade.replace(/\./g, '').replace(',', '.')) || 0),
    0,
  );

  async function submeter(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    if (!codigoMeta.trim()) return setErro('Informe o código da meta.');
    if (!nome.trim()) return setErro('Informe a meta.');
    if (quantificavel) {
      if (!unidade.trim()) return setErro('Informe a unidade de medida da meta.');
      if (!vigenciaInicio || !vigenciaFim)
        return setErro('Informe a vigência da meta — é ela que define os períodos.');
      if (!periodos.length)
        return setErro('A vigência informada não gera nenhum período. Confira as datas.');
      const vazio = quadro.find((l) => !l.quantidade.trim());
      if (vazio)
        return setErro(`Informe a quantidade prevista do período ${vazio.periodo}/${vazio.ano}.`);
    }

    const payload = {
      codigoMeta: codigoMeta.trim(),
      nome: nome.trim(),
      descricao: descricao.trim() || null,
      tipo,
      // Vazios na meta não quantificável: o servidor recusaria número e unidade
      // numa meta que se afere por "cumprida / não cumprida".
      unidadeMedida: quantificavel ? unidade.trim() : null,
      periodicidade: quantificavel ? periodicidade : ('UNICA' as PeriodicidadeMeta),
      vigenciaInicio: vigenciaInicio || null,
      vigenciaFim: vigenciaFim || null,
      periodicidades: comQuadro
        ? quadro.map((l) => ({
            ano: l.ano,
            periodo: l.periodo,
            qualificador: l.qualificador,
            quantidade: l.quantidade,
          }))
        : [],
    };

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

  const ajudaDoTipo = TIPOS_META.find((t) => t.id === tipo)?.ajuda;

  return (
    <form onSubmit={submeter} onKeyDown={enterComoTab} className="space-y-4">
      {erro && <Alerta msg={erro} />}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-12">
        <div className="sm:col-span-3">
          <Input label="Código da Meta *" name="codigoMeta" value={codigoMeta} onChange={(e) => setCodigoMeta(e.target.value)} autoFocus />
        </div>
        <div className="sm:col-span-9">
          <Input
            label="Meta *"
            name="nome"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Ex.: Comissão implantada e reuniões mensais realizadas"
          />
        </div>
      </div>

      <Input label="Descrição" name="descricao" value={descricao} onChange={(e) => setDescricao(e.target.value)} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-12">
        <div className="sm:col-span-6">
          <Select
            label="Tipo *"
            name="tipo"
            value={tipo}
            onChange={(e) => setTipo(e.target.value as TipoMeta)}
            options={TIPOS_META.map((t) => ({ value: t.id, label: t.rotulo }))}
          />
          {ajudaDoTipo && <p className="mt-1 text-xs text-ink-400">{ajudaDoTipo}</p>}
        </div>
        {quantificavel && (
          <div className="sm:col-span-6">
            <Input
              label="Unidade de medida *"
              name="unidadeMedida"
              value={unidade}
              onChange={(e) => setUnidade(e.target.value)}
              placeholder="Ex.: consultas, atendimentos, relatórios"
              hint="Sem a unidade, o número sozinho não diz o que foi pactuado."
            />
          </div>
        )}
      </div>

      {/*
        Vigência **da meta**, que não é a do ajuste: é ela que decide quantos
        períodos existem e quais são parciais.
      */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-12">
        <div className="sm:col-span-4">
          <Select
            label="Periodicidade *"
            name="periodicidade"
            value={quantificavel ? periodicidade : 'UNICA'}
            disabled={!quantificavel}
            onChange={(e) => setPeriodicidade(e.target.value as PeriodicidadeMeta)}
            /* "Única" é a periodicidade da não quantificável e não se escolhe:
               ela aparece como única opção, desabilitada, justamente para o
               campo não ficar em branco ao trocar o tipo. */
            options={
              quantificavel
                ? PERIODICIDADES_META.filter((p) => p.id !== 'UNICA').map((p) => ({
                    value: p.id,
                    label: p.rotulo,
                  }))
                : [{ value: 'UNICA', label: 'Única' }]
            }
          />
          {!quantificavel && (
            <p className="mt-1 text-xs text-ink-400">A não quantificável se afere uma vez só.</p>
          )}
        </div>
        <div className="sm:col-span-4">
          <Input
            label={`Vigência inicial${quantificavel ? ' *' : ''}`}
            name="vigenciaInicio"
            type="date"
            value={vigenciaInicio}
            onChange={(e) => setVigenciaInicio(e.target.value)}
          />
        </div>
        <div className="sm:col-span-4">
          <Input
            label={`Vigência final${quantificavel ? ' *' : ''}`}
            name="vigenciaFim"
            type="date"
            value={vigenciaFim}
            onChange={(e) => setVigenciaFim(e.target.value)}
          />
        </div>
      </div>

      {comQuadro && (
        <div className="rounded-xl border border-ink-200/70 dark:border-ink-800/70">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-ink-100 px-3 py-2 dark:border-ink-800">
            <span className="text-sm font-semibold text-ink-700 dark:text-ink-200">
              Quantidade prevista por período
            </span>
            {periodos.length > 0 && (
              <div className="flex items-center gap-2">
                <input
                  value={igual}
                  onChange={(e) => setIgual(e.target.value.replace(/[^\d,]/g, ''))}
                  placeholder="Ex.: 100"
                  inputMode="decimal"
                  aria-label="Quantidade a replicar em todos os períodos"
                  className="focus-ring h-8 w-24 rounded-lg border border-ink-200 bg-white px-2 text-[12px] text-ink-800 dark:border-ink-700 dark:bg-ink-900 dark:text-ink-100"
                />
                <Button type="button" variant="secondary" size="sm" onClick={replicar}>
                  <Copy className="h-3.5 w-3.5" />
                  Igual em todos
                </Button>
              </div>
            )}
          </div>

          {periodos.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-ink-400">
              Informe a periodicidade e a vigência da meta para montar os períodos.
            </p>
          ) : (
            <>
              <ul className="divide-y divide-ink-100 dark:divide-ink-800">
                {periodos.map((p, i) => (
                  <li key={`${p.ano}/${p.periodo}`} className="flex flex-wrap items-center gap-3 px-3 py-2">
                    <div className="min-w-0 flex-1">
                      <span className="text-sm text-ink-700 dark:text-ink-200">
                        {rotuloPeriodo(periodicidade, p)} de {p.ano}
                      </span>
                      <span className="ml-2 text-xs text-ink-400">{intervaloPeriodo(p)}</span>
                      {/* O parcial é avisado porque é o que surpreende: o
                          usuário espera 3 quadrimestres iguais e recebe um de
                          3 meses e outro de 1. */}
                      {p.parcial && (
                        <Badge tone="neutral">
                          {p.meses} {p.meses === 1 ? 'mês' : 'meses'}
                        </Badge>
                      )}
                    </div>
                    <select
                      value={quadro[i]?.qualificador ?? 'IGUAL_A'}
                      onChange={(e) => alterarLinha(i, 'qualificador', e.target.value)}
                      aria-label={`Qualificador do período ${p.periodo}/${p.ano}`}
                      className="focus-ring h-8 rounded-lg border border-ink-200 bg-white px-2 text-[12px] text-ink-800 dark:border-ink-700 dark:bg-ink-900 dark:text-ink-100"
                    >
                      {QUALIFICADORES_META.map((q) => (
                        <option key={q.id} value={q.id}>
                          {q.simbolo} {q.rotulo}
                        </option>
                      ))}
                    </select>
                    <input
                      value={quadro[i]?.quantidade ?? ''}
                      onChange={(e) => alterarLinha(i, 'quantidade', e.target.value.replace(/[^\d,]/g, ''))}
                      inputMode="decimal"
                      aria-label={`Quantidade do período ${p.periodo}/${p.ano}`}
                      className="focus-ring h-8 w-28 rounded-lg border border-ink-200 bg-white px-2 text-right text-[12px] tabular-nums text-ink-800 dark:border-ink-700 dark:bg-ink-900 dark:text-ink-100"
                    />
                  </li>
                ))}
              </ul>
              <div className="flex items-center justify-between border-t border-ink-100 px-3 py-2 text-sm dark:border-ink-800">
                <span className="text-ink-500 dark:text-ink-400">
                  {periodos.length} período(s)
                  {temParcial && ' · o primeiro e/ou o último são parciais'}
                </span>
                <span className="font-semibold tabular-nums text-ink-800 dark:text-ink-100">
                  Total: {total.toLocaleString('pt-BR')} {unidade}
                </span>
              </div>
            </>
          )}
        </div>
      )}

      {/*
        Nada disto é transmitido ao TCESP: o schema oficial manda só o
        realizado, porque o pactuado já foi digitado no Plano de Metas do
        portal. Serve ao órgão e à Comissão de Fiscalização — e é o que dá à
        aferição um "previsto" contra o qual comparar.
      */}
      <p className="text-xs text-ink-400">
        O plano de metas não é transmitido — ele é o previsto contra o qual o Relatório de
        Atividades da prestação compara o realizado. Os períodos precisam ser os mesmos que
        foram cadastrados no portal do TCESP.
      </p>

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
