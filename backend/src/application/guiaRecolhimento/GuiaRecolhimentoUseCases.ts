import type { GuiaRecolhimento, RetencaoApurada } from '@/core/guiaRecolhimento/GuiaRecolhimento';
import { TIPOS_RETENCAO, type TipoRetencao } from '@/core/documentoFiscal/DocumentoFiscal';
import type { IGuiaRecolhimentoRepository } from './IGuiaRecolhimentoRepository';
import type { DadosGuia, GuiaDTO } from './dtos';
import { BusinessError, ConflictError, NotFoundError } from '@/shared/errors';
import { parseDataISO } from '@/shared/datas';

function validar(input: GuiaDTO): DadosGuia {
  const tipo = input.tipo?.trim() ?? '';
  if (!TIPOS_RETENCAO.includes(tipo as TipoRetencao))
    throw new BusinessError('Tributo inválido.');

  const ano = Number(input.ano);
  const mes = Number(input.mes);
  if (!Number.isInteger(ano) || ano < 2000 || ano > 2100)
    throw new BusinessError('Competência inválida (ano).');
  if (!Number.isInteger(mes) || mes < 1 || mes > 12)
    throw new BusinessError('Competência inválida (mês).');

  const valor = Number(input.valor);
  if (!Number.isFinite(valor) || valor <= 0) throw new BusinessError('Valor da guia inválido.');

  const data = (v: string | null | undefined, rotulo: string): Date | null => {
    if (!v) return null;
    try {
      return parseDataISO(v);
    } catch {
      throw new BusinessError(`${rotulo} inválida.`);
    }
  };

  const dataVencimento = data(input.dataVencimento, 'Data de vencimento');
  const dataPagamento = data(input.dataPagamento, 'Data de pagamento');

  return {
    tipo: tipo as TipoRetencao,
    ano,
    mes,
    valor,
    dataVencimento,
    dataPagamento,
    numeroDocumento: input.numeroDocumento?.trim() || null,
    observacao: input.observacao?.trim() || null,
  };
}

/**
 * Guias de recolhimento das retenções.
 *
 * A nota fiscal é paga pelo **líquido** — o bruto menos a retenção —, e o valor
 * retido fica com a entidade até ser recolhido, numa guia única por tributo que
 * reúne todas as notas do mês. Sem este registro, o dinheiro retido sumia do
 * sistema entre o pagamento da nota e o recolhimento, e a diferença aparecia na
 * conciliação bancária sem explicação.
 *
 * O apurado é **consulta, não registro**: muda quando alguém corrige uma nota
 * ou lança um pagamento atrasado. Gravar uma fotografia dele o faria envelhecer
 * em silêncio, e o usuário recolheria pelo número velho. O que se grava é a
 * guia — um documento com número, que foi pago.
 */
export class GuiaRecolhimentoUseCases {
  constructor(private readonly repo: IGuiaRecolhimentoRepository) {}

  /**
   * O painel: o apurado de cada competência, com a guia ao lado quando existe.
   *
   * Apura até a competência pedida (o padrão é o mês corrente): retenção de
   * mês que ainda não fechou aparece, porque é justamente o que se está
   * juntando para recolher no mês que vem.
   */
  async apurar(ate?: { ano?: number; mes?: number }): Promise<RetencaoApurada[]> {
    const hoje = new Date();
    const ano = ate?.ano ?? hoje.getUTCFullYear();
    const mes = ate?.mes ?? hoje.getUTCMonth() + 1;
    if (!Number.isInteger(ano) || !Number.isInteger(mes) || mes < 1 || mes > 12)
      throw new BusinessError('Competência inválida.');

    const [apurado, guias] = await Promise.all([
      this.repo.apurar({ ano, mes }),
      this.repo.listarGuias(),
    ]);

    const porChave = new Map(guias.map((g) => [`${g.tipo}-${g.ano}-${g.mes}`, g]));

    /*
     * A união do apurado com as guias, e não só o apurado.
     *
     * Guia emitida cuja apuração depois zerou — porque a nota foi corrigida ou
     * o pagamento removido — precisa continuar aparecendo: há dinheiro
     * recolhido sem retenção que o justifique, e isso é exatamente o que se
     * quer enxergar.
     */
    const linhas = new Map<string, RetencaoApurada>();
    for (const a of apurado) {
      const k = `${a.tipo}-${a.ano}-${a.mes}`;
      linhas.set(k, { ...a, guia: porChave.get(k) ?? null });
    }
    for (const [k, g] of porChave) {
      if (linhas.has(k)) continue;
      linhas.set(k, { tipo: g.tipo, ano: g.ano, mes: g.mes, valorApurado: 0, notas: 0, guia: g });
    }

    // Mais recente primeiro: é a competência em aberto que se vai recolher.
    return [...linhas.values()].sort(
      (a, b) => b.ano - a.ano || b.mes - a.mes || a.tipo.localeCompare(b.tipo),
    );
  }

  async criar(input: GuiaDTO): Promise<GuiaRecolhimento> {
    const dados = validar(input);
    // Uma guia por tributo e competência — é assim que ela é emitida e paga.
    // Duas significaria recolher a mesma retenção duas vezes.
    const existente = await this.repo.buscarPorCompetencia(dados.tipo, dados.ano, dados.mes);
    if (existente)
      throw new ConflictError(
        `Já existe guia de ${dados.tipo} para ${String(dados.mes).padStart(2, '0')}/${dados.ano}.`,
        'GUIA_DUPLICADA',
      );
    return this.repo.criar(dados);
  }

  async atualizar(id: string, input: GuiaDTO): Promise<GuiaRecolhimento> {
    await this.garantir(id);
    const dados = validar(input);
    const existente = await this.repo.buscarPorCompetencia(dados.tipo, dados.ano, dados.mes);
    if (existente && existente.id !== id)
      throw new ConflictError(
        `Já existe guia de ${dados.tipo} para ${String(dados.mes).padStart(2, '0')}/${dados.ano}.`,
        'GUIA_DUPLICADA',
      );
    return this.repo.atualizar(id, dados);
  }

  async excluir(id: string): Promise<void> {
    await this.garantir(id);
    await this.repo.excluir(id);
  }

  /**
   * A guia existe e é deste órgão?
   *
   * A conferência é a própria busca: a extension de tenant já recorta, então
   * uma guia de outro órgão simplesmente "não existe".
   */
  private async garantir(id: string): Promise<GuiaRecolhimento> {
    const g = await this.repo.buscarPorId(id);
    if (!g) throw new NotFoundError('Guia não encontrada.');
    return g;
  }
}
