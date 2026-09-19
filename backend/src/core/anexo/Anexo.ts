/** Que papel o anexo cumpre. Espelha o enum do schema. */
export type TipoAnexo =
  | 'DOCUMENTO_FISCAL'
  | 'RECIBO'
  | 'DOCUMENTO_AUXILIAR'
  | 'COMPROVANTE_PAGAMENTO';

export const TIPOS_ANEXO: TipoAnexo[] = [
  'DOCUMENTO_FISCAL',
  'RECIBO',
  'DOCUMENTO_AUXILIAR',
  'COMPROVANTE_PAGAMENTO',
];

/** A que lançamento o anexo pertence. */
export type DonoAnexo = 'DESPESA' | 'PAGAMENTO';

/**
 * Quais papéis cabem em cada dono.
 *
 * "Comprovante de pagamento" numa nota fiscal, ou "recibo" num pagamento, não
 * é variação de uso — é engano. A tela oferece só o que cabe, e o caso de uso
 * recusa o resto: sem isso o anexo existiria num lugar onde nenhuma tela o
 * mostra.
 */
export const TIPOS_POR_DONO: Record<DonoAnexo, TipoAnexo[]> = {
  DESPESA: ['DOCUMENTO_FISCAL', 'RECIBO', 'DOCUMENTO_AUXILIAR'],
  PAGAMENTO: ['COMPROVANTE_PAGAMENTO'],
};

/** Metadados do anexo — sem o conteúdo, que nunca entra numa listagem. */
export interface Anexo {
  id: string;
  tipo: TipoAnexo;
  nome: string;
  tamanho: number;
  enviadoEm: string; // ISO
}

/** O anexo com os bytes — só na gravação e no download. */
export interface ArquivoAnexo {
  nome: string;
  tamanho: number;
  conteudo: Buffer;
}
