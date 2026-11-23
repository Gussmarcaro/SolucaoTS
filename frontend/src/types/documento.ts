/**
 * A folha de um documento oficial gerado — espelha `core/documento/folha.ts`.
 *
 * O texto vem pronto do servidor, transcrito do modelo do TCESP. A tela só
 * desenha: não reescreve, não abrevia, não traduz rótulo.
 */
export interface CampoFolha {
  rotulo: string;
  valor: string | null;
  nota?: string;
}

export interface SecaoFolha {
  titulo: string | null;
  itens: string[];
  numerada?: boolean;
}

export interface PessoaFolha {
  nome: string | null;
  cargo: string | null;
  cpf: string | null;
  origem: string | null;
}

export interface GrupoAssinaturas {
  titulo: string;
  subtitulo?: string | null;
  pessoas: PessoaFolha[];
  linhasEmBranco: number;
  campoExtra?: string | null;
}

export interface Folha {
  anexo: string;
  titulo: string;
  subtitulo: string;
  observacao: string | null;
  cabecalho: CampoFolha[];
  secoes: SecaoFolha[];
  localEData: string;
  assinaturas: GrupoAssinaturas[];
  notas: string[];
  faltando: string[];
}
