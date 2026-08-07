export type CategoriaBem =
  | 'MOVEL_ADQUIRIDO'
  | 'MOVEL_CEDIDO'
  | 'MOVEL_BAIXADO'
  | 'IMOVEL_ADQUIRIDO'
  | 'IMOVEL_CEDIDO'
  | 'IMOVEL_BAIXADO';

/** Entidade de domínio — Bem da Relação de Bens da entidade beneficiária. */
export interface BemPrestacao {
  id: string;
  prestacaoId: string;
  categoria: CategoriaBem;
  numeroPatrimonio: string | null; // só bens móveis
  descricao: string;
  data: string; // 'YYYY-MM-DD' (aquisição / cessão / baixa conforme categoria)
  valor: number | null; // obrigatório p/ móvel adquirido e móvel cedido
}
