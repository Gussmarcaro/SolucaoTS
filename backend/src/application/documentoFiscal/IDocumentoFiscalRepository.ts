import type { ArquivoPdf } from '@/core/entidade/complementos';
import type { DocumentoFiscal, TipoDocumento } from '@/core/documentoFiscal/DocumentoFiscal';
import type { DadosDocumentoFiscal, DocumentoFiscalApropriado } from './dtos';

/** Port de persistência de Documento Fiscal (no escopo de uma Prestação). */
export interface IDocumentoFiscalRepository {
  /**
   * As notas **apropriadas** por esta prestação, com o percentual de cada uma.
   *
   * Lê pela tabela de ligação, não por `prestacaoId`: a nota é do órgão, e uma
   * nota rateada alimenta várias prestações com percentuais diferentes. O
   * percentual vem da ligação porque é dela — a mesma nota vale 30% aqui e 50%
   * noutra prestação.
   */
  listarApropriados(prestacaoId: string): Promise<DocumentoFiscalApropriado[]>;

  /**
   * As notas do órgão que a prestação **poderia** apropriar.
   *
   * Recortadas pelo exercício da prestação: nota de outro ano não pertence a
   * ela, e oferecer o acervo inteiro transformaria a escolha num campo de
   * rolagem. As já apropriadas por esta prestação saem da lista.
   */
  listarCandidatos(prestacaoId: string, ano: number): Promise<DocumentoFiscal[]>;

  /** Cria (ou atualiza) a apropriação de uma nota por esta prestação. */
  apropriar(
    prestacaoId: string,
    documentoFiscalId: string,
    dados: { percentual: number; contratoId: string | null },
  ): Promise<void>;

  /** Desfaz a apropriação. A nota continua existindo no órgão. */
  desapropriar(prestacaoId: string, documentoFiscalId: string): Promise<void>;

  listarPorPrestacao(prestacaoId: string): Promise<DocumentoFiscal[]>;
  /**
   * Todas as notas do órgão — a tela de Execução → Financeiro → Despesas.
   *
   * O recorte por órgão não aparece aqui porque não é responsabilidade deste
   * port: a extension de tenant o aplica na camada de dados, para valer também
   * em qualquer consulta futura que alguém escreva.
   */
  listarDoOrgao(): Promise<DocumentoFiscal[]>;
  /** Duplicidade no órgão — a nota é única por número + credor no cliente. */
  buscarDuplicadoNoOrgao(
    numero: string,
    credorTipoDoc: TipoDocumento,
    credorNumeroDoc: string,
  ): Promise<DocumentoFiscal | null>;
  /** Cria a nota sem vínculo com prestação; o `clienteId` é carimbado. */
  criarNoOrgao(dados: DadosDocumentoFiscal): Promise<DocumentoFiscal>;
  buscarPorId(id: string): Promise<DocumentoFiscal | null>;
  buscarDuplicado(
    prestacaoId: string,
    numero: string,
    credorTipoDoc: TipoDocumento,
    credorNumeroDoc: string,
  ): Promise<DocumentoFiscal | null>;
  criar(prestacaoId: string, dados: DadosDocumentoFiscal): Promise<DocumentoFiscal>;
  atualizar(id: string, dados: DadosDocumentoFiscal): Promise<DocumentoFiscal>;
  excluir(id: string): Promise<void>;
  /** Grava a digitalização da nota. `null` remove o anexo. */
  salvarArquivo(id: string, arquivo: ArquivoPdf | null): Promise<DocumentoFiscal>;
  /** Conteúdo do anexo — só quando alguém baixa, nunca na listagem. */
  obterArquivo(id: string): Promise<ArquivoPdf | null>;
}
