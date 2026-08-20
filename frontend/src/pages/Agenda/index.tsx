import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  CalendarClock,
  CalendarDays,
  CalendarRange,
  CheckCircle2,
  ClipboardList,
  FileWarning,
  List,
  Loader2,
  Lock,
  Pencil,
  Plus,
  Repeat,
  Trash2,
  Users,
  XCircle,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { KpiTile } from '@/components/ui/KpiTile';
import { AcoesGrade, IconBtn } from '@/components/ui/AcoesGrade';
import { usePermissoes } from '@/contexts/PermissoesContext';
import { Calendario } from './Calendario';
import { GradeHoraria } from './GradeHoraria';
import { CompromissoForm } from './CompromissoForm';
import {
  definirStatusCompromisso,
  excluirCompromisso,
  listarCompromissos,
  resumoAgenda,
} from '@/services/compromissos.service';
import { extrairMensagemErro } from '@/services/http';
import { dataBr } from '@/lib/masks';
import { cn } from '@/lib/cn';
import {
  STATUS_LABEL,
  STATUS_TONE,
  classeDaCor,
  TIPO_LABEL,
  horaBr,
  pendenteDeRegistro,
  type Compromisso,
  type ResumoAgenda,
} from '@/types/compromisso';

type Modal_ =
  | { tipo: 'fechado' }
  | { tipo: 'novo'; dia?: Date | null }
  | { tipo: 'editar'; c: Compromisso }
  | { tipo: 'excluir'; c: Compromisso };

/**
 * Agenda de Compromissos.
 *
 * Um compromisso **acontece**; uma tarefa **vence**. É por isso que este módulo
 * não virou mais um recorte da Fiscalização: a reunião não fica "atrasada há 3
 * dias" — ela ocorreu, foi cancelada, ou ainda vem. E o que sobra dela é o
 * registro do que foi tratado.
 *
 * A ligação entre os dois é o que dá sentido ao conjunto: do que ficou pendente
 * na visita nascem **providências**, que viram tarefas ligadas ao compromisso —
 * e aí a Fiscalização, que já sabe cobrar prazo, cobra o que a visita apontou.
 */
