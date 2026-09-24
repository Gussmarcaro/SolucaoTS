import type { GuiaRecolhimento, RetencaoApurada } from '@/core/guiaRecolhimento/GuiaRecolhimento';
import type { TipoRetencao } from '@/core/documentoFiscal/DocumentoFiscal';
import type { DadosGuia } from './dtos';

export interface IGuiaRecolhimentoRepository {
  /**
   * O retido por tributo e competência, das notas **pagas**.
   *
   * A competência é a do pagamento, não a da emissão: retém-se ao pagar. Nota
   * emitida em março e paga em abril entra na guia de abril.
   */
  apurar(ate: { ano: number; mes: number }): Promise<Omit<RetencaoApurada, 'guia'>[]>;
  listarGuias(): Promise<GuiaRecolhimento[]>;
  buscarPorId(id: string): Promise<GuiaRecolhimento | null>;
  buscarPorCompetencia(tipo: TipoRetencao, ano: number, mes: number): Promise<GuiaRecolhimento | null>;
  criar(dados: DadosGuia): Promise<GuiaRecolhimento>;
  atualizar(id: string, dados: DadosGuia): Promise<GuiaRecolhimento>;
  /** Busca da barra superior — poucas, já recortadas pelo órgão. */
  buscarGlobal(termo: string, limite: number): Promise<GuiaRecolhimento[]>;
  excluir(id: string): Promise<void>;
}
