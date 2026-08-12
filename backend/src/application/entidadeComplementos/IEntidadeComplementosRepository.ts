import type {
  ArquivoPdf,
  AtaDiretoriaArquivo,
  DocumentoRegularidade,
  MembroConselho,
  MembroDiretoria,
  TipoDocumentoRegularidade,
} from '@/core/entidade/complementos';
import type {
  DadosDocumentoRegularidade,
  DadosMembroConselho,
  DadosMembroDiretoria,
} from './dtos';

/** Port de persistência dos complementos da Entidade Beneficiária. */
export interface IEntidadeComplementosRepository {
  /** A entidade existe? Impede registro órfão antes de qualquer gravação. */
  entidadeExiste(entidadeId: string): Promise<boolean>;

  // --- Diretoria ---
  listarDiretoria(entidadeId: string): Promise<MembroDiretoria[]>;
  criarMembroDiretoria(entidadeId: string, dados: DadosMembroDiretoria): Promise<MembroDiretoria>;
  atualizarMembroDiretoria(
    entidadeId: string,
    id: string,
    dados: DadosMembroDiretoria,
  ): Promise<MembroDiretoria>;
  excluirMembroDiretoria(entidadeId: string, id: string): Promise<void>;

  // --- Atas de eleição (vários arquivos por entidade) ---
  listarAtasDiretoria(entidadeId: string): Promise<AtaDiretoriaArquivo[]>;
  criarAtaDiretoria(entidadeId: string, arquivo: ArquivoPdf): Promise<AtaDiretoriaArquivo>;
  obterAtaDiretoria(entidadeId: string, id: string): Promise<ArquivoPdf | null>;
  excluirAtaDiretoria(entidadeId: string, id: string): Promise<void>;

  // --- Conselhos ---
  listarConselhos(entidadeId: string): Promise<MembroConselho[]>;
  criarMembroConselho(entidadeId: string, dados: DadosMembroConselho): Promise<MembroConselho>;
  atualizarMembroConselho(
    entidadeId: string,
    id: string,
    dados: DadosMembroConselho,
  ): Promise<MembroConselho>;
  excluirMembroConselho(entidadeId: string, id: string): Promise<void>;
  salvarAtaConselho(entidadeId: string, id: string, arquivo: ArquivoPdf): Promise<MembroConselho>;
  obterAtaConselho(entidadeId: string, id: string): Promise<ArquivoPdf | null>;
  removerAtaConselho(entidadeId: string, id: string): Promise<MembroConselho>;

  // --- Regularidade fiscal / cadastral ---
  listarDocumentos(entidadeId: string): Promise<DocumentoRegularidade[]>;
  buscarDocumentoPorTipo(
    entidadeId: string,
    tipo: TipoDocumentoRegularidade,
  ): Promise<DocumentoRegularidade | null>;
  criarDocumento(
    entidadeId: string,
    dados: DadosDocumentoRegularidade,
  ): Promise<DocumentoRegularidade>;
  atualizarDocumento(
    entidadeId: string,
    id: string,
    dados: DadosDocumentoRegularidade,
  ): Promise<DocumentoRegularidade>;
  excluirDocumento(entidadeId: string, id: string): Promise<void>;
  salvarArquivoDocumento(
    entidadeId: string,
    id: string,
    arquivo: ArquivoPdf,
  ): Promise<DocumentoRegularidade>;
  obterArquivoDocumento(entidadeId: string, id: string): Promise<ArquivoPdf | null>;
  removerArquivoDocumento(entidadeId: string, id: string): Promise<DocumentoRegularidade>;
}
