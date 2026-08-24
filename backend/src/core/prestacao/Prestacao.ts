export type StatusPrestacao =
  | 'EM_ELABORACAO'
  | 'ENVIADO'
  | 'ARMAZENADO'
  | 'REJEITADO'
  | 'SUBSTITUIDO'
  | 'EXCLUIDO';

/** Entidade de domínio — Prestação de Contas (raiz dos blocos, filha de Ajuste). */
export interface Prestacao {
  id: string;
  ajusteId: string;
  ajusteCodigo: string;
  /** Se o orgao empenha o repasse — governa a aba de Empenhos. */
  orgaoEmpenha: boolean;
  ajusteTipo: string; // TipoAjuste do ajuste
  entidadeNome: string;
  tipoDocumento: string; // corresponde ao tipo do ajuste
  ano: number;
  mes: number; // prestação anual consolidada → 12
  status: StatusPrestacao;
  protocolo: string | null;
  ehRetificacao: boolean;
  dataEnvio: string | null; // ISO
  criadoEm: Date;
  atualizadoEm: Date;
}
