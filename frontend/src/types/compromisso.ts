export type TipoCompromisso =
  | 'REUNIAO_MONITORAMENTO'
  | 'VISITA_IN_LOCO'
  | 'COMISSAO_AVALIACAO'
  | 'AUDIENCIA_PUBLICA'
  | 'TCESP'
  | 'OUTRO';

export type StatusCompromisso = 'AGENDADO' | 'REALIZADO' | 'CANCELADO';
export type VisibilidadeCompromisso = 'PARTICULAR' | 'RESTRITO' | 'ORGAO';
export type Recorrencia = 'NAO_REPETE' | 'DIARIA' | 'SEMANAL' | 'MENSAL' | 'ANUAL';

export interface AlertaCompromisso {
  id?: string;
  /** Antecedência em minutos. O aviso aparece no sino. */
  minutosAntes: number;
}

export interface Compromisso {
  id: string;
  tipo: TipoCompromisso;
  titulo: string;
  pauta: string | null;
  inicioEm: string;
  fimEm: string;
  diaInteiro: boolean;
  local: string | null;
  cor: string | null;
  visibilidade: VisibilidadeCompromisso;
  recorrencia: Recorrencia;
  recorrenciaIntervalo: number | null;
  recorrenciaAte: string | null;
  status: StatusCompromisso;
  registro: string | null;
  ajusteId: string | null;
  ajusteCodigo: string | null;
  entidadeNome: string | null;
  responsavelId: string | null;
  responsavelNome: string | null;
  participantes: { id: string; nome: string }[];
  grupos: { id: string; nome: string }[];
  alertas: AlertaCompromisso[];
  tarefas: number;
  criadoPor: string | null;
  criadoEm: string;
  atualizadoEm: string;
  /** Repetição expandida da série — editar ali mexe na série inteira. */
  ocorrencia?: boolean;
}

export interface CompromissoPayload {
  tipo: TipoCompromisso;
  titulo: string;
  pauta: string | null;
  inicioEm: string;
  fimEm: string | null;
  diaInteiro: boolean;
  local: string | null;
  cor: string | null;
  visibilidade: VisibilidadeCompromisso;
  recorrencia: Recorrencia;
  recorrenciaIntervalo: number | null;
  recorrenciaAte: string | null;
  ajusteId: string | null;
  responsavelId: string | null;
  status: StatusCompromisso;
  registro: string | null;
  participantes: string[];
  grupos: string[];
  alertas: { minutosAntes: number }[];
}

export interface ResumoAgenda {
  proximos: number;
  hoje: number;
  pendentesDeRegistro: number;
  realizados: number;
}

export const TIPO_LABEL: Record<TipoCompromisso, string> = {
  REUNIAO_MONITORAMENTO: 'Reunião de monitoramento',
  VISITA_IN_LOCO: 'Visita in loco',
  COMISSAO_AVALIACAO: 'Comissão de Monitoramento e Avaliação',
  AUDIENCIA_PUBLICA: 'Audiência pública',
  TCESP: 'TCESP',
  OUTRO: 'Outro',
};

export const STATUS_LABEL: Record<StatusCompromisso, string> = {
  AGENDADO: 'Agendado',
  REALIZADO: 'Realizado',
  CANCELADO: 'Cancelado',
};

export const STATUS_TONE: Record<StatusCompromisso, 'brand' | 'success' | 'neutral'> = {
  AGENDADO: 'brand',
  REALIZADO: 'success',
  CANCELADO: 'neutral',
};

export const VISIBILIDADE_LABEL: Record<VisibilidadeCompromisso, string> = {
  PARTICULAR: 'Particular',
  RESTRITO: 'Participantes e grupos',
  ORGAO: 'Todo o órgão',
};

export const RECORRENCIA_LABEL: Record<Recorrencia, string> = {
  NAO_REPETE: 'Não se repete',
  DIARIA: 'Todos os dias',
  SEMANAL: 'Toda semana',
  MENSAL: 'Todo mês',
  ANUAL: 'Todo ano',
};

/** Antecedências oferecidas; qualquer inteiro é aceito pelo backend. */
export const ANTECEDENCIAS: { minutos: number; label: string }[] = [
  { minutos: 5, label: '5 minutos antes' },
  { minutos: 10, label: '10 minutos antes' },
  { minutos: 15, label: '15 minutos antes' },
  { minutos: 30, label: '30 minutos antes' },
  { minutos: 60, label: '1 hora antes' },
  { minutos: 24 * 60, label: '1 dia antes' },
];

/**
 * Paleta fechada, espelhando `CORES` do backend.
 *
 * Cor é token, não hex: a tela decide como pintar e o tema escuro continua
 * legível — o que um `#ffcc00` escolhido a dedo não garante.
 */
export const CORES: { id: string; label: string; classe: string }[] = [
  { id: 'brand', label: 'Azul', classe: 'bg-brand-500' },
  { id: 'emerald', label: 'Verde', classe: 'bg-emerald-500' },
  { id: 'violet', label: 'Roxo', classe: 'bg-violet-500' },
  { id: 'amber', label: 'Âmbar', classe: 'bg-amber-500' },
  { id: 'red', label: 'Vermelho', classe: 'bg-red-500' },
  { id: 'sky', label: 'Ciano', classe: 'bg-sky-500' },
  { id: 'rose', label: 'Rosa', classe: 'bg-rose-500' },
  { id: 'ink', label: 'Cinza', classe: 'bg-ink-400' },
];

