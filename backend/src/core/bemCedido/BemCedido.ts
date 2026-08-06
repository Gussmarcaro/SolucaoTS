/** Entidade de domínio — Bem Cedido (cadastro standalone). */
export interface BemCedido {
  id: string;
  descricao: string;
  tipo: string; // Móvel, Imóvel, Veículo, Equipamento, Outros
  identificador: string; // nº de patrimônio / placa / identificação
  valor: number;
  dataCessao: string; // 'YYYY-MM-DD'
  dataDevolucao: string | null;
  observacao: string | null;
  ativo: boolean;
  criadoEm: Date;
  atualizadoEm: Date;
}
