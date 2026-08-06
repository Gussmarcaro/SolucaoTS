/** Entidade de domínio — Colaborador / Empregado da entidade beneficiária. */
export interface Colaborador {
  id: string;
  nome: string;
  cpf: string; // apenas dígitos (11)
  cargo: string;
  cbo: string | null; // Classificação Brasileira de Ocupações (6 dígitos)
  cns: string | null; // Cartão Nacional de Saúde (15 dígitos — profissionais de saúde)
  dataAdmissao: string; // 'YYYY-MM-DD'
  dataDemissao: string | null; // 'YYYY-MM-DD'
  salarioContratual: number;
  ativo: boolean;
  criadoEm: Date;
  atualizadoEm: Date;
}
