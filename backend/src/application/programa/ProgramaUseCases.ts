import type { Meta, Programa } from '@/core/programa/Programa';
import type { IProgramaRepository } from './IProgramaRepository';
import type { IAjusteRepository } from '@/application/ajuste/IAjusteRepository';
import type { DadosMeta, DadosMetaPeriodo, MetaDTO, ProgramaDTO } from './dtos';
import {
  PERIODICIDADES_META_IDS,
  QUALIFICADORES_META_IDS,
  TIPOS_META_IDS,
  ehQuantificavel,
  temDetalhePeriodico,
  type PeriodicidadeMeta,
  type QualificadorMeta,
  type TipoMeta,
} from '@/core/meta/Meta';
import { gerarPeriodos } from '@/core/meta/periodos';
import { parseDataISO } from '@/shared/datas';
import { BusinessError, ConflictError, NotFoundError } from '@/shared/errors';

/**
 * Lê um número que pode vir como texto do formulário.
 *
 * A vírgula decide: **com vírgula**, o texto está em padrão brasileiro e os
 * pontos são separador de milhar ("1.234,50"); **sem vírgula**, o ponto é o
 * decimal ("1234.50"), que é o que a tela envia depois da máscara. Sem essa
 * distinção "1.234,50" virava `NaN` e a mensagem culpava o usuário por não ter
 * informado a quantidade que ele acabara de digitar.
 */
const numero = (bruto: unknown): number | null => {
  if (bruto === undefined || bruto === null || bruto === '') return null;
  if (typeof bruto !== 'string') {
    const n = Number(bruto);
    return Number.isFinite(n) ? n : null;
  }
  const limpo = bruto.includes(',')
    ? bruto.replace(/\./g, '').replace(',', '.')
    : bruto;
  const n = Number(limpo.trim());
  return Number.isFinite(n) ? n : null;
};

const data = (bruto: string | null | undefined, campo: string): Date | null => {
  const v = bruto?.trim();
  if (!v) return null;
  try {
    return parseDataISO(v);
  } catch {
    throw new BusinessError(`${campo} inválida.`);
  }
};

/**
 * Valida e normaliza uma meta.
 *
 * O que o tipo decide, e por que é aqui e não na tela: a qualitativa não
 * quantificável **não tem** unidade de medida nem detalhamento por período — na
 * tela do TCESP essas opções desaparecem ao escolher o tipo. Guardar unidade ou
 * quantidade nela criaria dado que nenhuma tela lê, e que voltaria a aparecer no
 * dia em que alguém trocasse o tipo de volta.
 *
 * Exportada porque `npm run verificar:metas` a exercita sem banco — é a regra
 * cuja falha é silenciosa: quantidade num período que a vigência não tem passa
 * por todas as telas e só é desmentida pelo cadastro do Tribunal.
 */
