import type { ArquivoPdf } from '@/core/entidade/complementos';
import type { DocumentoFiscal, TipoDocumento } from '@/core/documentoFiscal/DocumentoFiscal';
import type { DadosDocumentoFiscal } from './dtos';

/** Port de persistência de Documento Fiscal (no escopo de uma Prestação). */
export interface IDocumentoFiscalRepository {
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
