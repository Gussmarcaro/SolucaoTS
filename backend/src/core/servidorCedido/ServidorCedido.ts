/** Entidade de domínio — Servidor Cedido (cadastro standalone). */
export interface ServidorCedido {
  id: string;
  nome: string;
  cpf: string; // 11 dígitos
  cargoPublico: string;
  funcaoEntidade: string;
  onusPagamento: string; // "Com ônus (cedente)" | "Sem ônus (cessionária)"
  cargaHoraria: number | null; // horas semanais
  remuneracaoBruta: number;
  dataInicialCessao: string; // 'YYYY-MM-DD'
  dataFinalCessao: string | null;
  ativo: boolean;
  criadoEm: Date;
  atualizadoEm: Date;
}