export function validarMeta(input: MetaDTO): DadosMeta {
  const codigoMeta = input.codigoMeta?.trim() ?? '';
  if (!codigoMeta) throw new BusinessError('Informe o código da meta.');

  // O enunciado é o que aparece na aferição e no cadastro do Tribunal; sem ele
  // a lista mostra códigos, e código não diz a ninguém o que foi pactuado.
  const nome = input.nome?.trim() ?? '';
  if (!nome) throw new BusinessError('Informe a meta.');

  const tipo = (input.tipo ?? 'QUANTITATIVA') as TipoMeta;
  if (!TIPOS_META_IDS.includes(tipo)) throw new BusinessError('Tipo de meta inválido.');

  const quantificavel = ehQuantificavel(tipo);

  /*
   * A periodicidade é **forçada** a `UNICA` na não quantificável, em vez de
   * recusada. O usuário pode trocar o tipo de uma meta já cadastrada, e o
   * formulário deixa de mostrar o campo: barrar o que a tela nem exibe seria
   * um erro sem conserto possível pela interface.
   */
  const periodicidade: PeriodicidadeMeta = quantificavel
    ? ((input.periodicidade ?? 'MENSAL') as PeriodicidadeMeta)
    : 'UNICA';
  if (!PERIODICIDADES_META_IDS.includes(periodicidade))
    throw new BusinessError('Periodicidade da meta inválida.');
  if (quantificavel && periodicidade === 'UNICA')
    throw new BusinessError('Escolha a periodicidade de aferição da meta.');

  const unidade = input.unidadeMedida?.trim() || null;
  // Sem unidade, "5000" não diz se são consultas, horas ou toneladas — e é
  // justamente essa leitura que a Comissão de Fiscalização precisa fazer.
  if (quantificavel && !unidade)
    throw new BusinessError(
      'Informe a unidade de medida da meta (consultas, atendimentos, horas...).',
    );

  const vigenciaInicio = data(input.vigenciaInicio, 'Vigência inicial da meta');
  const vigenciaFim = data(input.vigenciaFim, 'Vigência final da meta');

  if (quantificavel && (!vigenciaInicio || !vigenciaFim))
    throw new BusinessError('Informe a vigência da meta — é ela que define os períodos.');
  if (vigenciaInicio && vigenciaFim && vigenciaFim < vigenciaInicio)
    throw new BusinessError('A vigência final da meta não pode ser anterior à inicial.');

  const periodicidades = validarPeriodos(input, {
    tipo,
    periodicidade,
    vigenciaInicio,
    vigenciaFim,
  });

  return {
    codigoMeta,
    nome,
    descricao: input.descricao?.trim() || null,
    tipo,
    unidadeMedida: quantificavel ? unidade : null,
    periodicidade,
    vigenciaInicio,
    vigenciaFim,
    periodicidades,
  };
}

/**
 * O quadro de quantidades, conferido contra os períodos que a vigência gera.
 *
 * **É a regra central do módulo.** Os períodos não são digitados: saem de
 * `gerarPeriodos`, e o que chega da tela precisa bater com eles exatamente —
 * nem sobrando (período que a meta não tem) nem faltando (período sem
 * quantidade pactuada). Aceitar um período a mais gravaria uma previsão que o
 * cadastro do Tribunal não conhece, e a aferição correspondente seria rejeitada.
 */
function validarPeriodos(
  input: MetaDTO,
  meta: {
    tipo: TipoMeta;
    periodicidade: PeriodicidadeMeta;
    vigenciaInicio: Date | null;
    vigenciaFim: Date | null;
  },
): DadosMetaPeriodo[] {
  const enviados = input.periodicidades ?? [];

  if (!temDetalhePeriodico(meta.tipo)) {
    if (enviados.length)
      throw new BusinessError(
        'Meta qualitativa não quantificável não tem quantidades por período.',
      );
    return [];
  }

  const esperados = gerarPeriodos(meta.periodicidade, meta.vigenciaInicio, meta.vigenciaFim);
  const chave = (ano: number, periodo: number) => `${ano}/${periodo}`;
  const permitidos = new Set(esperados.map((p) => chave(p.ano, p.periodo)));

  const vistos = new Set<string>();
  const out: DadosMetaPeriodo[] = [];

  for (const linha of enviados) {
    const ano = numero(linha.ano);
    const periodo = numero(linha.periodo);
    if (ano === null || periodo === null)
      throw new BusinessError('Período da meta inválido.');

    const k = chave(ano, periodo);
    if (!permitidos.has(k))
      throw new BusinessError(
        `O período ${periodo}/${ano} está fora da vigência da meta.`,
      );
    if (vistos.has(k))
      throw new BusinessError(`O período ${periodo}/${ano} foi informado duas vezes.`);
    vistos.add(k);

    const quantidade = numero(linha.quantidade);
    if (quantidade === null || quantidade <= 0)
      throw new BusinessError(
        `Informe a quantidade prevista do período ${periodo}/${ano}, maior que zero.`,
      );

    const qualificador = (linha.qualificador ?? 'IGUAL_A') as QualificadorMeta;
    if (!QUALIFICADORES_META_IDS.includes(qualificador))
      throw new BusinessError('Qualificador da meta inválido.');

    out.push({ ano, periodo, qualificador, quantidade });
  }

  /*
   * Faltar período é erro, e não omissão tolerada.
   *
   * Meta com metade dos períodos preenchidos é meta pela metade: a aferição do
   * período em branco não teria contra o que ser comparada, e o painel de
   * pendências não tem como saber se aquilo foi esquecimento ou intenção.
   */
  const faltando = esperados.filter((p) => !vistos.has(chave(p.ano, p.periodo)));
  if (faltando.length) {
    const lista = faltando.slice(0, 3).map((p) => `${p.periodo}/${p.ano}`).join(', ');
    throw new BusinessError(
      `Informe a quantidade prevista de todos os períodos. Faltam: ${lista}${
        faltando.length > 3 ? '…' : ''
      }`,
    );
  }

  return out.sort((a, b) => a.ano - b.ano || a.periodo - b.periodo);
}

