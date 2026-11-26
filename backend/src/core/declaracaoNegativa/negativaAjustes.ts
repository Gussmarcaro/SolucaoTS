import { somarDiasUteis } from '@/shared/diasUteis';

/**
 * Declaração Negativa **do módulo Ajustes** (Manual "Declaração Negativa" do
 * TCESP).
 *
 * Diz ao Tribunal, por **tipo de ajuste** e por **período**, que o órgão não
 * assinou nenhum ajuste daquele tipo. O período depende da periodicidade do
 * órgão (lista `Fase_V_entidades`):
 *
 * - **Quadrimestral** (prefeituras, autarquias e fundações típicas; UGEs do
 *   Estado): jan–abr, mai–ago, set–dez, com prazo de 5 dias úteis após cada um;
 * - **Anual** (os demais, como câmaras): o exercício, com 15 dias úteis.
 *
 * Se o órgão assinou só Termo de Colaboração no período, declara os outros
 * quatro tipos. Se assinou dos cinco, não declara nada.
 *
 * **Não tem API.** Esta negativa se faz na tela do Audesp (Ajustes → Declaração
 * → Incluir Declaração Negativa). O sistema monta a lista do que declarar e
 * guarda que foi feito, que é o que permite ao sino parar de cobrar. É outra
 * coisa que a negativa **da prestação de contas**, por ajuste e exercício, que
 * vai por JSON (`/f5/declaracao-negativa`).
 */

export const TIPOS_AJUSTE = [
  'CONTRATO_GESTAO',
  'CONVENIO',
  'TERMO_COLABORACAO',
  'TERMO_FOMENTO',
  'TERMO_PARCERIA',
] as const;
export type TipoAjuste = (typeof TIPOS_AJUSTE)[number];

export type Periodicidade = 'QUADRIMESTRAL' | 'ANUAL';

/** Dias úteis para enviar depois que o período fecha. */
export const DIAS_UTEIS_NEGATIVA: Record<Periodicidade, number> = { QUADRIMESTRAL: 5, ANUAL: 15 };

export interface PeriodoNegativa {
  ano: number;
  /** 1, 2 ou 3 no quadrimestral; 0 no anual — o exercício inteiro. */
  periodo: number;
  rotulo: string;
  /** `aaaa-mm-dd`, inclusivos. */
  inicio: string;
  fim: string;
  /** Último dia para enviar. */
  prazo: string;
}

const iso = (d: Date) => d.toISOString().slice(0, 10);

export function periodosDoAno(periodicidade: Periodicidade, ano: number): PeriodoNegativa[] {
  const montar = (periodo: number, rotulo: string, mesIni: number, mesFim: number): PeriodoNegativa => {
    const fim = new Date(Date.UTC(ano, mesFim + 1, 0));
    return {
      ano,
      periodo,
      rotulo,
      inicio: iso(new Date(Date.UTC(ano, mesIni, 1))),
      fim: iso(fim),
      prazo: iso(somarDiasUteis(fim, DIAS_UTEIS_NEGATIVA[periodicidade])),
    };
  };
  if (periodicidade === 'ANUAL') return [montar(0, `Exercício ${ano}`, 0, 11)];
  return [
    montar(1, `1º quadrimestre de ${ano} (jan–abr)`, 0, 3),
    montar(2, `2º quadrimestre de ${ano} (mai–ago)`, 4, 7),
    montar(3, `3º quadrimestre de ${ano} (set–dez)`, 8, 11),
  ];
}

/** O período encerrado mais recente até `hoje` (`aaaa-mm-dd`). */
export function ultimoPeriodoEncerrado(periodicidade: Periodicidade, hoje: string): PeriodoNegativa {
  const ano = Number(hoje.slice(0, 4));
  const candidatos = [...periodosDoAno(periodicidade, ano - 1), ...periodosDoAno(periodicidade, ano)];
  return candidatos.filter((p) => p.fim < hoje).pop()!;
}

export interface AjusteAssinado {
  tipoAjuste: TipoAjuste;
  codigoAjuste: string;
  dataAssinatura: string;
  /** Já cadastrado no Audesp. Se não, a negativa do tipo fica bloqueada lá só depois do cadastro. */
  enviado: boolean;
}

export interface NegativaDeclarada {
  tipoAjuste: TipoAjuste;
  declaradaEm: string;
}

export type EstadoTipo = 'ASSINADO' | 'DECLARADA' | 'PENDENTE' | 'EM_ANDAMENTO';

export interface LinhaTipo {
  tipoAjuste: TipoAjuste;
  estado: EstadoTipo;
  /** Ajustes desse tipo assinados no período. */
  ajustes: { codigoAjuste: string; dataAssinatura: string; enviado: boolean }[];
  declaradaEm: string | null;
}

/**
 * Situação dos cinco tipos num período.
 *
 * - `ASSINADO`: houve ajuste do tipo no período, não há o que declarar.
 * - `DECLARADA`: alguém marcou que enviou a negativa no Audesp.
 * - `PENDENTE`: o período fechou e falta declarar.
 * - `EM_ANDAMENTO`: o período ainda não fechou. Ainda pode haver assinatura,
 *   e a negativa não é devida — mas já se pode marcar, se o órgão preferir.
 *
 * Um ajuste assinado **depois** de marcada a negativa prevalece: o próprio
 * Audesp "assume que houve entrega sem necessidade de alteração" (manual).
 */
export function situacaoDoPeriodo(
  periodo: PeriodoNegativa,
  ajustes: AjusteAssinado[],
  declaradas: NegativaDeclarada[],
  hoje: string,
): LinhaTipo[] {
  const fechado = periodo.fim < hoje;
  return TIPOS_AJUSTE.map((tipo) => {
    const doTipo = ajustes
      .filter((a) => a.tipoAjuste === tipo && a.dataAssinatura >= periodo.inicio && a.dataAssinatura <= periodo.fim)
      .sort((a, b) => a.dataAssinatura.localeCompare(b.dataAssinatura))
      .map(({ codigoAjuste, dataAssinatura, enviado }) => ({ codigoAjuste, dataAssinatura, enviado }));
    const declarada = declaradas.find((d) => d.tipoAjuste === tipo)?.declaradaEm ?? null;
    const estado: EstadoTipo = doTipo.length
      ? 'ASSINADO'
      : declarada
        ? 'DECLARADA'
        : fechado
          ? 'PENDENTE'
          : 'EM_ANDAMENTO';
    return { tipoAjuste: tipo, estado, ajustes: doTipo, declaradaEm: declarada };
  });
}

/** Os tipos que ainda faltam declarar num período fechado. */
export function tiposPendentes(linhas: LinhaTipo[]): TipoAjuste[] {
  return linhas.filter((l) => l.estado === 'PENDENTE').map((l) => l.tipoAjuste);
}

export const ROTULO_TIPO: Record<TipoAjuste, string> = {
  CONTRATO_GESTAO: 'Contrato de Gestão',
  CONVENIO: 'Convênio',
  TERMO_COLABORACAO: 'Termo de Colaboração',
  TERMO_FOMENTO: 'Termo de Fomento',
  TERMO_PARCERIA: 'Termo de Parceria',
};
