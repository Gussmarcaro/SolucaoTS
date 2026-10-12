import {
  METODOS_IDS,
  calcularRateio,
  temQuadro,
  type MetodoRateio,
  type Rateio,
} from '@/core/rateio/Rateio';
import { BusinessError, NotFoundError } from '@/shared/errors';
import { parseDataISO } from '@/shared/datas';
import type { IRateioRepository, ListarRateiosParams, PaginaRateios } from './IRateioRepository';
import type { DadosRateio, FiltrosRateio, RateioDTO } from './dtos';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function num(v: unknown): number | null {
  if (v === undefined || v === null || v === '') return null;
  const n = typeof v === 'string' ? Number(String(v).replace(',', '.')) : (v as number);
  return Number.isFinite(n) ? n : null;
}

/**
 * Normaliza e valida um rateio.
 *
 * As mesmas regras existem na tela, e é de propósito: a tela avisa antes de
 * enviar, e aqui é o que impede dado inconsistente de entrar por qualquer outro
 * caminho — importação, script, chamada direta à API.
 */
export function validarRateio(input: RateioDTO): DadosRateio {
  const titulo = input.titulo?.trim() ?? '';
  if (titulo.length < 3) throw new BusinessError('Informe o título do rateio.');
  if (titulo.length > 200) throw new BusinessError('O título é longo demais (máx. 200).');

  const metodo = (input.metodo?.trim() ?? '') as MetodoRateio;
  if (!METODOS_IDS.includes(metodo)) throw new BusinessError('Método de rateio inválido.');

  let vigenciaInicio: Date;
  let vigenciaFim: Date;
  try {
    vigenciaInicio = parseDataISO(input.vigenciaInicio);
  } catch {
    throw new BusinessError('Informe a data inicial do período.');
  }
  try {
    vigenciaFim = parseDataISO(input.vigenciaFim);
  } catch {
    throw new BusinessError('Informe a data final do período.');
  }
  if (vigenciaFim < vigenciaInicio)
    throw new BusinessError('O fim do período é anterior ao início.');

  // Participantes: só os métodos com quadro os têm. Guardar participante num
  // método sem quadro deixaria dado órfão que ninguém mostra nem soma.
  const brutos = Array.isArray(input.participantes) ? input.participantes : [];
  const participantes: { ajusteId: string | null; origem: string | null; base: number }[] = [];

  if (temQuadro(metodo)) {
    /*
     * Cada linha do quadro é **um ajuste ou uma origem própria da entidade** —
     * nunca as duas, nunca nenhuma.
     *
     * A origem própria (o atendimento particular, o plano de saúde) não é um
     * ajuste e não tem id: identifica-se pelo nome. Ela existe porque sem ela o
     * denominador do rateio ficava só com os convênios, e eles absorviam a
     * fatia da atividade própria da entidade.
     */
    const ajustesVistos = new Set<string>();
    const origensVistas = new Set<string>();

    for (const p of brutos) {
      const ajusteId = p?.ajusteId?.trim() ?? '';
      const origem = p?.origem?.trim() ?? '';

      if (ajusteId && origem)
        throw new BusinessError('Uma linha do quadro é um ajuste ou uma origem própria, não as duas.');
      if (!ajusteId && !origem)
        throw new BusinessError('Informe o ajuste ou o nome da origem própria em cada linha do quadro.');

      if (ajusteId) {
        if (!UUID.test(ajusteId)) throw new BusinessError('Participante com ajuste inválido.');
        // O banco também recusa (chave única), mas a mensagem de lá não ajuda.
        if (ajustesVistos.has(ajusteId))
          throw new BusinessError('O mesmo ajuste foi incluído duas vezes no rateio.');
        ajustesVistos.add(ajusteId);
      } else {
        if (origem.length > 120) throw new BusinessError(`Nome de origem longo demais: ${origem}.`);
        /*
         * A duplicidade da origem é conferida **aqui**, e não no banco: o
         * `@@unique([rateioId, ajusteId])` não alcança estas linhas, porque no
         * Postgres NULL nunca conflita com NULL. Comparação sem acento e sem
         * caixa, senão "Particular" e "particular" viram duas fatias da mesma
         * coisa e o percentual de ambas sai pela metade.
         */
        const chave = origem.toLocaleLowerCase('pt-BR').normalize('NFD').replace(/\p{Diacritic}/gu, '');
        if (origensVistas.has(chave))
          throw new BusinessError(`A origem "${origem}" foi incluída duas vezes no rateio.`);
        origensVistas.add(chave);
      }

      const base = num(p.base) ?? 0;
      if (base < 0) throw new BusinessError('A base do rateio não pode ser negativa.');
      participantes.push({ ajusteId: ajusteId || null, origem: origem || null, base });
    }

    if (participantes.length === 0)
      throw new BusinessError('Inclua ao menos uma linha no quadro de rateio.');

    /*
     * Quadro só de recurso próprio não é rateio: não há parceria a que debitar
     * nada, e a nota lançada contra ele não produziria pagamento nenhum. O
     * usuário descobriria isso só ao tentar lançar.
     */
    if (ajustesVistos.size === 0)
      throw new BusinessError('Inclua ao menos um ajuste no quadro — só com recurso próprio não há o que ratear.');

    // Sem base não há como distribuir: o percentual de todos seria zero, e o
    // rateio ficaria gravado sem dizer nada.
    const { totalBase } = calcularRateio(participantes);
    if (totalBase <= 0)
      throw new BusinessError(
        metodo === 'COLABORADORES'
          ? 'O total de colaboradores precisa ser maior que zero.'
          : 'O total da base precisa ser maior que zero.',
      );

    if (metodo === 'RECEITA' && participantes.some((p) => p.base <= 0))
      throw new BusinessError('A receita de cada linha do quadro precisa ser maior que zero.');

    if (metodo === 'COLABORADORES' && participantes.some((p) => !Number.isInteger(p.base)))
      throw new BusinessError('O número de colaboradores precisa ser inteiro.');
  }

  const descricaoMetodo = input.descricaoMetodo?.trim() || null;
  if (metodo === 'OUTROS' && !descricaoMetodo)
    throw new BusinessError('Para o método "Outros", descreva o critério adotado.');

  return {
    titulo,
    vigenciaInicio,
    vigenciaFim,
    metodo,
    descricaoMetodo,
    observacoes: input.observacoes?.trim() || null,
    participantes,
  };
}