export class ProgramaUseCases {
  constructor(
    private readonly repo: IProgramaRepository,
    private readonly ajustes: IAjusteRepository,
  ) {}

  private async garantirAjuste(ajusteId: string) {
    if (!(await this.ajustes.buscarPorId(ajusteId)))
      throw new NotFoundError('Ajuste não encontrado.');
  }

  private async garantirPrograma(ajusteId: string, programaId: string) {
    if (!(await this.repo.programaDoAjuste(ajusteId, programaId)))
      throw new NotFoundError('Programa não encontrado.');
  }

  private async garantirMeta(programaId: string, metaId: string) {
    if (!(await this.repo.metaDoPrograma(programaId, metaId)))
      throw new NotFoundError('Meta não encontrada.');
  }

  async listar(ajusteId: string): Promise<Programa[]> {
    await this.garantirAjuste(ajusteId);
    return this.repo.listarPorAjuste(ajusteId);
  }

  async criarPrograma(ajusteId: string, input: ProgramaDTO): Promise<Programa> {
    await this.garantirAjuste(ajusteId);
    const nome = input.nome?.trim() ?? '';
    if (!nome) throw new BusinessError('Informe o nome do programa.');
    if (await this.repo.nomeExiste(ajusteId, nome))
      throw new ConflictError('Já existe um programa com este nome.', 'PROGRAMA_DUPLICADO');
    return this.repo.criarPrograma(ajusteId, nome);
  }

  async atualizarPrograma(ajusteId: string, programaId: string, input: ProgramaDTO): Promise<Programa> {
    await this.garantirPrograma(ajusteId, programaId);
    const nome = input.nome?.trim() ?? '';
    if (!nome) throw new BusinessError('Informe o nome do programa.');
    if (await this.repo.nomeExiste(ajusteId, nome, programaId))
      throw new ConflictError('Já existe um programa com este nome.', 'PROGRAMA_DUPLICADO');
    return this.repo.atualizarPrograma(programaId, nome);
  }

  async excluirPrograma(ajusteId: string, programaId: string): Promise<void> {
    await this.garantirPrograma(ajusteId, programaId);
    await this.repo.excluirPrograma(programaId);
  }

  async criarMeta(ajusteId: string, programaId: string, input: MetaDTO): Promise<Meta> {
    await this.garantirPrograma(ajusteId, programaId);
    const dados = validarMeta(input);
    if (await this.repo.codigoExiste(programaId, dados.codigoMeta))
      throw new ConflictError('Já existe uma meta com este código no programa.', 'META_DUPLICADA');
    return this.repo.criarMeta(programaId, dados);
  }

  async atualizarMeta(ajusteId: string, programaId: string, metaId: string, input: MetaDTO): Promise<Meta> {
    await this.garantirPrograma(ajusteId, programaId);
    await this.garantirMeta(programaId, metaId);
    const dados = validarMeta(input);
    if (await this.repo.codigoExiste(programaId, dados.codigoMeta, metaId))
      throw new ConflictError('Já existe uma meta com este código no programa.', 'META_DUPLICADA');
    return this.repo.atualizarMeta(metaId, dados);
  }

  async excluirMeta(ajusteId: string, programaId: string, metaId: string): Promise<void> {
    await this.garantirPrograma(ajusteId, programaId);
    await this.garantirMeta(programaId, metaId);
    await this.repo.excluirMeta(metaId);
  }
}