/** Cor por tipo, usada quando o usuário não escolheu nenhuma. */
const COR_PADRAO_DO_TIPO: Record<TipoCompromisso, string> = {
  REUNIAO_MONITORAMENTO: 'brand',
  VISITA_IN_LOCO: 'emerald',
  COMISSAO_AVALIACAO: 'violet',
  AUDIENCIA_PUBLICA: 'amber',
  TCESP: 'red',
  OUTRO: 'ink',
};

export function classeDaCor(c: Pick<Compromisso, 'cor' | 'tipo'>): string {
  const id = c.cor ?? COR_PADRAO_DO_TIPO[c.tipo];
  return CORES.find((x) => x.id === id)?.classe ?? 'bg-ink-400';
}

/**
 * Compromisso passado que ninguém fechou — espelha a regra do backend.
 *
 * Não é "atrasado": o evento já aconteceu ou não. Mas continuar AGENDADO
 * depois da hora significa que ninguém registrou o que houve.
 */
export function pendenteDeRegistro(
  c: Pick<Compromisso, 'status' | 'inicioEm'>,
  agora = new Date(),
): boolean {
  return c.status === 'AGENDADO' && new Date(c.inicioEm).getTime() < agora.getTime();
}

/**
 * O que pode ser remarcado arrastando — espelha `podeArrastar` do backend,
 * que é quem de fato recusa.
 *
 * A tela precisa da resposta **antes** do gesto: um bloco que se deixa arrastar
 * e depois recusa a gravação é pior que um bloco que não se move.
 *
 * - **Série recorrente** não: a grade mostra repetições expandidas, que não
 *   existem como linha — mover uma delas mudaria a série inteira.
 * - **Realizado** não: já aconteceu, e o registro descreve aquele horário.
 * - **Cancelado** não: não vai ocorrer; remarcá-lo seria agendar outro.
 */
export function podeArrastar(c: Pick<Compromisso, 'status' | 'recorrencia'>): boolean {
  return c.status === 'AGENDADO' && c.recorrencia === 'NAO_REPETE';
}

/**
 * Quem pode **excluir** — espelha `podeExcluir` do backend, que é quem decide.
 *
 * Mais estrito que alterar: alterar é operar o compromisso, excluir é apagá-lo,
 * e o registro é de quem o criou. O criador apaga o que é seu com **qualquer**
 * faixa de permissão — exigir acesso Total para desmarcar a própria reunião
 * transformaria um cadastro pessoal em pedido ao administrador.
 *
 * Alcançar o compromisso dos outros continua exigindo faixa Total, e nem essa
 * alcança um **particular** alheio.
 */
export function podeExcluir(
  c: Pick<Compromisso, 'criadoPor' | 'visibilidade'>,
  usuarioId: string | undefined,
  administraAgenda = false,
): boolean {
  if (c.criadoPor && c.criadoPor === usuarioId) return true;
  if (c.visibilidade === 'PARTICULAR') return false;
  return administraAgenda;
}

/** Passo do arrasto, em minutos: 15 é o menor intervalo que se agenda. */
export const PASSO_ARRASTO = 15;

/** Duração mínima ao redimensionar — abaixo disso o bloco some da grade. */
export const DURACAO_MINIMA = 15;

/**
 * Aplica um deslocamento de dias e minutos, devolvendo o novo par de instantes.
 *
 * Mover preserva a duração; redimensionar mexe só no fim. Fica aqui, e não na
 * grade, porque é a única aritmética do arrasto que dá para errar em silêncio —
 * e porque a vista de mês precisa exatamente da mesma conta.
 */
export function deslocar(
  c: Pick<Compromisso, 'inicioEm' | 'fimEm'>,
  { dias = 0, minutos = 0, so = 'ambos' as 'ambos' | 'fim' },
): { inicioEm: Date; fimEm: Date } {
  const inicio = new Date(c.inicioEm);
  const fim = new Date(c.fimEm);
  if (so === 'fim') {
    fim.setMinutes(fim.getMinutes() + minutos);
    const minimo = new Date(inicio.getTime() + DURACAO_MINIMA * 60_000);
    return { inicioEm: inicio, fimEm: fim < minimo ? minimo : fim };
  }
  const duracao = fim.getTime() - inicio.getTime();
  inicio.setDate(inicio.getDate() + dias);
  inicio.setMinutes(inicio.getMinutes() + minutos);
  return { inicioEm: inicio, fimEm: new Date(inicio.getTime() + duracao) };
}

/** 'YYYY-MM-DDTHH:mm' — o formato do input datetime-local. */
export function paraInputDateTime(iso: string): string {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

export function horaBr(iso: string): string {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

/** Rótulo do lembrete, para exibir a lista de alertas escolhidos. */
export function rotuloAntecedencia(minutos: number): string {
  const conhecido = ANTECEDENCIAS.find((a) => a.minutos === minutos);
  if (conhecido) return conhecido.label;
  if (minutos % 1440 === 0) return `${minutos / 1440} dia(s) antes`;
  if (minutos % 60 === 0) return `${minutos / 60} hora(s) antes`;
  return `${minutos} minutos antes`;
}