export class RateioUseCases {
  constructor(private readonly repo: IRateioRepository) {}

  private async conferirAjustes(dados: DadosRateio) {
    // Só as linhas que apontam para um ajuste — a origem própria não tem id a
    // conferir, e mandá-la para o `IN (…)` buscaria por nulo.
    const ids = dados.participantes.map((p) => p.ajusteId).filter((x): x is string => !!x);
    if (ids.length === 0) return;
    const existem = await this.repo.ajustesExistentes(ids);
    if (existem.length !== ids.length)
      throw new BusinessError('Há participante apontando para um ajuste inexistente.');
  }

  listar(params: ListarRateiosParams): Promise<PaginaRateios> {
    return this.repo.listar(params);
  }

  async buscar(id: string): Promise<Rateio> {
    const r = await this.repo.buscarPorId(id);
    if (!r) throw new NotFoundError('Rateio não encontrado.');
    return r;
  }

  async criar(input: RateioDTO): Promise<Rateio> {
    const dados = validarRateio(input);
    await this.conferirAjustes(dados);
    return this.repo.criar(dados);
  }

  async atualizar(id: string, input: RateioDTO): Promise<Rateio> {
    await this.buscar(id);
    const dados = validarRateio(input);
    await this.conferirAjustes(dados);
    return this.repo.atualizar(id, dados);
  }

  async definirAtivo(id: string, ativo: boolean): Promise<Rateio> {
    await this.buscar(id);
    return this.repo.definirAtivo(id, ativo);
  }

  /**
   * Exclusão de verdade, e não inativação.
   *
   * Rateio já **usado** por documento fiscal não deveria sumir — o histórico é
   * o que permite reproduzir uma prestação passada. Enquanto a ligação com o
   * documento fiscal não existe, o caminho seguro é inativar; por isso a rota
   * de exclusão exige faixa Total, como nos demais cadastros.
   */
  async excluir(id: string): Promise<void> {
    await this.buscar(id);
    await this.repo.excluir(id);
  }

  /** Ajustes vigentes na data — o carregamento automático do quadro. */
  ajustesVigentes(em: Date): Promise<{ id: string }[]> {
    return this.repo.ajustesVigentes(em);
  }

  /** Filtros da listagem, já convertidos. */
  static filtros(q: Record<string, unknown>): FiltrosRateio {
    const texto = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : undefined);
    const metodo = texto(q.metodo);
    const f: FiltrosRateio = {};
    if (metodo && METODOS_IDS.includes(metodo as MetodoRateio)) f.metodo = metodo as MetodoRateio;
    if (q.ativo === 'true' || q.ativo === true) f.ativo = true;
    if (q.ativo === 'false' || q.ativo === false) f.ativo = false;
    const em = texto(q.vigenteEm);
    if (em) {
      try {
        f.vigenteEm = parseDataISO(em);
      } catch {
        /* data inválida no filtro é ignorada, não derruba a listagem */
      }
    }
    f.busca = texto(q.busca);
    return f;
  }
}
