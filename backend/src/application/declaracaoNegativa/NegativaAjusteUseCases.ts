import {
  TIPOS_AJUSTE,
  periodosDoAno,
  situacaoDoPeriodo,
  type AjusteAssinado,
  type LinhaTipo,
  type Periodicidade,
  type PeriodoNegativa,
  type TipoAjuste,
} from '@/core/declaracaoNegativa/negativaAjustes';
import {
  negativasDoExercicio,
  type AjusteParaNegativa,
  type LinhaNegativaPrestacao,
} from '@/core/declaracaoNegativa/negativaPrestacao';
import { BusinessError, NotFoundError } from '@/shared/errors';
import { parseDataISO } from '@/shared/datas';

export interface NegativaGravada {
  id: string;
  periodo: number;
  tipoAjuste: TipoAjuste;
  declaradaEm: string;
}

export interface INegativaAjusteRepository {
  periodicidade(clienteId: string): Promise<Periodicidade | null>;
  ajustesAssinados(clienteId: string, de: string, ate: string): Promise<AjusteAssinado[]>;
  declaradas(clienteId: string, ano: number): Promise<NegativaGravada[]>;
  /** Grava ou atualiza a data de cada tipo; idempotente pelo `@@unique`. */
  marcar(clienteId: string, ano: number, periodo: number, tipos: TipoAjuste[], declaradaEm: Date): Promise<void>;
  /** Falso quando o id não é do órgão (ou não existe). */
  desmarcar(clienteId: string, id: string): Promise<boolean>;
  /** Ajustes do órgão com o que a negativa da prestação precisa saber do exercício. */
  ajustesParaNegativa(clienteId: string, ano: number): Promise<AjusteParaNegativa[]>;
}

export interface PeriodoComSituacao extends PeriodoNegativa {
  linhas: (LinhaTipo & { negativaId: string | null })[];
}

export interface PainelNegativaAjustes {
  ano: number;
  periodicidade: Periodicidade;
  periodos: PeriodoComSituacao[];
}

/** A Fase V começou a valer para ajustes de junho de 2023; o sistema, em 2024. */
const PRIMEIRO_ANO = 2024;

const hojeISO = () => new Date().toISOString().slice(0, 10);

/**
 * Declaração Negativa do módulo Ajustes — a lista por período do que declarar
 * na tela do Audesp, e o registro de que foi declarado.
 *
 * Exige órgão selecionado: a periodicidade e os ajustes são dele, e sem órgão
 * a consulta atravessaria todos os clientes.
 */
export class NegativaAjusteUseCases {
  constructor(
    private readonly repo: INegativaAjusteRepository,
    private readonly hoje: () => string = hojeISO,
  ) {}

  async painel(clienteId: string | null, ano: number): Promise<PainelNegativaAjustes> {
    const orgao = exigirOrgao(clienteId);
    const exercicio = validarAno(ano);
    const periodicidade = await this.repo.periodicidade(orgao);
    if (!periodicidade)
      throw new BusinessError(
        'O órgão está sem periodicidade da Declaração Negativa. Informe-a no cadastro do órgão (Quadrimestral ou Anual).',
      );

    const [ajustes, declaradas] = await Promise.all([
      this.repo.ajustesAssinados(orgao, `${exercicio}-01-01`, `${exercicio}-12-31`),
      this.repo.declaradas(orgao, exercicio),
    ]);

    const hoje = this.hoje();
    const periodos = periodosDoAno(periodicidade, exercicio).map((p) => {
      const doPeriodo = declaradas.filter((d) => d.periodo === p.periodo);
      const linhas = situacaoDoPeriodo(p, ajustes, doPeriodo, hoje).map((l) => ({
        ...l,
        negativaId: doPeriodo.find((d) => d.tipoAjuste === l.tipoAjuste)?.id ?? null,
      }));
      return { ...p, linhas };
    });

    return { ano: exercicio, periodicidade, periodos };
  }

  async marcar(
    clienteId: string | null,
    dados: { ano?: unknown; periodo?: unknown; tipos?: unknown; declaradaEm?: unknown },
  ): Promise<void> {
    const orgao = exigirOrgao(clienteId);
    const ano = validarAno(Number(dados.ano));
    const periodicidade = await this.repo.periodicidade(orgao);
    if (!periodicidade) throw new BusinessError('O órgão está sem periodicidade da Declaração Negativa.');

    const periodo = Number(dados.periodo);
    const p = periodosDoAno(periodicidade, ano).find((x) => x.periodo === periodo);
    if (!p) throw new BusinessError('Período inválido para a periodicidade do órgão.');

    const tipos = Array.isArray(dados.tipos) ? [...new Set(dados.tipos as string[])] : [];
    if (!tipos.length) throw new BusinessError('Escolha ao menos um tipo de ajuste.');
    const invalido = tipos.find((t) => !(TIPOS_AJUSTE as readonly string[]).includes(t));
    if (invalido) throw new BusinessError(`Tipo de ajuste inválido: ${invalido}.`);

    const data = parseDataISO(String(dados.declaradaEm ?? ''));
    const dataISO = data.toISOString().slice(0, 10);
    if (dataISO > this.hoje()) throw new BusinessError('A data do envio não pode ser futura.');
    if (dataISO < p.inicio) throw new BusinessError('A data do envio não pode ser anterior ao início do período.');

    // Tipo com ajuste assinado no período não tem negativa: o Audesp nem deixa
    // escolhê-lo. Marcar aqui seria registrar algo que lá é impossível.
    const assinados = new Set(
      (await this.repo.ajustesAssinados(orgao, p.inicio, p.fim)).map((a) => a.tipoAjuste),
    );
    const comAjuste = tipos.filter((t) => assinados.has(t as TipoAjuste));
    if (comAjuste.length)
      throw new BusinessError(
        'Há ajuste assinado no período para um dos tipos escolhidos — nesse caso não cabe declaração negativa.',
      );

    await this.repo.marcar(orgao, ano, periodo, tipos as TipoAjuste[], data);
  }

  /** Negativa da prestação: por ajuste, o que cabe no exercício. */
  async painelPrestacao(clienteId: string | null, ano: number): Promise<{ ano: number; linhas: LinhaNegativaPrestacao[] }> {
    const orgao = exigirOrgao(clienteId);
    const exercicio = validarAno(ano);
    return { ano: exercicio, linhas: negativasDoExercicio(await this.repo.ajustesParaNegativa(orgao, exercicio), exercicio) };
  }

  async desmarcar(clienteId: string | null, id: string): Promise<void> {
    const orgao = exigirOrgao(clienteId);
    if (!(await this.repo.desmarcar(orgao, id))) throw new NotFoundError('Registro não encontrado.');
  }
}

function exigirOrgao(clienteId: string | null): string {
  if (!clienteId) throw new BusinessError('Selecione um órgão para ver a Declaração Negativa.');
  return clienteId;
}

function validarAno(ano: number): number {
  const atual = new Date().getUTCFullYear();
  if (!Number.isInteger(ano) || ano < PRIMEIRO_ANO || ano > atual)
    throw new BusinessError(`Exercício inválido — use de ${PRIMEIRO_ANO} a ${atual}.`);
  return ano;
}
