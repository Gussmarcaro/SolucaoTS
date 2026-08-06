import type { DocumentoFiscal, TipoDocumento } from '@/core/documentoFiscal/DocumentoFiscal';
import type { DadosDocumentoFiscal } from './dtos';

/** Port de persistência de Documento Fiscal (no escopo de uma Prestação). */
export interface IDocumentoFiscalRepository {
  listarPorPrestacao(prestacaoId: string): Promise<DocumentoFiscal[]>;
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
}