export function Agenda() {
  const podeEditar = usePermissoes().pode('AGENDA', 'EDICAO');
  const navigate = useNavigate();

  const [vista, setVista] = useState<'dia' | 'semana' | 'mes' | 'lista'>('mes');
  const [mes, setMes] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  /** Dia de referência das vistas de dia e semana. */
  const [dia, setDia] = useState(() => new Date());
  const [soPendentes, setSoPendentes] = useState(false);
  const [compromissos, setCompromissos] = useState<Compromisso[] | null>(null);
  const [resumo, setResumo] = useState<ResumoAgenda | null>(null);
  const [modal, setModal] = useState<Modal_>({ tipo: 'fechado' });
  const [erro, setErro] = useState<string | null>(null);
  const [processando, setProcessando] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const recarregar = useCallback(() => setRefreshKey((k) => k + 1), []);

  // Janela consultada: no calendário, o mês inteiro (com as bordas das semanas
  // vizinhas, que a grade também mostra). Na lista, tudo que se aplica.
  // A janela é **sempre** enviada — a API recusa consulta sem período, que é o
  // que impede a tela de puxar anos de agenda ao abrir. Na lista vale o mesmo
  // mês exibido no calendário, para as duas vistas contarem a mesma história.
  const janela = useMemo(() => {
    // Cada vista pede exatamente o que mostra — é o que mantém a consulta
    // barata: a vista de dia não tem por que carregar o mês.
    if (vista === 'dia' || vista === 'semana') {
      const de = new Date(dia);
      if (vista === 'semana') de.setDate(de.getDate() - de.getDay());
      de.setHours(0, 0, 0, 0);
      const ate = new Date(de);
      ate.setDate(ate.getDate() + (vista === 'semana' ? 6 : 0));
      ate.setHours(23, 59, 59, 999);
      return { de: de.toISOString(), ate: ate.toISOString() };
    }
    // Mês e lista: o mês exibido, com as bordas das semanas que a grade mostra.
    const de = new Date(mes.getFullYear(), mes.getMonth(), 1);
    de.setDate(de.getDate() - 7);
    const ate = new Date(mes.getFullYear(), mes.getMonth() + 1, 0);
    ate.setDate(ate.getDate() + 7);
    ate.setHours(23, 59, 59, 999);
    return { de: de.toISOString(), ate: ate.toISOString() };
  }, [vista, mes, dia]);

  useEffect(() => {
    let vivo = true;
    setErro(null);
    setCompromissos(null);
    listarCompromissos({ ...janela, pendentesDeRegistro: soPendentes || undefined })
      .then((r) => vivo && setCompromissos(r))
      .catch((e) => vivo && setErro(extrairMensagemErro(e, 'Não foi possível carregar a agenda.')));
    return () => {
      vivo = false;
    };
  }, [janela, soPendentes, refreshKey]);

  useEffect(() => {
    let vivo = true;
    resumoAgenda()
      .then((r) => vivo && setResumo(r))
      .catch(() => vivo && setResumo(null));
    return () => {
      vivo = false;
    };
  }, [refreshKey]);

  const fechar = () => setModal({ tipo: 'fechado' });
  const aoSalvar = () => {
    fechar();
    recarregar();
  };

  async function mudarStatus(c: Compromisso, status: 'REALIZADO' | 'CANCELADO' | 'AGENDADO') {
    setErro(null);
    try {
      await definirStatusCompromisso(c.id, status);
      recarregar();
    } catch (e) {
      setErro(extrairMensagemErro(e, 'Não foi possível alterar a situação.'));
    }
  }

  async function confirmarExclusao() {
    if (modal.tipo !== 'excluir') return;
    setProcessando(true);
    setErro(null);
    try {
      await excluirCompromisso(modal.c.id);
      aoSalvar();
    } catch (e) {
      setErro(extrairMensagemErro(e, 'Não foi possível excluir o compromisso.'));
    } finally {
      setProcessando(false);
    }
  }

  /**
   * Providência nascida do compromisso.
   *
   * Leva à Fiscalização com o formulário preenchido, como o sino já faz: a
   * tarefa é criada lá, onde se escolhe responsável e prazo — e nasce com
   * `compromissoId`, que é o que liga a ata ao que foi feito depois.
   */
  function gerarProvidencia(c: Compromisso) {
    navigate('/fiscalizacao', {
      state: {
        novaTarefa: {
          titulo: `Providência — ${c.titulo}`,
          descricao: `Originada em ${TIPO_LABEL[c.tipo].toLowerCase()} de ${dataBr(c.inicioEm.slice(0, 10))}.`,
          ajusteId: c.ajusteId,
          compromissoId: c.id,
          responsavelId: c.responsavelId,
        },
      },
    });
  }

  const lista = compromissos ?? [];

  return (
    <>
      <PageHeader
        title="Agenda de Compromissos"
        subtitle="Reuniões de monitoramento, visitas in loco e demais compromissos do acompanhamento das parcerias."
        actions={
          <div className="flex items-center gap-2">
            <div className="flex rounded-lg border border-ink-200 p-0.5 dark:border-ink-800">
              {(
                [
                  ['dia', CalendarRange, 'Dia'],
                  ['semana', CalendarRange, 'Semana'],
                  ['mes', CalendarDays, 'Mês'],
                  ['lista', List, 'Lista'],
                ] as const
              ).map(([id, Icone, rotulo]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setVista(id)}
                  title={rotulo}
                  className={cn(
                    'flex items-center gap-1 rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors',
                    vista === id
                      ? 'bg-brand-500 text-white'
                      : 'text-ink-500 hover:bg-ink-100 dark:text-ink-400 dark:hover:bg-ink-800',
                  )}
                >
                  <Icone className="h-3.5 w-3.5" />
                  {rotulo}
                </button>
              ))}
            </div>
            {podeEditar && (
              <Button variant="success" onClick={() => setModal({ tipo: 'novo' })}>
                <Plus className="h-4 w-4" />
                Agendar
              </Button>
            )}
          </div>
        }
      />

      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiTile label="Próximos" valor={resumo ? String(resumo.proximos) : null} icone={CalendarClock} rodape="Agendados daqui para a frente" />
        <KpiTile label="Hoje" valor={resumo ? String(resumo.hoje) : null} icone={CalendarDays} rodape="Compromissos de hoje" />
        <KpiTile
          label="Sem registro"
          valor={resumo ? String(resumo.pendentesDeRegistro) : null}
          icone={FileWarning}
          rodape="Já passaram e ninguém fechou"
          onClick={() => {
            setSoPendentes(true);
            setVista('lista');
          }}
        />
        <KpiTile label="Realizados" valor={resumo ? String(resumo.realizados) : null} icone={CheckCircle2} rodape="Com registro do que foi tratado" />
      </div>

      {erro && <p className="mb-3 text-sm font-medium text-red-500">{erro}</p>}

      {soPendentes && (
        <div className="mb-3 flex items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
          <span>Mostrando só os compromissos que já passaram e continuam sem registro.</span>
          <Button variant="secondary" size="sm" onClick={() => setSoPendentes(false)}>
            Ver todos
          </Button>
        </div>
      )}

      {vista === 'dia' || vista === 'semana' ? (
        <GradeHoraria
          dias={vista === 'semana' ? 7 : 1}
          inicio={dia}
          onInicio={setDia}
          compromissos={lista}
          onAbrir={(c) => setModal({ tipo: 'editar', c })}
          onHorario={(quando) => podeEditar && setModal({ tipo: 'novo', dia: quando })}
        />
      ) : vista === 'mes' ? (
        <Calendario
          mes={mes}
          onMes={setMes}
          compromissos={lista}
          onAbrir={(c) => setModal({ tipo: 'editar', c })}
          onDia={(d) => podeEditar && setModal({ tipo: 'novo', dia: d })}
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-ink-200/70 bg-white shadow-card dark:border-ink-800/70 dark:bg-ink-900">
          {compromissos === null ? (
            <div className="flex h-40 items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-brand-500" />
            </div>
          ) : lista.length === 0 ? (
            <p className="py-16 text-center text-sm text-ink-400">Nenhum compromisso neste recorte.</p>
          ) : (
            <ul className="divide-y divide-ink-100 dark:divide-ink-800">
              {lista.map((c) => (
                <li key={c.id} className="flex flex-wrap items-start gap-3 px-4 py-3 transition-colors hover:bg-ink-50/70 dark:hover:bg-ink-800/40">
                  <span className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-full', classeDaCor(c))} />

                  <div className="min-w-0 flex-1">
                    <p className={cn('truncate text-sm font-medium text-ink-800 dark:text-ink-100', c.status === 'CANCELADO' && 'line-through opacity-60')}>
                      {c.titulo}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-ink-400">
                      {dataBr(c.inicioEm.slice(0, 10))} às {horaBr(c.inicioEm)}
                      {c.diaInteiro ? ' · dia inteiro' : ` – ${horaBr(c.fimEm)}`}
                      {c.local ? ` · ${c.local}` : ''}
                      {c.responsavelNome ? ` · ${c.responsavelNome}` : ''}
                    </p>
                    <p className="mt-0.5 flex flex-wrap items-center gap-2 text-xs">
                      <span className="text-ink-500 dark:text-ink-400">{TIPO_LABEL[c.tipo]}</span>
                      {c.ajusteId && (
                        <Link to={`/cadastro/ajustes/${c.ajusteId}`} className="font-mono text-brand-600 hover:underline dark:text-brand-300">
                          {c.ajusteCodigo}
                        </Link>
                      )}
                      {c.tarefas > 0 && (
                        <span className="flex items-center gap-1 text-ink-400">
                          <ClipboardList className="h-3 w-3" />
                          {c.tarefas} providência(s)
                        </span>
                      )}
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    {/* Identificação visual do particular — a especificação pede
                        que dê para distinguir de relance o que é só seu. */}
                    {c.visibilidade === 'PARTICULAR' && (
                      <span title="Particular — só você vê">
                        <Lock className="h-3.5 w-3.5 text-ink-400" />
                      </span>
                    )}
                    {c.visibilidade === 'RESTRITO' && (
                      <span
                        title={`Restrito a ${c.participantes.length} pessoa(s) e ${c.grupos.length} grupo(s)`}
                      >
                        <Users className="h-3.5 w-3.5 text-ink-400" />
                      </span>
                    )}
                    {c.ocorrencia && (
                      <span title="Repetição da série">
                        <Repeat className="h-3.5 w-3.5 text-ink-400" />
                      </span>
                    )}
                    {pendenteDeRegistro(c) ? (
                      <Badge tone="warning">Sem registro</Badge>
                    ) : (
                      <Badge tone={STATUS_TONE[c.status]}>{STATUS_LABEL[c.status]}</Badge>
                    )}
                    <AcoesGrade recurso="AGENDA">
                      {c.status === 'AGENDADO' && (
                        <IconBtn exige="EDICAO" title="Marcar como realizado" onClick={() => mudarStatus(c, 'REALIZADO')}>
                          <CheckCircle2 className="h-4 w-4" />
                        </IconBtn>
                      )}
                      {c.status === 'AGENDADO' && (
                        <IconBtn exige="EDICAO" title="Cancelar" danger onClick={() => mudarStatus(c, 'CANCELADO')}>
                          <XCircle className="h-4 w-4" />
                        </IconBtn>
                      )}
                      <IconBtn exige="EDICAO" title="Gerar providência" onClick={() => gerarProvidencia(c)}>
                        <ClipboardList className="h-4 w-4" />
                      </IconBtn>
                      <IconBtn exige="EDICAO" title="Editar" onClick={() => setModal({ tipo: 'editar', c })}>
                        <Pencil className="h-4 w-4" />
                      </IconBtn>
                      <IconBtn exige="TOTAL" title="Excluir" danger onClick={() => setModal({ tipo: 'excluir', c })}>
                        <Trash2 className="h-4 w-4" />
                      </IconBtn>
                    </AcoesGrade>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <p className="mt-4 text-xs text-ink-400">
        Compromisso <strong>acontece</strong>; tarefa <strong>vence</strong>. O que ficar pendente de
        uma reunião vira providência em Fiscalização, ligada a este compromisso.
      </p>

      <Modal
        open={modal.tipo === 'novo' || modal.tipo === 'editar'}
        onClose={fechar}
        title={modal.tipo === 'editar' ? 'Editar Compromisso' : 'Novo Compromisso'}
        size="2xl"
      >
        {(modal.tipo === 'novo' || modal.tipo === 'editar') && (
          <CompromissoForm
            compromisso={modal.tipo === 'editar' ? modal.c : null}
            diaInicial={modal.tipo === 'novo' ? modal.dia : null}
            onSuccess={aoSalvar}
            onCancel={fechar}
          />
        )}
      </Modal>

      <Modal
        open={modal.tipo === 'excluir'}
        onClose={fechar}
        title="Excluir compromisso"
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={fechar} disabled={processando}>
              Cancelar
            </Button>
            <Button variant="danger" onClick={confirmarExclusao} disabled={processando}>
              {processando && <Loader2 className="h-4 w-4 animate-spin" />}
              Excluir
            </Button>
          </>
        }
      >
        {modal.tipo === 'excluir' && (
          <div className="space-y-3">
            <p className="text-sm text-ink-600 dark:text-ink-300">
              Excluir <span className="font-semibold text-ink-900 dark:text-ink-50">{modal.c.titulo}</span>?
            </p>
            <p className="text-xs text-ink-400">
              Compromisso que originou providências não pode ser excluído — as tarefas ficariam sem
              origem. Nesse caso, use a situação <strong>Cancelado</strong>.
            </p>
            {erro && <p className="text-sm font-medium text-red-500">{erro}</p>}
          </div>
        )}
      </Modal>
    </>
  );
}
